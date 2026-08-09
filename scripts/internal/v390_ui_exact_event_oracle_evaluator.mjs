// 파일 용도: exact EVT oracle catalog의 response/DOM/network/state assertion을 누락 없이 fail-closed로 평가한다.

import crypto from "node:crypto";

import {
  eventExactOracleFor,
} from "./v390_ui_exact_event_oracles.mjs";
import {
  buildExactRuntimeOracleCatalog,
} from "./v390_ui_exact_oracle_catalog.mjs";

const eventExactTemplateVariableSchema = Object.freeze({
  fixtureId: Object.freeze({ type: "identifier" }),
  viewId: Object.freeze({ type: "identifier" }),
  sourceId: Object.freeze({ type: "identifier" }),
  ruleId: Object.freeze({ type: "identifier" }),
  q: Object.freeze({ type: "query-text" }),
  evidence: Object.freeze({ type: "identifier" }),
  incidentStatus: Object.freeze({ type: "identifier" }),
  startTimeMs: Object.freeze({ type: "unsigned-integer" }),
  endTimeMs: Object.freeze({ type: "unsigned-integer" }),
  limit: Object.freeze({ type: "unsigned-integer" }),
  offset: Object.freeze({ type: "unsigned-integer" }),
});

const DIRECT_RESPONSE_OPERATORS = new Set([
  "array", "boolean", "equals", "equals-fixture", "non-empty", "number", "number-gte", "object",
  "redacted", "score-descending", "starts-with", "string-non-empty",
]);
const DIRECT_DOM_OPERATORS = new Set([
  "contains-descendant", "contains-fixture-event", "contains-fixture-marker", "does-not-claim-longrun-pass",
  "history-bounded",
  "not-contains-seed-credential-canary", "not-contains-seed-raw-canary", "not-contains-sensitive-canary",
  "number-equals-response", "selected-event-equals", "slot-count-equals", "text-includes",
]);

const responseDerivedDomProjectionContracts = Object.freeze({
  "EVT-007\nrow-fields-equal-response\neventId/ruleId/scenarioName/evidence": Object.freeze({
    selector: "#eventRecordRows [data-event-semantic-event-id={fixtureId}]",
    collectionPath: "records.records",
    identityPaths: ["eventId"],
    domFields: Object.freeze({
      ruleId: Object.freeze({
        selector: "td[data-label='이벤트'] .ops-rule-note",
        mode: "prefixed-text",
        prefix: "rule ",
        canonicalEmptyValues: Object.freeze(["-"]),
      }),
      scenarioName: Object.freeze({
        selector: "td[data-label='시나리오']",
        mode: "single-text",
      }),
      evidence: Object.freeze({
        selector: "td[data-label='증거'] .ops-rule-note",
        mode: "delimiter-text",
        delimiter: " · ",
      }),
    }),
    fields: [
      ["$identity", "eventId", "identity"],
      ["metadata.ruleId|ruleId|vaRuleId", "ruleId", "field-text", "first-non-empty", { emptyPolicy: "optional-empty" }],
      ["scenarioName|scenarioPhase|className", "scenarioName", "field-text", "renderer-scenario"],
      ["snapshotPath|clipPath", "evidence", "field-text", "renderer-evidence-names", { minCount: 2 }],
    ],
  }),
  "EVT-017\nrow-fields-equal-response\nid/kind/enabled/label": Object.freeze({
    selector: "#alertDeliveryRows [data-alert-delivery-id={fixtureId}]",
    collectionPath: "integrations",
    identityPaths: ["id"],
    fields: [
      ["$identity", "id", "identity"],
      ["kind", "kind", "field-text"],
      ["enabled", "enabled", "field-text"],
      ["label", "label", "field-text"],
    ],
  }),
  "EVT-019\nfields-equal-response\nevent/review": Object.freeze({
    selector: "[data-event-review-row][data-event-id={fixtureId}]",
    collectionPath: "records",
    identityPaths: ["event.eventId", "review.eventId"],
    identityPathMode: "all",
    domFields: Object.freeze({
      reviewStatus: Object.freeze({ selector: "[data-event-review-field='reviewStatus']", mode: "control-value" }),
      classification: Object.freeze({ selector: "[data-event-review-field='classification']", mode: "control-value" }),
    }),
    fields: [
      ["$identity", "eventId", "identity"],
      ["review.reviewStatus", "reviewStatus", "field-text"],
      ["review.classification", "classification", "field-text"],
    ],
  }),
  "EVT-020\nfield-value-equals-response\nreviewStatus/note": Object.freeze({
    selector: "[data-event-review-row][data-event-id={fixtureId}]",
    collectionPath: "records",
    identityPaths: ["event.eventId", "review.eventId"],
    identityPathMode: "all",
    domFields: Object.freeze({
      reviewStatus: Object.freeze({ selector: "[data-event-review-field='reviewStatus']", mode: "control-value" }),
      note: Object.freeze({ selector: "[data-event-review-field='note']", mode: "control-value" }),
    }),
    fields: [
      ["review.reviewStatus", "reviewStatus", "field-text"],
      ["review.note", "note", "field-text"],
    ],
  }),
  "EVT-041\nmatched-terms-equal-response\nmatchedTerms": Object.freeze({
    selector: "#opsIncidentSearchRows [data-incident-memory-hit='event-record:{fixtureId}']",
    collectionPath: "memorySearch.hits", identityPaths: ["documentId"],
    identityPrefix: "event-record:",
    fields: [["matchedTerms[]", "matchedTerms", "field-text"]],
  }),
  "EVT-041\nhighlight-fragments-equal-response\nhighlightFragments": Object.freeze({
    selector: "#opsIncidentSearchRows [data-incident-memory-hit='event-record:{fixtureId}']",
    collectionPath: "memorySearch.hits", identityPaths: ["documentId"],
    identityPrefix: "event-record:",
    fields: [["highlightFragments[]", "highlightFragments", "field-text", "collapse-whitespace-text"]],
  }),
  "EVT-043\nslot-values-equal-response\naction/object/context/environment": Object.freeze({
    selector: "#opsIncidentBriefRows [data-incident-brief-card={fixtureId}]",
    collectionPath: "incidentBrief.briefs", identityPaths: ["eventId"],
    fields: [
      ["actionSlot.value", "action", "field-text"], ["objectSlot.value", "object", "field-text"],
      ["contextSlot.value", "context", "field-text"], ["environmentSlot.value", "environment", "field-text"],
    ],
  }),
  "EVT-044\nrelated-order-equals-response\nscore": Object.freeze({
    selector: "#opsSimilarIncidentRows [data-similar-incident-group={fixtureId}]",
    collectionPath: "similarIncidents.groups", identityPaths: ["baseEventId"],
    fields: [["related[].score", "score", "field-text"]],
  }),
  "EVT-046\ncandidate-fields-equal-response\neventId/score/matchedTerms": Object.freeze({
    selector: "#opsVlmSummaryCandidateRows [data-vlm-summary-candidate-event={fixtureId}]",
    collectionPath: "memorySearch.vlmSummaryCandidateReview.sourceCandidateReport.candidates",
    identityPaths: ["eventId", "observationId"], identityPathMode: "any",
    fields: [["$identity", "eventId", "identity"], ["matchScore", "score"],
      ["matchedTerms[]", "matchedTerms", "field-text"]],
  }),
  "EVT-046\ncandidate-count-equals-response\ncandidates.length": Object.freeze({
    selector: "#opsVlmSummaryCandidateRows [data-vlm-summary-candidate-event={fixtureId}]",
    collectionPath: "memorySearch.vlmSummaryCandidateReview.sourceCandidateReport.candidates",
    identityPaths: ["eventId", "observationId"], identityPathMode: "any",
    fields: [["$collection", "candidateCount", "attribute", "collection-count"]],
  }),
  "EVT-047\nfields-equal-response\nsuggestion/candidates/manualDraftRoute": Object.freeze({
    selector: "[data-event-review-row][data-event-id={fixtureId}] [data-testid=ops-incident-rule-suggestion-review]",
    collectionPath: "records", identityPaths: ["event.eventId", "review.eventId"],
    fields: [["incidentRuleSuggestionReview.candidateStatus", "candidateStatus"],
      ["incidentRuleSuggestionReview.sourceCandidateReport.matchedCandidates", "sourceCandidateCount"],
      ["incidentRuleSuggestionReview.manualDraftRoute", "manualDraftRoute"]],
  }),
  "EVT-049\ncontains-fixture-event\neventId": Object.freeze({
    selector: "#eventRecordRows [data-event-semantic-event-id={fixtureId}]",
    collectionPath: "records.records", identityPaths: ["eventId"],
    fields: [["$identity", "eventId", "identity"]],
  }),
  "EVT-050\ncard-fields-equal-response\nlane/priority/status": Object.freeze({
    selector: "#opsIncidentTriageBoardRows [data-incident-triage-card={fixtureId}]",
    collectionPath: "incidentTriageBoard.cards", identityPaths: ["eventId"],
    fields: [["lane", "lane"], ["priority", "priority"],
      ["reviewState", "reviewState"], ["incidentStatus", "incidentStatus"]],
  }),
  "EVT-051\nscore-equals-response\nscore": Object.freeze({
    selector: "#opsIncidentDecisionScorecardRows [data-incident-decision-scorecard-event={fixtureId}]",
    collectionPath: "incidentDecisionScorecard.scorecards", identityPaths: ["eventId"],
    fields: [["score", "score"]],
  }),
  "EVT-052\nlinks-equal-response\nbundle/draft/dry-run/recheck": Object.freeze({
    selector: "#opsOperationalActionPackRows [data-operational-action-pack-event={fixtureId}]",
    collectionPath: "operationalActionPack.items", identityPaths: ["eventId"],
    fields: [["actions.releaseSafeEvidenceBundle.available", "bundle"],
      ["actions.ruleDraftRoute.available", "draft"],
      ["actions.alertDryRunRoute.available", "dryRun"],
      ["actions.sourceHealthRecheck.available", "recheck"]],
  }),
  "EVT-053\nfields-equal-response\ndraftComparison/conditionPreview/manualDraftRoute": Object.freeze({
    selector: "#opsRuleWhatIfPreviewRows [data-rule-what-if-preview-event={fixtureId}]",
    collectionPath: "ruleWhatIfPreview.items", identityPaths: ["eventId", "preview.eventId"], identityPathMode: "any",
    fields: [["preview.draftComparison.comparisonResult", "draftComparison"],
      ["preview.conditionPreview.eventType", "conditionPreview"],
      ["preview.manualDraftRoute", "manualDraftRoute"]],
  }),
  "EVT-054\ncounts-equal-response\naccepted/dismissed/reviewNeeded": Object.freeze({
    selector: "#opsOperatorOutcomeMemoryRows [data-operator-outcome-memory-event={fixtureId}]",
    collectionPath: "operatorOutcomeMemory.items", identityPaths: ["eventId"],
    fields: [["outcomeCounts.acceptedCount", "accepted"],
      ["outcomeCounts.dismissedCount", "dismissed"],
      ["outcomeCounts.reviewNeededCount", "reviewNeeded"]],
  }),
  "EVT-055\nstates-equal-response\nready/blocked/field-smoke-needed/not-run": Object.freeze({
    selector: "#opsIncidentActionReadinessQueueRows [data-incident-action-readiness-event={fixtureId}]",
    collectionPath: "incidentActionReadinessQueue.items", identityPaths: ["eventId"],
    fields: [["readinessStatus", "readinessStatus"]],
  }),
  "EVT-056\nflags-equal\nnoAutoSave/noAutoApply/ruleRegistryWritePerformed": Object.freeze({
    selector: "#opsApprovalGatedRuleDraftReadinessRows [data-approval-gated-rule-draft-event={fixtureId}]",
    collectionPath: "approvalGatedRuleDraftReadiness.items", identityPaths: ["eventId"],
    fields: [["stagedDraft.noAutoSave", "noAutoSave"],
      ["stagedDraft.noAutoApply", "noAutoApply"],
      ["stagedDraft.ruleRegistryWritePerformed", "ruleRegistryWritePerformed"]],
  }),
  "EVT-057\nstates-equal-response\npassed/failed/blocked/not-run": Object.freeze({
    selector: "#opsEvidenceIntakeFieldReadinessRows [data-evidence-intake-field-event={fixtureId}]",
    collectionPath: "evidenceIntakeFieldReadiness.items", identityPaths: ["eventId"],
    fields: [["evidenceIntakeStatus", "evidenceIntakeStatus"],
      ["sourceHealthReadiness", "sourceHealthReadiness"],
      ["fieldSmokeStatus", "fieldSmokeStatus"]],
  }),
  "EVT-058\nwindow-fields-equal-response\neventId/sourceId/samples/window": Object.freeze({
    selector: "#opsRuntimeEvidenceWindowRows [data-runtime-evidence-event={fixtureId}]",
    collectionPath: "runtimeEvidenceWindow.items", identityPaths: ["eventId"],
    fields: [["$identity", "eventId", "identity"], ["sourceId", "sourceId"],
      ["runtimeEvidencePacket.eventWindowMs", "eventWindowMs"],
      ["runtimeEvidencePacket.windowStartMs", "windowStartMs"],
      ["runtimeEvidencePacket.windowEndMs", "windowEndMs"]],
  }),
  "EVT-064\nqueue-fields-equal-response\nstatus/reason": Object.freeze({
    selector: "#opsV320ResolutionQueue [data-v320-resolution-event={fixtureId}]",
    collectionPath: "unifiedResolutionWorkspace.resolutionQueue", identityPaths: ["eventId"],
    fields: [["resolutionState.status", "status"], ["resolutionState.reason", "reason"]],
  }),
  "EVT-065\nfields-equal-response\ncompleteness/confidence/replayCoverageHint": Object.freeze({
    selector: "#v320EvidenceQualityGrid[data-v320-evidence-quality={fixtureId}]",
    collectionPath: "unifiedResolutionWorkspace.resolutionQueue", identityPaths: ["eventId"],
    fields: [["evidenceQuality.evidenceCompleteness", "completeness"],
      ["evidenceQuality.evidenceConfidence", "confidence"],
      ["evidenceQuality.replayCoverageHint", "replayCoverageHint"]],
  }),
  "EVT-066\nfields-equal-item-readback\nhealth/failureContext/recheckHint": Object.freeze({
    selector: "#v320SourceReliabilityGrid[data-v320-source-reliability={fixtureId}]",
    collectionPath: "unifiedResolutionWorkspace.resolutionQueue", identityPaths: ["eventId"],
    fields: [["sourceReliability.sourceHealthStatus", "health"],
      ["sourceReliability.recentFailureContext", "failureContext"],
      ["sourceReliability.operatorRecheckHint", "recheckHint"]],
    responseBodySelection: "last",
  }),
  "EVT-067\nfields-equal-response\ncorrectionSignal/reviewSignal/uncertaintyReason/qualityBadge": Object.freeze({
    selector: "#v320AiReviewQualityGrid[data-v320-ai-review-quality={fixtureId}]",
    collectionPath: "unifiedResolutionWorkspace.resolutionQueue", identityPaths: ["eventId"],
    fields: [["aiReviewQuality.correctionReviewSignal", "correctionSignal"],
      ["aiReviewQuality.reviewStatus", "reviewSignal"],
      ["aiReviewQuality.uncertaintyReason", "uncertaintyReason"],
      ["aiReviewQuality.qualityBadge", "qualityBadge"]],
  }),
  "EVT-069\nfields-equal-response\nruleDraft/evidenceBundle/notification/blockers": Object.freeze({
    selector: "#v320ActionReadinessChecklistGrid[data-v320-action-readiness-checklist={fixtureId}]",
    collectionPath: "unifiedResolutionWorkspace.resolutionQueue", identityPaths: ["eventId"],
    fields: [["actionReadinessChecklist.ruleDraftStatus", "ruleDraft"],
      ["actionReadinessChecklist.evidenceBundleStatus", "evidenceBundle"],
      ["actionReadinessChecklist.notificationReady", "notification"],
      ["actionReadinessChecklist.readinessBlockers[]", "blockers", "field-text"]],
  }),
  "EVT-071\nfields-equal-response\nsourceCause/closureImpact/correlationSignal": Object.freeze({
    selector: "#v330IncidentSourceCorrelationGrid[data-v330-incident-source-correlation={fixtureId}]",
    collectionPath: "unifiedResolutionWorkspace.resolutionQueue", identityPaths: ["eventId"],
    fields: [["incidentSourceCorrelation.sourceCauseCategory", "sourceCause"],
      ["incidentSourceCorrelation.resolutionClosureImpact", "closureImpact"],
      ["incidentSourceCorrelation.correlationSignals[]", "correlationSignal", "field-text"]],
  }),
  "EVT-072\nfields-equal-response\nretryCandidate/recoveryChecklist/dryRunStatus/operatorNoteLink": Object.freeze({
    selector: "#v330OperatorRecheckRecoveryQueueGrid[data-v330-operator-recheck-recovery-queue={fixtureId}]",
    collectionPath: "unifiedResolutionWorkspace.resolutionQueue", identityPaths: ["eventId"],
    fields: [["operatorRecheckRecoveryQueue.retryCandidate", "retryCandidate"],
      ["operatorRecheckRecoveryQueue.recoveryChecklist[]", "recoveryChecklist", "field-text"],
      ["operatorRecheckRecoveryQueue.dryRunResultStatus", "dryRunStatus"],
      ["operatorRecheckRecoveryQueue.operatorNoteRoute", "operatorNoteLink"]],
  }),
  "EVT-075\nfields-equal-response\nsourceCause/continuityDrillCandidate/commandPlanDraft": Object.freeze({
    selector: "#v350IncidentCommandHandoffGrid[data-v350-incident-command-handoff={fixtureId}]",
    collectionPath: "unifiedResolutionWorkspace.resolutionQueue", identityPaths: ["eventId"],
    fields: [["incidentCommandHandoff.sourceCause", "sourceCause"],
      ["incidentCommandHandoff.continuityDrillCandidate", "continuityDrillCandidate"],
      ["incidentCommandHandoff.commandPlanDraft", "commandPlanDraft"]],
  }),
  "EVT-043\nslot-count-equals\n[data-incident-brief-slot]": Object.freeze({
    selector: "#opsIncidentBriefRows [data-incident-brief-card={fixtureId}]",
    collectionPath: "incidentBrief.briefs", identityPaths: ["eventId"],
    fields: [["actionSlot.value", "action", "field-text"]],
  }),
  "EVT-044\nexplanation-terms-equal-response\nexplanationTerms": Object.freeze({
    selector: "#opsSimilarIncidentRows [data-similar-incident-group={fixtureId}]",
    collectionPath: "similarIncidents.groups", identityPaths: ["baseEventId"],
    fields: [["related[].explanationTerms[]", "explanationTerms", "field-text"]],
  }),
  "EVT-047\nmanual-only\nno-auto-apply": Object.freeze({
    selector: "[data-event-review-row][data-event-id={fixtureId}] [data-testid=ops-incident-rule-suggestion-review]",
    collectionPath: "records", identityPaths: ["event.eventId", "review.eventId"],
    fields: [["incidentRuleSuggestionReview.contract.autoRuleApplied", "autoRuleApplied"],
      ["incidentRuleSuggestionReview.contract.ruleRegistryWritePerformed", "ruleRegistryWritePerformed"]],
  }),
  "EVT-049\nfields-equal-response\neventType/scenario/evidence": Object.freeze({
    selector: "#eventRecordRows [data-event-semantic-event-id={fixtureId}]",
    collectionPath: "records.records", identityPaths: ["eventId"],
    fields: [["eventType", "eventType"], ["scenarioPhase", "scenario"],
      ["snapshotPath|clipPath", "evidenceState", "attribute", "evidence-state"]],
  }),
  "EVT-050\nfilter-result-exact\nlane/priority/sort": Object.freeze({
    selector: "#opsIncidentTriageBoardRows [data-incident-triage-card={fixtureId}]",
    collectionPath: "incidentTriageBoard.cards", identityPaths: ["eventId"],
    fields: [["lane", "lane"], ["priority", "priority"], ["priorityRank", "sortRank"]],
  }),
  "EVT-051\nreasons-equal-response\npriorityReasons": Object.freeze({
    selector: "#opsIncidentDecisionScorecardRows [data-incident-decision-scorecard-event={fixtureId}]",
    collectionPath: "incidentDecisionScorecard.scorecards", identityPaths: ["eventId"],
    fields: [["priorityReasonChips[].label", "priorityReasons", "field-text"]],
  }),
  "EVT-052\nmanual-only\nall-actions": Object.freeze({
    selector: "#opsOperationalActionPackRows [data-operational-action-pack-event={fixtureId}]",
    collectionPath: "operationalActionPack.items", identityPaths: ["eventId"],
    fields: [["actions.ruleDraftRoute.ruleRegistryWritePerformed", "ruleRegistryWritePerformed"],
      ["actions.alertDryRunRoute.externalDeliveryPerformed", "externalDeliveryPerformed"],
      ["actions.sourceHealthRecheck.sourceHealthWritePerformed", "sourceHealthWritePerformed"]],
  }),
  "EVT-053\nmanual-only\nno-auto-save-apply": Object.freeze({
    selector: "#opsRuleWhatIfPreviewRows [data-rule-what-if-preview-event={fixtureId}]",
    collectionPath: "ruleWhatIfPreview.items", identityPaths: ["eventId", "preview.eventId"], identityPathMode: "any",
    fields: [["preview.manualSaveRequired", "manualSaveRequired"],
      ["preview.ruleRegistryWritePerformed", "ruleRegistryWritePerformed"]],
  }),
  "EVT-054\nhistory-hint-equals-response\ndeterministicHistoryHint": Object.freeze({
    selector: "#opsOperatorOutcomeMemoryRows [data-operator-outcome-memory-event={fixtureId}]",
    collectionPath: "operatorOutcomeMemory.items", identityPaths: ["eventId"],
    fields: [["deterministicHistoryHint.deterministicHistoryHint", "deterministicHistoryHint", "field-text"]],
  }),
  "EVT-051\norder-equals-response\nscore": Object.freeze({
    selector: "#opsIncidentDecisionScorecardRows [data-incident-decision-scorecard-event={fixtureId}]",
    collectionPath: "incidentDecisionScorecard.scorecards", identityPaths: ["eventId"],
    fields: [["score", "score"], ["scoreRank", "scoreRank"]],
  }),
  "EVT-054\naudit-refs-equal-response\nauditActionRefs": Object.freeze({
    selector: "#opsOperatorOutcomeMemoryRows [data-operator-outcome-memory-event={fixtureId}]",
    collectionPath: "operatorOutcomeMemory.items", identityPaths: ["eventId"],
    fields: [["auditActionRefs.eventReviewUpdate|auditActionRefs.incidentActionUpdate",
      "auditActionRefs", "field-text", "non-empty-union"]],
  }),
  "EVT-066\ncollection-item-consistent\nsourceReliability": Object.freeze({
    selector: "#v320SourceReliabilityGrid[data-v320-source-reliability={fixtureId}]",
    collectionPath: "unifiedResolutionWorkspace.resolutionQueue", identityPaths: ["eventId"],
    fields: [["sourceReliability.sourceHealthStatus", "health"],
      ["sourceReliability.recentFailureContext", "failureContext"],
      ["sourceReliability.operatorRecheckHint", "recheckHint"]],
    responseBodyAgreement: "first-last",
  }),
  "EVT-070\nfields-equal-response\nactiveFilters/savedViewMatches/summary": Object.freeze({
    selector: "#v320ResolutionSearchMetricsGrid[data-v320-resolution-search-metrics={fixtureId}]",
    collectionPath: "unifiedResolutionWorkspace.resolutionQueue", identityPaths: ["eventId"],
    fields: [
      ["$root.unifiedResolutionWorkspace.resolutionSearchMetricsSummary.activeResolutionFilters.reviewStatus|$root.unifiedResolutionWorkspace.resolutionSearchMetricsSummary.activeResolutionFilters.classification|$root.unifiedResolutionWorkspace.resolutionSearchMetricsSummary.activeResolutionFilters.incidentStatus|$root.unifiedResolutionWorkspace.resolutionSearchMetricsSummary.activeResolutionFilters.ruleId|$root.unifiedResolutionWorkspace.resolutionSearchMetricsSummary.activeResolutionFilters.sourceId|$root.unifiedResolutionWorkspace.resolutionSearchMetricsSummary.activeResolutionFilters.eventType|$root.unifiedResolutionWorkspace.resolutionSearchMetricsSummary.activeResolutionFilters.eventId|$root.unifiedResolutionWorkspace.resolutionSearchMetricsSummary.activeResolutionFilters.textQuery|$root.unifiedResolutionWorkspace.resolutionSearchMetricsSummary.activeResolutionFilters.includeArchives|$root.unifiedResolutionWorkspace.resolutionSearchMetricsSummary.activeResolutionFilters.limit", "activeFilters", "field-text", "non-empty-union"],
      ["resolutionSearchMetrics.savedViewMatches[]", "savedViewMatches", "field-text"],
      ["$root.unifiedResolutionWorkspace.resolutionSearchMetricsSummary.operationsMetricSummary.matchedQueueCount|$root.unifiedResolutionWorkspace.resolutionSearchMetricsSummary.operationsMetricSummary.readyForApprovalCount|$root.unifiedResolutionWorkspace.resolutionSearchMetricsSummary.operationsMetricSummary.blockedActionCount|$root.unifiedResolutionWorkspace.resolutionSearchMetricsSummary.operationsMetricSummary.sourceRecheckCount|$root.unifiedResolutionWorkspace.resolutionSearchMetricsSummary.operationsMetricSummary.reviewRequiredCount", "summary", "field-text", "non-empty-union"],
    ],
  }),
  "EVT-055\nnot-run-not-styled-pass\nnot-run": Object.freeze({
    selector: "#opsIncidentActionReadinessQueueRows [data-incident-action-readiness-event={fixtureId}]",
    collectionPath: "incidentActionReadinessQueue.items", identityPaths: ["eventId"],
    fields: [["readinessStatus", "readinessStatus"], ["readinessStatus", "passStyled", "attribute", "pass-style"]],
  }),
  "EVT-057\nnot-contains-seed-credential-canary\ncredentialCanary": Object.freeze({
    selector: "#opsEvidenceIntakeFieldReadinessRows [data-evidence-intake-field-event={fixtureId}]",
    collectionPath: "evidenceIntakeFieldReadiness.items", identityPaths: ["eventId"],
    fields: [["evidenceIntakeStatus", "evidenceIntakeStatus"]],
  }),
  "EVT-058\nhistory-bounded\nsampleLimit": Object.freeze({
    selector: "#opsRuntimeEvidenceWindowRows [data-runtime-evidence-event={fixtureId}]",
    collectionPath: "runtimeEvidenceWindow.items", identityPaths: ["eventId"],
    fields: [["$collection", "sampleCount", "attribute", "bounded-collection-count", { limit: 12 }],
      ["$limit", "sampleLimit", "attribute", "limit", { limit: 12 }]],
  }),
  "EVT-064\ndetail-sections-equal-response\ndetailSections": Object.freeze({
    selector: "#opsV320ResolutionDetail [data-v320-resolution-detail={fixtureId}]",
    collectionPath: "unifiedResolutionWorkspace.resolutionQueue", identityPaths: ["eventId"],
    fields: [["detailSections[].key", "detailSections", "field-text"]],
  }),
  "EVT-064\nmarker-order-equals-response\ntimelineMarkers": Object.freeze({
    selector: "#opsV320ResolutionTimeline [data-v320-resolution-timeline-marker]",
    collectionPath: "unifiedResolutionWorkspace.resolutionTimeline", identityPaths: ["eventId"],
    domOwnerMode: "field-fragments",
    fields: [["timelineMarkers[].key", "timelineMarkers", "field-text"]],
  }),
  "EVT-065\nselected-event-equals\nevt-065-review4-fixture": Object.freeze({
    selector: "#v320EvidenceQualityGrid[data-v320-evidence-quality={fixtureId}]",
    collectionPath: "unifiedResolutionWorkspace.resolutionQueue", identityPaths: ["eventId"],
    fields: [["evidenceQuality.evidenceCompleteness", "completeness"]],
  }),
  "EVT-067\nselected-event-equals\nevt-067-review4-fixture": Object.freeze({
    selector: "#v320AiReviewQualityGrid[data-v320-ai-review-quality={fixtureId}]",
    collectionPath: "unifiedResolutionWorkspace.resolutionQueue", identityPaths: ["eventId"],
    fields: [["aiReviewQuality.qualityBadge", "qualityBadge"]],
  }),
  "EVT-069\nselected-event-equals\nevt-069-review4-fixture": Object.freeze({
    selector: "#v320ActionReadinessChecklistGrid[data-v320-action-readiness-checklist={fixtureId}]",
    collectionPath: "unifiedResolutionWorkspace.resolutionQueue", identityPaths: ["eventId"],
    fields: [["actionReadinessChecklist.ruleDraftStatus", "ruleDraft"]],
  }),
  "EVT-071\nselected-event-equals\nevt-071-review4-fixture": Object.freeze({
    selector: "#v330IncidentSourceCorrelationGrid[data-v330-incident-source-correlation={fixtureId}]",
    collectionPath: "unifiedResolutionWorkspace.resolutionQueue", identityPaths: ["eventId"],
    fields: [["incidentSourceCorrelation.sourceCauseCategory", "sourceCause"]],
  }),
  "EVT-072\nhealthy-source-absent\nhealthySource": Object.freeze({
    selector: "#v330OperatorRecheckRecoveryQueueGrid[data-v330-operator-recheck-recovery-queue={fixtureId}]",
    collectionPath: "unifiedResolutionWorkspace.resolutionQueue", identityPaths: ["eventId"],
    fields: [["operatorRecheckRecoveryQueue.failedOnlyRecheck", "failedOnlyRecheck"]],
  }),
  "EVT-075\nread-only\nno-action-control": Object.freeze({
    selector: "#v350IncidentCommandHandoffGrid[data-v350-incident-command-handoff={fixtureId}]",
    collectionPath: "unifiedResolutionWorkspace.resolutionQueue", identityPaths: ["eventId"],
    fields: [["incidentCommandHandoff.boundaries.commandPlanExecuted", "commandPlanExecuted"]],
  }),
});

export function responseDerivedDomProjectionContractFor({ caseId = "", operator = "", target = "" } = {}) {
  return responseDerivedDomProjectionContracts[`${caseId}\n${operator}\n${target}`] || null;
}

export function auditResponseDerivedDomProjectionContracts() {
  const optionalEmptyUses = [];
  let implicitOptionalUseCount = 0;
  let canonicalEmptyDomUseCount = 0;
  let invalidCanonicalEmptyDomUseCount = 0;
  for (const [key, contract] of Object.entries(responseDerivedDomProjectionContracts)) {
    const [caseId, operator, target] = key.split("\n");
    for (const field of contract.fields || []) {
      const options = field[4] || {};
      if (options.optional === true) implicitOptionalUseCount += 1;
      if (options.emptyPolicy === "optional-empty") {
        const domKey = String(field[1] || "");
        const descriptor = contract.domFields?.[domKey];
        const canonicalEmptyValues = descriptor?.canonicalEmptyValues;
        const canonicalEmptyValid = Array.isArray(canonicalEmptyValues) &&
          canonicalEmptyValues.length > 0 &&
          canonicalEmptyValues.every(value => typeof value === "string" && value.length > 0);
        if (canonicalEmptyValid) canonicalEmptyDomUseCount += 1;
        else if (canonicalEmptyValues !== undefined) invalidCanonicalEmptyDomUseCount += 1;
        optionalEmptyUses.push({ caseId, operator, target, domKey });
      } else if (contract.domFields?.[String(field[1] || "")]?.canonicalEmptyValues !== undefined) {
        invalidCanonicalEmptyDomUseCount += 1;
      }
    }
  }
  return Object.freeze({
    schema: "media-server.v390-ui-response-dom-optional-empty-audit.v1",
    contractCount: Object.keys(responseDerivedDomProjectionContracts).length,
    optionalEmptyUseCount: optionalEmptyUses.length,
    implicitOptionalUseCount,
    canonicalEmptyDomUseCount,
    invalidCanonicalEmptyDomUseCount,
    optionalEmptyUses: Object.freeze(optionalEmptyUses.map(Object.freeze)),
  });
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function sha256Text(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (isObject(value)) return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function deepEqual(left, right) {
  return stable(left) === stable(right);
}

function scalarValues(value) {
  return Array.isArray(value) ? value.flatMap(scalarValues) : [value];
}

function valueText(value) {
  if (typeof value === "string") return value;
  if (value === undefined) return "";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function recursiveContains(value, needle) {
  if (needle === undefined || needle === null || needle === "") return false;
  return valueText(value).includes(String(needle));
}

function normalizedProjectionWords(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function normalizedProjectionKey(value) {
  return normalizedProjectionWords(value).replace(/\s+/gu, "");
}

function fixtureIdentityRank(value, fixtureCandidates, directOnly = false) {
  if (value === undefined || value === null) return Number.MAX_SAFE_INTEGER;
  const values = directOnly && isObject(value)
    ? Object.values(value).filter(child => !isObject(child) && !Array.isArray(child))
    : [value];
  for (let index = 0; index < fixtureCandidates.length; index += 1) {
    if (values.some(child => recursiveContains(child, fixtureCandidates[index]))) return index;
  }
  return Number.MAX_SAFE_INTEGER;
}

function collectResponseFieldCandidates(responseBodies, fixtureCandidates) {
  const candidates = [];
  const visit = (value, path, fixtureRank, fixtureDistance) => {
    if (Array.isArray(value)) {
      value.forEach((child, index) =>
        visit(child, `${path}[${index}]`, fixtureRank, fixtureDistance + 1));
      return;
    }
    if (!isObject(value)) return;
    const directRank = fixtureIdentityRank(value, fixtureCandidates, true);
    const ownerRank = Math.min(fixtureRank, directRank);
    const distance = directRank < fixtureRank ? 0 : fixtureDistance + 1;
    for (const [key, child] of Object.entries(value)) {
      const childPath = path ? `${path}.${key}` : key;
      const childRank = Math.min(ownerRank,
        fixtureIdentityRank(child, fixtureCandidates));
      candidates.push({
        key,
        path: childPath,
        value: child,
        fixtureRank: childRank,
        fixtureDistance: distance,
      });
      visit(child, childPath, ownerRank, distance);
    }
  };
  for (const body of responseBodies) {
    visit(body, "", Number.MAX_SAFE_INTEGER, 1000);
  }
  return candidates;
}

function projectionFieldMatchScore(field, candidate) {
  const fieldKey = normalizedProjectionKey(field);
  const candidateKey = normalizedProjectionKey(candidate.key);
  if (!fieldKey || !candidateKey) return 0;
  if (fieldKey === candidateKey) return 100;
  if (fieldKey.length >= 4 && candidateKey.includes(fieldKey)) return 80;
  if (candidateKey.length >= 4 && fieldKey.includes(candidateKey)) return 70;
  const fieldWords = normalizedProjectionWords(field).split(" ").filter(Boolean);
  const candidateWords = new Set(normalizedProjectionWords(candidate.key).split(" ").filter(Boolean));
  return fieldWords.length > 0 && fieldWords.every(word => candidateWords.has(word)) ? 60 : 0;
}

function orderedProjectionValues(operator, value) {
  const values = Array.isArray(value) ? value : [value];
  if (operator.startsWith("stage-order-") && values.every(isObject)) {
    return values.map(item => item.stage).filter(item => item !== undefined);
  }
  if (operator.startsWith("edge-order-") && values.every(isObject)) {
    return values.flatMap(item => [item.from, item.to].filter(field => field !== undefined));
  }
  return values;
}

function rendererProjectionScalars(value, operator, field) {
  if (String(field).endsWith(".length")) {
    return Array.isArray(value) || typeof value === "string" ? [value.length] : [];
  }
  const ordered = orderedProjectionValues(operator, value);
  const scalars = [];
  const visit = child => {
    if (Array.isArray(child)) {
      child.forEach(visit);
      return;
    }
    if (isObject(child)) {
      Object.values(child).forEach(visit);
      return;
    }
    if (child !== undefined && child !== null && String(child).trim().length > 0) scalars.push(child);
  };
  ordered.forEach(visit);
  return scalars;
}

function rendererValueVariants(value, operator) {
  const variants = new Set([normalizedProjectionWords(value)]);
  if (String(operator).startsWith("stage-order-") && typeof value === "string") {
    const genericStageWords = new Set(["state", "record", "action", "dry", "run"]);
    const label = normalizedProjectionWords(value).split(" ")
      .filter(word => !genericStageWords.has(word)).join(" ");
    if (label) variants.add(label);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    variants.add(normalizedProjectionWords(value.toFixed(2)));
    if (Number.isInteger(value) && value > 100000000000) {
      variants.add(normalizedProjectionWords(new Date(value).toISOString()));
    }
  }
  return [...variants].filter(Boolean);
}

function rendererPhraseIndex(text, value, operator) {
  const haystack = ` ${normalizedProjectionWords(text)} `;
  const indices = rendererValueVariants(value, operator).map(variant =>
    haystack.indexOf(` ${variant} `)).filter(index => index >= 0);
  return indices.length > 0 ? Math.min(...indices) : -1;
}

function projectionContractFixtureIdentity(fixtureIdentity, fixtureCandidates) {
  if (fixtureIdentity !== undefined && fixtureIdentity !== null && String(fixtureIdentity)) {
    return String(fixtureIdentity);
  }
  return fixtureCandidates.map(String).find(value => /^evt-\d{3}-review4-fixture(?:$|-)/.test(value)) || "";
}

function projectionContractOwnerIdentity(contract, fixtureIdentity) {
  return `${String(contract.identityPrefix || "")}${String(fixtureIdentity || "")}`;
}

function projectionContractRows(responseBodies, contract) {
  const selectedBodies = contract.responseBodySelection === "last" ||
      contract.responseBodyAgreement === "first-last"
    ? responseBodies.slice(-1)
    : responseBodies;
  return selectedBodies.flatMap(body => eventExactValuesAtPath(body, contract.collectionPath))
    .flatMap(value => Array.isArray(value) ? value : [value])
    .filter(value => value && typeof value === "object" && !Array.isArray(value));
}

function projectionContractRowMatches(row, contract, fixtureIdentity) {
  const matches = contract.identityPaths.map(path =>
    eventExactValuesAtPath(row, path).some(value => String(value) === fixtureIdentity));
  return contract.identityPathMode === "any" ? matches.some(Boolean) : matches.every(Boolean);
}

function projectionContractExpectedValues(
  row, responsePath, fixtureIdentity, transform = "identity", options = {}, projectionContext = {},
) {
  if (responsePath === "$identity") return [fixtureIdentity];
  if (transform === "collection-count") {
    return [String(Number(projectionContext.rowCount || 0))];
  }
  if (transform === "bounded-collection-count") {
    const limit = Number(options.limit);
    return [String(Math.min(Number(projectionContext.rowCount || 0), limit))];
  }
  if (transform === "limit") return [String(Number(options.limit))];
  if (transform === "non-empty-union") {
    return String(responsePath).split("|").flatMap(path => {
      const root = path.startsWith("$root.") ? projectionContext.rootBody : row;
      const localPath = path.startsWith("$root.") ? path.slice(6) : path;
      return eventExactValuesAtPath(root, localPath)
        .flatMap(value => Array.isArray(value) ? value : [value])
        .filter(value => value !== undefined && value !== null && String(value).length > 0)
        .map(value => String(value));
    });
  }
  if (transform === "evidence-state") {
    const [snapshotPath, clipPath] = String(responsePath).split("|");
    const snapshotPresent = eventExactValuesAtPath(row, snapshotPath)
      .some(value => String(value ?? "").trim().length > 0);
    const clipPresent = eventExactValuesAtPath(row, clipPath)
      .some(value => String(value ?? "").trim().length > 0);
    return [snapshotPresent && clipPresent
      ? "snapshot+clip"
      : (snapshotPresent ? "snapshot-only" : (clipPresent ? "clip-only" : "none"))];
  }
  if (transform === "first-non-empty") {
    for (const path of String(responsePath).split("|")) {
      const value = eventExactValuesAtPath(row, path)
        .flatMap(item => Array.isArray(item) ? item : [item])
        .find(item => item !== undefined && item !== null && String(item).trim().length > 0);
      if (value !== undefined) return [String(value)];
    }
    return [];
  }
  if (transform === "renderer-scenario") {
    const [scenarioNamePath, scenarioPhasePath, classNamePath] = String(responsePath).split("|");
    const first = path => eventExactValuesAtPath(row, path)
      .flatMap(item => Array.isArray(item) ? item : [item])
      .find(item => item !== undefined && item !== null && String(item).trim().length > 0);
    const scenarioParts = [first(scenarioNamePath), first(scenarioPhasePath)]
      .filter(value => value !== undefined).map(String);
    if (scenarioParts.length > 0) return [scenarioParts.join(" · ")];
    const className = first(classNamePath);
    return className === undefined ? [] : [String(className)];
  }
  if (transform === "renderer-evidence-names") {
    return String(responsePath).split("|").flatMap(path =>
      eventExactValuesAtPath(row, path)
        .flatMap(item => Array.isArray(item) ? item : [item])
        .filter(item => item !== undefined && item !== null && String(item).trim().length > 0)
        .slice(0, 1)
        .map(item => String(item).split("/").at(-1) || ""))
      .filter(Boolean).slice(0, 2);
  }
  const root = String(responsePath).startsWith("$root.") ? projectionContext.rootBody : row;
  const localPath = String(responsePath).startsWith("$root.") ? String(responsePath).slice(6) : responsePath;
  const values = eventExactValuesAtPath(root, localPath)
    .flatMap(value => Array.isArray(value) ? value : [value])
    .map(value => String(value ?? ""));
  if (transform === "collapse-whitespace-text") {
    return values.map(value => value.replace(/\s+/gu, " ").trim());
  }
  if (transform === "pass-style") {
    return values.map(value => value === "ready" ? "true" : "false");
  }
  return values;
}

function evaluateDeclaredResponseDomProjection({
  caseId,
  operator,
  target,
  responseBodies,
  observation,
  fixtureCandidates,
  fixtureIdentity,
  contract,
}) {
  const fixture = projectionContractFixtureIdentity(fixtureIdentity, fixtureCandidates);
  const identity = fixture ? projectionContractOwnerIdentity(contract, fixture) : "";
  const rows = projectionContractRows(responseBodies, contract);
  const owners = identity ? rows.filter(row => projectionContractRowMatches(row, contract, identity)) : [];
  const agreementBodies = contract.responseBodyAgreement === "first-last" && responseBodies.length >= 2
    ? [responseBodies[0], responseBodies.at(-1)] : [];
  const agreementOwners = agreementBodies.map(body =>
    eventExactValuesAtPath(body, contract.collectionPath)
      .flatMap(value => Array.isArray(value) ? value : [value])
      .filter(row => row && typeof row === "object" && !Array.isArray(row) &&
        projectionContractRowMatches(row, contract, identity)));
  const agreementPass = contract.responseBodyAgreement !== "first-last" ||
    (agreementOwners.length === 2 && agreementOwners.every(group => group.length === 1) &&
      contract.fields.every(([responsePath]) => deepEqual(
        projectionContractExpectedValues(agreementOwners[0][0], responsePath, identity,
          "identity", {}, { rootBody: agreementBodies[0] }),
        projectionContractExpectedValues(agreementOwners[1][0], responsePath, identity,
          "identity", {}, { rootBody: agreementBodies[1] }))));
  const semanticNodes = Array.isArray(observation?.semanticNodes) ? observation.semanticNodes : [];
  const domCandidates = semanticNodes.filter(node => String(node?.eventId || "") === identity);
  const fieldFragments = contract.domOwnerMode === "field-fragments";
  const observationPresent = fieldFragments
    ? Number(observation?.count || 0) > 0 &&
      Number(observation?.visibleCount || 0) === Number(observation?.count || 0) &&
      semanticNodes.length === Number(observation?.count || 0)
    : Number(observation?.count || 0) === 1 &&
      Number(observation?.visibleCount || 0) === 1 && semanticNodes.length === 1;
  const domOwnerExact = observationPresent && (fieldFragments
    ? domCandidates.length === semanticNodes.length
    : domCandidates.length === 1);
  const fieldEvidence = contract.fields.map(([
    responsePath, domKey, source = "attribute", transform = "identity", options = {},
  ]) => {
    const expected = owners.length === 1
      ? projectionContractExpectedValues(owners[0], responsePath, identity, transform, options, {
        rowCount: rows.length,
        rootBody: contract.responseBodySelection === "last" ? responseBodies.at(-1) : responseBodies[0],
      })
      : [];
    const nodes = domOwnerExact ? (fieldFragments ? domCandidates : [domCandidates[0]]) : [];
    const rawActual = nodes.length === 0
      ? []
      : (source === "identity"
        ? nodes.map(node => String(node.eventId || ""))
        : (source === "field-text"
          ? nodes.flatMap(node => Array.isArray(node.fields?.[domKey])
            ? node.fields[domKey].map(String) : [])
          : nodes.flatMap(node => Object.prototype.hasOwnProperty.call(node.attributes || {}, domKey)
            ? [String(node.attributes[domKey])] : [])));
    const canonicalEmptyValues = Array.isArray(contract.domFields?.[domKey]?.canonicalEmptyValues)
      ? contract.domFields[domKey].canonicalEmptyValues.map(String)
      : [];
    const actual = canonicalEmptyValues.length > 0
      ? rawActual.filter(value => !canonicalEmptyValues.includes(value))
      : rawActual;
    const emptyPolicy = String(options.emptyPolicy || "required");
    const supportedOptions = new Set(["emptyPolicy", "limit", "minCount"]);
    const unknownOptions = Object.keys(options).filter(key => !supportedOptions.has(key));
    const optionsValid = unknownOptions.length === 0 &&
      ["required", "optional-empty"].includes(emptyPolicy);
    const canonicalEmpty = values => values.length === 0 ||
      (values.length === 1 && String(values[0] ?? "").trim().length === 0);
    const rendererOwnsCanonicalEmpty = rawActual.length === 1 &&
      (String(rawActual[0] ?? "").trim().length === 0 ||
        canonicalEmptyValues.includes(String(rawActual[0])));
    const optionalEmpty = optionsValid && emptyPolicy === "optional-empty" &&
      canonicalEmpty(expected) && canonicalEmpty(actual) && rendererOwnsCanonicalEmpty;
    const countPass = expected.length >= Number(options.minCount || 1);
    const valuesPass = optionsValid && (optionalEmpty || (countPass && actual.length === expected.length &&
      expected.every((value, index) => actual[index] === value)));
    const branchId = !optionsValid
      ? "invalid-field-presence-policy"
      : optionalEmpty
      ? "declared-optional-empty"
      : valuesPass
      ? "required-exact-value"
      : "field-value-mismatch";
    return {
      nameDigest: sha256Text(normalizedProjectionKey(domKey)),
      responseOwnerCount: owners.length,
      responseOwnerDigest: sha256Text(owners.length === 1
        ? `${contract.collectionPath}\n${identity}` : `${contract.collectionPath}\n${owners.length}`),
      projectedValueCount: expected.length,
      projectedValueDigest: sha256Text(stable(expected)),
      rawObservedValueCount: rawActual.length,
      rawObservedValueDigest: sha256Text(stable(rawActual)),
      observedValueCount: actual.length,
      observedValueDigest: sha256Text(stable(actual)),
      fieldPresencePolicyDigest: sha256Text(stable({ emptyPolicy })),
      observationTransformDigest: sha256Text(stable({ canonicalEmptyValues })),
      comparisonBranchDigest: sha256Text(branchId),
      matchedValueCount: valuesPass ? expected.length : expected.filter(value => actual.includes(value)).length,
      valuesPass,
      orderPass: valuesPass,
      pass: owners.length === 1 && agreementPass && domOwnerExact && valuesPass,
    };
  });
  const ownerMissing = owners.length === 0;
  const ownerAmbiguous = owners.length > 1;
  const domMissing = Number(observation?.count || 0) === 0 || Number(observation?.visibleCount || 0) === 0 ||
    semanticNodes.length === 0 || domCandidates.length === 0;
  const domDuplicate = fieldFragments
    ? observationPresent && domCandidates.length !== semanticNodes.length
    : Number(observation?.count || 0) > 1 || semanticNodes.length > 1 || domCandidates.length > 1;
  const valueMismatch = fieldEvidence.some(field => !field.valuesPass);
  const pass = Boolean(identity) && owners.length === 1 && agreementPass && domOwnerExact &&
    fieldEvidence.length > 0 && !valueMismatch;
  const failureCode = pass
    ? "PASS"
    : (ownerMissing
      ? "RESPONSE_FIELD_OWNER_MISSING"
      : (ownerAmbiguous
        ? "RESPONSE_FIELD_OWNER_AMBIGUOUS"
        : (domMissing
          ? "DOM_PROJECTION_OWNER_MISSING"
          : (domDuplicate
            ? "DOM_PROJECTION_OWNER_AMBIGUOUS"
            : "RENDERER_PROJECTION_VALUE_MISMATCH"))));
  return {
    schema: "media-server.v390-ui-response-derived-dom-field-projection.v1",
    pass,
    failureCode,
    caseIdDigest: sha256Text(caseId),
    operatorDigest: sha256Text(operator),
    targetDigest: sha256Text(target),
    observationDigest: sha256Text(stable({
      count: Number(observation?.count || 0),
      visibleCount: Number(observation?.visibleCount || 0),
      semanticNodeCount: semanticNodes.length,
      domOwnerCount: domCandidates.length,
    })),
    fieldCount: fieldEvidence.length,
    matchedFieldCount: fieldEvidence.filter(field => field.pass).length,
    fieldEvidence,
  };
}

export function evaluateResponseDerivedDomFieldProjection({
  caseId = "",
  operator = "",
  target = "",
  responseBodies = [],
  observation = {},
  fixtureCandidates = [],
  fixtureIdentity = "",
} = {}) {
  if (operator === "number-equals-response") {
    return evaluateResponseRootNumberProjection({
      caseId,
      operator,
      target,
      responseBodies,
      observation,
    });
  }
  const contract = responseDerivedDomProjectionContractFor({ caseId, operator, target });
  if (contract) {
    return evaluateDeclaredResponseDomProjection({
      caseId, operator, target, responseBodies, observation, fixtureCandidates, fixtureIdentity, contract,
    });
  }
  const fields = String(target).split("/").map(value => value.trim()).filter(Boolean);
  const normalizedFixtures = [...new Set(fixtureCandidates
    .filter(value => value !== undefined && value !== null && String(value).length > 0)
    .map(String))];
  const responseCandidates = collectResponseFieldCandidates(responseBodies, normalizedFixtures);
  const domText = [
    observation?.text,
    ...(observation?.nodeTexts || []),
    JSON.stringify(observation?.attributes || []),
    JSON.stringify(observation?.values || []),
  ].filter(Boolean).join(" ");
  let priorOrderIndex = -1;
  const orderSensitive = String(operator).includes("order-equals-response");
  const fieldEvidence = fields.map(field => {
    const ranked = responseCandidates.map(candidate => ({
      ...candidate,
      matchScore: projectionFieldMatchScore(field.replace(/\.length$/, ""), candidate),
    })).filter(candidate => candidate.matchScore > 0 &&
      (normalizedFixtures.length === 0 || candidate.fixtureRank < Number.MAX_SAFE_INTEGER))
      .sort((left, right) => left.fixtureRank - right.fixtureRank ||
        left.fixtureDistance - right.fixtureDistance ||
        right.matchScore - left.matchScore || left.path.localeCompare(right.path));
    const best = ranked[0];
    const selected = best ? ranked.filter(candidate => candidate.matchScore === best.matchScore &&
      candidate.fixtureRank === best.fixtureRank &&
      candidate.fixtureDistance === best.fixtureDistance) : [];
    const responseValues = selected.flatMap(candidate =>
      rendererProjectionScalars(candidate.value, operator, field));
    const valueIndices = responseValues.map(value => rendererPhraseIndex(domText, value, operator));
    const valuesPass = responseValues.length > 0 && valueIndices.every(index => index >= 0);
    let orderPass = true;
    if (orderSensitive && valuesPass) {
      for (const index of valueIndices) {
        if (index < priorOrderIndex) orderPass = false;
        priorOrderIndex = index;
      }
    }
    return {
      nameDigest: sha256Text(normalizedProjectionKey(field)),
      responseOwnerCount: selected.length,
      responseOwnerDigest: sha256Text(selected.map(candidate => candidate.path).sort().join("\n")),
      projectedValueCount: responseValues.length,
      projectedValueDigest: sha256Text(stable(responseValues)),
      matchedValueCount: valueIndices.filter(index => index >= 0).length,
      valuesPass,
      orderPass,
      pass: selected.length === 1 && valuesPass && orderPass,
    };
  });
  const ownerMissing = fieldEvidence.some(field => field.responseOwnerCount === 0);
  const ownerAmbiguous = fieldEvidence.some(field => field.responseOwnerCount > 1);
  const valueMissing = fieldEvidence.some(field => field.projectedValueCount === 0);
  const valueMismatch = fieldEvidence.some(field => !field.valuesPass);
  const orderMismatch = fieldEvidence.some(field => !field.orderPass);
  const observationPresent = Number(observation?.count || 0) > 0 &&
    Number(observation?.visibleCount || 0) > 0;
  const pass = fields.length > 0 && observationPresent && !ownerMissing && !ownerAmbiguous && !valueMissing &&
    !valueMismatch && !orderMismatch;
  const failureCode = pass
    ? "PASS"
    : (!observationPresent
      ? "DOM_PROJECTION_OWNER_MISSING"
      : (ownerMissing
        ? "RESPONSE_FIELD_OWNER_MISSING"
        : (ownerAmbiguous
          ? "RESPONSE_FIELD_OWNER_AMBIGUOUS"
          : (valueMissing
            ? "RESPONSE_FIELD_VALUE_MISSING"
            : (orderMismatch
              ? "RENDERER_PROJECTION_ORDER_MISMATCH"
              : "RENDERER_PROJECTION_VALUE_MISMATCH")))));
  return {
    schema: "media-server.v390-ui-response-derived-dom-field-projection.v1",
    pass,
    failureCode,
    caseIdDigest: sha256Text(caseId),
    operatorDigest: sha256Text(operator),
    targetDigest: sha256Text(target),
    observationDigest: sha256Text(domText),
    fieldCount: fields.length,
    matchedFieldCount: fieldEvidence.filter(field => field.pass).length,
    fieldEvidence,
  };
}

function evaluateResponseRootNumberProjection({
  caseId,
  operator,
  target,
  responseBodies,
  observation,
}) {
  const paths = String(target).split("|").map(value => value.trim()).filter(Boolean);
  const owners = responseBodies.map((body, index) => ({
    index,
    values: paths.flatMap(path => eventExactValuesAtPath(body, path))
      .filter(value => value !== undefined && value !== null && Number.isFinite(Number(value))),
  })).filter(owner => owner.values.length > 0);
  const actual = Number(String(observation?.text || "").replace(/[^0-9.-]/g, ""));
  const values = owners.length === 1 ? owners[0].values : [];
  const valuesPass = Number.isFinite(actual) && values.some(value => actual === Number(value));
  const observationPresent = Number(observation?.count || 0) === 1 &&
    Number(observation?.visibleCount || 0) === 1;
  const pass = paths.length > 0 && owners.length === 1 && observationPresent && valuesPass;
  const failureCode = pass
    ? "PASS"
    : (!observationPresent
      ? "DOM_PROJECTION_OWNER_MISSING"
      : (owners.length === 0
        ? "RESPONSE_FIELD_OWNER_MISSING"
        : (owners.length > 1
          ? "RESPONSE_FIELD_OWNER_AMBIGUOUS"
          : "RENDERER_PROJECTION_VALUE_MISMATCH")));
  return {
    schema: "media-server.v390-ui-response-derived-dom-field-projection.v1",
    pass,
    failureCode,
    caseIdDigest: sha256Text(caseId),
    operatorDigest: sha256Text(operator),
    targetDigest: sha256Text(target),
    observationDigest: sha256Text(stable({
      count: Number(observation?.count || 0),
      visibleCount: Number(observation?.visibleCount || 0),
      textDigest: sha256Text(String(observation?.text || "")),
    })),
    fieldCount: 1,
    matchedFieldCount: pass ? 1 : 0,
    fieldEvidence: [{
      nameDigest: sha256Text(paths.join("|")),
      responseOwnerCount: owners.length,
      responseOwnerDigest: sha256Text(owners.length === 1
        ? `request-bound-response-body:${owners[0].index}`
        : owners.map(owner => owner.index).join("\n")),
      projectedValueCount: values.length,
      projectedValueDigest: sha256Text(stable(values.map(value => Number(value)))),
      matchedValueCount: valuesPass ? 1 : 0,
      valuesPass,
      orderPass: true,
      pass,
    }],
  };
}

function pathTokens(path) {
  if (!path || path === "$" || path.startsWith("$")) return [];
  return String(path).split(".").flatMap(part => part.endsWith("[]")
    ? [{ key: part.slice(0, -2), expand: true }]
    : part.endsWith("[*]")
      ? [{ key: part.slice(0, -3), expand: true }]
      : [{ key: part, expand: false }]);
}

export function eventExactValuesAtPath(root, path) {
  if (path === "$" || path === "$body") return [root];
  let values = [root];
  for (const token of pathTokens(path)) {
    const next = [];
    for (const value of values) {
      if (!isObject(value) && !Array.isArray(value)) continue;
      const child = value?.[token.key];
      if (token.expand) {
        if (Array.isArray(child)) next.push(...child);
      } else if (child !== undefined) {
        next.push(child);
      }
    }
    values = next;
  }
  return values;
}

function normalizeExactTemplateValue(key, value) {
  const descriptor = eventExactTemplateVariableSchema[key];
  if (!descriptor) throw new Error(`unknown exact oracle template variable: ${key}`);
  if (value === undefined || value === null) {
    throw new Error(`missing exact oracle template value: ${key}`);
  }
  const normalized = String(value).normalize("NFKC").trim();
  if (!normalized) throw new Error(`empty exact oracle template value: ${key}`);
  if (/[{}]/u.test(normalized)) {
    throw new Error(`recursive exact oracle template substitution: ${key}`);
  }
  if (/\p{Cc}/u.test(normalized)) {
    throw new Error(`control character exact oracle template value: ${key}`);
  }
  if (descriptor.type === "unsigned-integer" && !/^\d+$/u.test(normalized)) {
    throw new Error(`invalid unsigned integer exact oracle template value: ${key}`);
  }
  if (descriptor.type === "identifier") {
    if (/(?:^|[./\\])\.\.(?:$|[./\\])|[/\\]/u.test(normalized)) {
      throw new Error(`path traversal exact oracle template value: ${key}`);
    }
    if (!/^[\p{L}\p{N}][\p{L}\p{N}._:-]*$/u.test(normalized)) {
      throw new Error(`invalid identifier exact oracle template value: ${key}`);
    }
  }
  return normalized;
}

export function resolveEventExactTemplate(template, values = {}, { context = "request-path" } = {}) {
  const source = String(template ?? "");
  let result = "";
  let cursor = 0;
  while (cursor < source.length) {
    const character = source[cursor];
    if (character === "}") throw new Error("malformed exact oracle template: unexpected closing brace");
    if (character !== "{") {
      result += character;
      cursor += 1;
      continue;
    }
    const closing = source.indexOf("}", cursor + 1);
    if (closing < 0) throw new Error("malformed exact oracle template: missing closing brace");
    const key = source.slice(cursor + 1, closing);
    if (!/^[A-Za-z][A-Za-z0-9]*$/u.test(key)) {
      throw new Error(`malformed exact oracle template variable: ${key}`);
    }
    if (!Object.prototype.hasOwnProperty.call(eventExactTemplateVariableSchema, key)) {
      throw new Error(`unknown exact oracle template variable: ${key}`);
    }
    if (!Object.prototype.hasOwnProperty.call(values, key)) {
      throw new Error(`missing exact oracle template value: ${key}`);
    }
    const normalized = normalizeExactTemplateValue(key, values[key]);
    result += context === "literal" || context === "selector" || context === "semantic-target"
      ? normalized
      : encodeURIComponent(normalized);
    cursor = closing + 1;
  }
  if (/[{}]/u.test(result)) throw new Error("unresolved exact oracle template remained after resolution");
  if (context.includes("path")) {
    if (!result.startsWith("/")) throw new Error("exact oracle path template must resolve to an absolute path");
    const url = new URL(result, "http://exact-runtime.invalid");
    if (url.origin !== "http://exact-runtime.invalid" || /(?:^|\/)\.\.(?:\/|$)/u.test(url.pathname)) {
      throw new Error("path traversal exact oracle template result");
    }
  }
  return result;
}

export function materializeEventExactTemplate(template, values = {}, options = {}) {
  return resolveEventExactTemplate(template, values, options);
}

export function auditEventExactTemplateUsage() {
  const values = Object.freeze({
    fixtureId: "audit-fixture", viewId: "9001", sourceId: "audit-source",
    ruleId: "audit-rule", q: "audit query", evidence: "snapshot",
    incidentStatus: "open", startTimeMs: "0", endTimeMs: "1",
    limit: "100", offset: "0",
  });
  let responseBaselineTemplateUseCount = 0;
  let unresolvedTemplateCount = 0;
  let unknownVariableCount = 0;
  let recursiveSubstitutionCount = 0;
  const uses = [];
  const catalog = buildExactRuntimeOracleCatalog();
  for (const spec of catalog) {
    for (const [index, request] of (spec.requests || []).entries()) {
      const template = String(request.path || "");
      if (!/[{}]/u.test(template)) continue;
      responseBaselineTemplateUseCount += 1;
      try {
        const resolved = resolveEventExactTemplate(template, values, { context: "response-baseline-path" });
        if (/[{}]/u.test(resolved)) unresolvedTemplateCount += 1;
      } catch (error) {
        const message = String(error?.message || error);
        if (message.includes("unknown exact oracle template variable")) unknownVariableCount += 1;
        else if (message.includes("recursive exact oracle template substitution")) recursiveSubstitutionCount += 1;
        else unresolvedTemplateCount += 1;
      }
      uses.push(Object.freeze({ caseId: spec.caseId, kind: "request-path", index }));
    }
    for (const [domIndex, dom] of (spec.dom || []).entries()) {
      for (const [assertionIndex, assertion] of (dom.assertions || []).entries()) {
        const template = String(assertion.target || "");
        if (!/[{}]/u.test(template)) continue;
        responseBaselineTemplateUseCount += 1;
        try {
          const resolved = resolveEventExactTemplate(template, values, { context: "semantic-target" });
          if (/[{}]/u.test(resolved)) unresolvedTemplateCount += 1;
        } catch (error) {
          const message = String(error?.message || error);
          if (message.includes("unknown exact oracle template variable")) unknownVariableCount += 1;
          else if (message.includes("recursive exact oracle template substitution")) recursiveSubstitutionCount += 1;
          else unresolvedTemplateCount += 1;
        }
        uses.push(Object.freeze({ caseId: spec.caseId, kind: "dom-assertion-target", index: `${domIndex}.${assertionIndex}` }));
      }
    }
  }
  return Object.freeze({
    schema: "media-server.v390-ui-exact-template-usage-audit.v1",
    canonicalCaseCount: catalog.length,
    responseBaselineTemplateUseCount,
    unresolvedTemplateCount,
    unknownVariableCount,
    recursiveSubstitutionCount,
    uses: Object.freeze(uses),
  });
}

export function validateIncidentMemorySearchResponseProjection({
  caseId,
  responseJson,
  fixtureId,
  query,
  sourceId,
  expectedIncidentId,
} = {}) {
  const fail = (path, reason) => {
    throw new Error(`${caseId || "unknown-case"} incident memory response invalid: ${path}[${reason}]`);
  };
  const requiredString = (value, path) => {
    if (typeof value !== "string" || value.trim().length === 0) fail(path, "type");
    return value;
  };
  const requiredStringArray = (value, path) => {
    if (!Array.isArray(value)) fail(path, "type");
    if (value.length === 0) fail(path, "count");
    if (value.some(item => typeof item !== "string" || item.trim().length === 0)) {
      fail(path, "item-type");
    }
    if (new Set(value).size !== value.length) fail(path, "duplicate");
    return value;
  };
  const unsafeKey = /^(?:authorization|credential|credentials|password|passwordHash|secret|sessionSecret|token|tokenHash|apiKey)$/i;
  const unsafeValue = /authorization\s*:\s*bearer|password(?:hash)?|sessionsecret|tokenhash|rtsps?:\/\//i;
  const assertReleaseSafe = (value, path) => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => assertReleaseSafe(item, `${path}[${index}]`));
      return;
    }
    if (value && typeof value === "object") {
      for (const [key, child] of Object.entries(value)) {
        if (unsafeKey.test(key)) fail(`${path}.${key}`, "unsafe-material");
        assertReleaseSafe(child, `${path}.${key}`);
      }
      return;
    }
    if (typeof value === "string" && unsafeValue.test(value)) fail(path, "unsafe-material");
  };
  const normalizedCaseId = requiredString(caseId, "caseId");
  const normalizedFixtureId = requiredString(fixtureId, "fixtureId");
  const normalizedQuery = requiredString(query, "query");
  const normalizedSourceId = requiredString(sourceId, "sourceId");
  const normalizedIncidentId = requiredString(
    expectedIncidentId || `incident:${normalizedFixtureId}`, "expectedIncidentId");
  if (!responseJson || typeof responseJson !== "object" || Array.isArray(responseJson)) {
    fail("$", "type");
  }
  const memorySearch = responseJson.memorySearch;
  if (!memorySearch || typeof memorySearch !== "object" || Array.isArray(memorySearch)) {
    fail("memorySearch", "type");
  }
  if (memorySearch.schema !== "media-server.ops.incident-memory-search-view.v1") {
    fail("memorySearch.schema", "value");
  }
  if (memorySearch.query !== normalizedQuery) fail("memorySearch.query", "identity");
  if (!Array.isArray(memorySearch.hits)) fail("memorySearch.hits", "type");
  if (memorySearch.hits.length === 0) fail("memorySearch.hits", "count");
  assertReleaseSafe(memorySearch.hits, "memorySearch.hits");

  const documentIds = new Set();
  const fixtureHits = [];
  for (let index = 0; index < memorySearch.hits.length; index += 1) {
    const path = `memorySearch.hits[${index}]`;
    const hit = memorySearch.hits[index];
    if (!hit || typeof hit !== "object" || Array.isArray(hit)) fail(path, "type");
    const documentId = requiredString(hit.documentId, `${path}.documentId`);
    const sourceKind = requiredString(hit.sourceKind, `${path}.sourceKind`);
    const incidentId = requiredString(hit.incidentId, `${path}.incidentId`);
    if (documentIds.has(documentId)) fail("memorySearch.hits[documentId]", "duplicate");
    documentIds.add(documentId);
    const documentMatches = documentId === `event-record:${normalizedFixtureId}`;
    const incidentMatches = incidentId === normalizedIncidentId;
    if (documentMatches) {
      fixtureHits.push({ hit, path, sourceKind, documentMatches, incidentMatches });
    }
  }
  if (fixtureHits.length !== 1) fail("memorySearch.hits[fixture-cardinality]", String(fixtureHits.length));
  const fixtureHitOwner = fixtureHits[0];
  const fixtureHit = fixtureHitOwner.hit;
  const fixturePath = fixtureHitOwner.path;
  if (!fixtureHitOwner.documentMatches || !fixtureHitOwner.incidentMatches) {
    fail("memorySearch.hits[fixture-identity]", "mismatch");
  }
  if (fixtureHitOwner.sourceKind !== "event-record") fail(`${fixturePath}.sourceKind`, "identity");
  requiredString(fixtureHit.sourceId, `${fixturePath}.sourceId`);
  if (fixtureHit.sourceId !== normalizedSourceId) fail(`${fixturePath}.sourceId`, "identity");
  requiredString(fixtureHit.title, `${fixturePath}.title`);
  requiredString(fixtureHit.summary, `${fixturePath}.summary`);
  if (typeof fixtureHit.score !== "number" || !Number.isFinite(fixtureHit.score)) {
    fail(`${fixturePath}.score`, "type");
  }
  const matchedTerms = requiredStringArray(fixtureHit.matchedTerms, `${fixturePath}.matchedTerms`);
  requiredStringArray(fixtureHit.highlightFragments, `${fixturePath}.highlightFragments`);
  const queryTerms = [...new Set((normalizedQuery.toLowerCase().match(/[a-z0-9]+/g) || [])
    .filter(term => term.length >= 2))];
  if (queryTerms.length === 0) fail("memorySearch.query", "terms");
  const fixtureTermSet = new Set(matchedTerms.map(term => term.toLowerCase()));
  if (!queryTerms.every(term => fixtureTermSet.has(term))) {
    fail(`${fixturePath}.matchedTerms`, "query-identity");
  }
  return {
    schema: "media-server.v390-ui-incident-memory-search-response-evidence.v1",
    caseIdDigest: sha256Text(normalizedCaseId),
    hitCount: memorySearch.hits.length,
    fixtureHitCount: fixtureHits.length,
    queryTermCount: queryTerms.length,
    matchedTermCount: fixtureHit.matchedTerms.length,
    highlightFragmentCount: fixtureHit.highlightFragments.length,
    queryDigest: sha256Text(normalizedQuery),
    fixtureIdentityDigest: sha256Text(`${fixtureHit.documentId}\n${fixtureHit.incidentId}\n${fixtureHit.sourceId}`),
    matchedTermsDigest: sha256Text(JSON.stringify(fixtureHit.matchedTerms)),
    highlightFragmentsDigest: sha256Text(JSON.stringify(fixtureHit.highlightFragments)),
    paths: {
      "memorySearch.hits": {
        type: "array",
        count: memorySearch.hits.length,
        digest: sha256Text(JSON.stringify(memorySearch.hits.map(hit => hit.documentId))),
      },
      "memorySearch.hits[].matchedTerms": {
        type: "string-array",
        count: fixtureHit.matchedTerms.length,
        digest: sha256Text(JSON.stringify(fixtureHit.matchedTerms)),
      },
      "memorySearch.hits[].highlightFragments": {
        type: "string-array",
        count: fixtureHit.highlightFragments.length,
        digest: sha256Text(JSON.stringify(fixtureHit.highlightFragments)),
      },
    },
  };
}

export function eventExactSemanticEvidenceKey({ scope, caseId, operator, subject }) {
  if (!["response", "dom"].includes(scope)) throw new Error(`unsupported semantic evidence scope: ${scope}`);
  if (!caseId || !operator || !subject) throw new Error("semantic evidence key requires caseId, operator, and subject");
  return `${scope}:${caseId}:${operator}:${subject}`;
}

function semanticEvidenceFor(context, key) {
  const source = context?.semanticEvidence;
  if (source instanceof Map) return source.get(key);
  return source?.[key];
}

function expectedValueFor(context, assertion, scope) {
  const key = assertion.path || assertion.target;
  const stores = scope === "response"
    ? [context?.expectedResponseByPath, context?.seedByPath, context?.requestByPath, context?.priorResponseByPath]
    : [context?.expectedDomByTarget, context?.responseValues, context?.seedByPath, context?.requestByPath];
  for (const store of stores) {
    if (store && Object.prototype.hasOwnProperty.call(store, key)) return store[key];
  }
  return undefined;
}

function evaluateSemanticFallback({ scope, caseId, assertion, actual, context }) {
  const subject = assertion.path || assertion.target || "unknown";
  const key = eventExactSemanticEvidenceKey({ scope, caseId, operator: assertion.operator, subject });
  const evidence = semanticEvidenceFor(context, key);
  if (evidence === undefined) {
    return { pass: false, reason: `semantic evidence missing: ${key}`, evidenceKey: key };
  }
  if (typeof evidence === "boolean") {
    return { pass: evidence, reason: evidence ? "semantic evidence passed" : `semantic evidence failed: ${key}`, evidenceKey: key };
  }
  if (!isObject(evidence) || typeof evidence.pass !== "boolean") {
    return { pass: false, reason: `semantic evidence must be boolean or {pass}: ${key}`, evidenceKey: key };
  }
  if (evidence.actual !== undefined && !deepEqual(actual, evidence.actual)) {
    return { pass: false, reason: `semantic evidence actual value mismatch: ${key}`, evidenceKey: key };
  }
  return { pass: evidence.pass, reason: evidence.reason || (evidence.pass ? "semantic evidence passed" : `semantic evidence failed: ${key}`), evidenceKey: key };
}

function forbiddenCanaries(context) {
  return [
    ...(context?.sensitiveCanaries || []),
    context?.seed?.redactionCanary,
    context?.seed?.rawCanary,
    context?.seed?.credentialCanary,
  ].filter(value => value !== undefined && value !== null && String(value) !== "").map(String);
}

function everyValue(actual, predicate) {
  const values = scalarValues(actual);
  return values.length > 0 && values.every(predicate);
}

function evaluateDirectResponse({ assertion, actual, context }) {
  const expected = assertion.expected;
  switch (assertion.operator) {
    case "equals":
      return { pass: everyValue(actual, value => deepEqual(value, expected)), reason: "equals" };
    case "equals-fixture":
      return { pass: everyValue(actual, value => deepEqual(value, context.fixtureId)), reason: "equals-fixture" };
    case "number-gte":
      return { pass: everyValue(actual, value => Number.isFinite(Number(value)) && Number(value) >= Number(expected)), reason: "number-gte" };
    case "number":
      return { pass: everyValue(actual, value => typeof value === "number" && Number.isFinite(value)), reason: "number" };
    case "boolean":
      return { pass: everyValue(actual, value => typeof value === "boolean"), reason: "boolean" };
    case "object":
      return { pass: everyValue(actual, value => isObject(value)), reason: "object" };
    case "non-empty":
    case "string-non-empty":
      return { pass: everyValue(actual, value => value !== null && value !== undefined && (typeof value === "string" ? value.trim().length > 0 : Array.isArray(value) ? value.length > 0 : isObject(value) ? Object.keys(value).length > 0 : true)), reason: "non-empty" };
    case "starts-with":
      return { pass: everyValue(actual, value => String(value).startsWith(String(expected))), reason: "starts-with" };
    case "redacted": {
      const canaries = forbiddenCanaries(context);
      const text = valueText(actual);
      return { pass: canaries.every(canary => !text.includes(canary)) && !/authorization\s*:\s*bearer|password(hash)?|sessionsecret/i.test(text), reason: "redacted" };
    }
    case "score-descending": {
      const scores = scalarValues(actual).flatMap(value => Array.isArray(value) ? value : [value]).map(value => Number(value?.score)).filter(Number.isFinite);
      return { pass: scores.length > 0 && scores.every((score, index) => index === 0 || scores[index - 1] >= score), reason: "score-descending" };
    }
    default:
      return null;
  }
}

function genericContainsFixtureOperator(operator) {
  return operator.startsWith("contains-fixture") || operator === "csv-contains-fixture";
}

function genericSensitiveAbsenceOperator(operator) {
  return operator.startsWith("not-contains-seed-") || operator === "not-contains-sensitive-canary";
}

function directResponseAssertion(assertion) {
  return DIRECT_RESPONSE_OPERATORS.has(assertion.operator) || genericContainsFixtureOperator(assertion.operator) ||
    genericSensitiveAbsenceOperator(assertion.operator) ||
    ["equals-seed", "equals-request", "equals-requested-fields", "equals-requested-resolution", "equals-put-response", "equals-put-response-review", "equals-review-projection", "equals-seed-counts", "equals-seed-derivation", "contains-stages"].includes(assertion.operator);
}

function directDomAssertion(assertion) {
  return DIRECT_DOM_OPERATORS.has(assertion.operator);
}

export function eventExactRuntimeBindingRequirements(caseId) {
  const spec = eventExactOracleFor(caseId);
  const seedPaths = new Set();
  const requestPaths = new Set();
  const semanticEvidenceKeys = new Set();
  let sensitiveCanaryRequired = false;
  for (const request of spec.requests) {
    for (const assertion of request.assertions) {
      if (assertion.operator.includes("seed")) seedPaths.add(assertion.path);
      if (assertion.operator.includes("request")) requestPaths.add(assertion.path);
      if (!directResponseAssertion(assertion)) {
        semanticEvidenceKeys.add(eventExactSemanticEvidenceKey({
          scope: "response",
          caseId,
          operator: assertion.operator,
          subject: assertion.path,
        }));
      }
      if (genericSensitiveAbsenceOperator(assertion.operator)) sensitiveCanaryRequired = true;
    }
  }
  for (const contract of spec.dom) {
    for (const assertion of contract.assertions) {
      if (assertion.operator.includes("seed")) seedPaths.add(assertion.target);
      if (assertion.operator.includes("request")) requestPaths.add(assertion.target);
      if (!directDomAssertion(assertion)) {
        semanticEvidenceKeys.add(eventExactSemanticEvidenceKey({
          scope: "dom",
          caseId,
          operator: assertion.operator,
          subject: assertion.target,
        }));
      }
      if (genericSensitiveAbsenceOperator(assertion.operator)) sensitiveCanaryRequired = true;
    }
  }
  return Object.freeze({
    caseId,
    seedPaths: Object.freeze([...seedPaths]),
    requestPaths: Object.freeze([...requestPaths]),
    semanticEvidenceKeys: Object.freeze([...semanticEvidenceKeys]),
    sensitiveCanaryRequired,
    repeatedRequests: Object.freeze(spec.requests
      .filter(request => Number(request.repeat?.count || 1) > 1)
      .map(request => Object.freeze({
        method: request.method,
        path: request.path,
        count: Number(request.repeat.count),
        intervalMs: Number(request.repeat.intervalMs || 0),
      }))),
  });
}

export function assertEventExactRuntimeBindings(caseId, context = {}, {
  requireSemanticEvidence = true,
} = {}) {
  const requirements = eventExactRuntimeBindingRequirements(caseId);
  const missing = [];
  for (const path of requirements.seedPaths) {
    if (!Object.prototype.hasOwnProperty.call(context.seedByPath || {}, path) ||
        context.seedByPath[path] === undefined) {
      missing.push(`seedByPath:${path}`);
    }
  }
  for (const path of requirements.requestPaths) {
    if (!Object.prototype.hasOwnProperty.call(context.requestByPath || {}, path) ||
        context.requestByPath[path] === undefined) {
      missing.push(`requestByPath:${path}`);
    }
  }
  if (requirements.sensitiveCanaryRequired && forbiddenCanaries(context).length === 0) {
    missing.push("sensitiveCanaries");
  }
  if (requireSemanticEvidence) {
    for (const key of requirements.semanticEvidenceKeys) {
      if (semanticEvidenceFor(context, key) === undefined) missing.push(`semanticEvidence:${key}`);
    }
  }
  if (missing.length > 0) {
    throw new Error(`${caseId} exact event runtime bindings missing: ${missing.join(", ")}`);
  }
  return requirements;
}

export function evaluateEventExactResponseAssertion({ caseId, assertion, responseJson, responseText = "", responseHeaders = {}, context = {} }) {
  let actual;
  const rowLocalActualPresent = Object.prototype.hasOwnProperty.call(
    context.rowLocalActualByPath || {},
    assertion.path,
  );
  if (rowLocalActualPresent) actual = context.rowLocalActualByPath[assertion.path];
  else if (assertion.path === "$text") actual = responseText;
  else if (assertion.path === "$contentType") actual = responseHeaders["content-type"] || responseHeaders["Content-Type"] || "";
  else {
    const values = eventExactValuesAtPath(responseJson, assertion.path);
    actual = values.length === 1 ? values[0] : values;
    if (values.length === 0) return { pass: false, reason: `required response path missing: ${assertion.path}`, assertion, actual: undefined };
    if (assertion.operator === "array") {
      return {
        pass: values.length === 1 && Array.isArray(values[0]),
        reason: "array",
        assertion,
        actual,
      };
    }
  }

  const direct = evaluateDirectResponse({ assertion, actual, context });
  if (direct) return { ...direct, assertion, actual };
  if (assertion.operator === "contains-fixture-source") {
    const expected = expectedValueFor(context, assertion, "response") ?? context.fixtureId;
    const identityFields = isObject(actual)
      ? ["sourceId", "id"].filter(key => Object.prototype.hasOwnProperty.call(actual, key))
      : [];
    const pass = identityFields.length === 1 &&
      String(actual[identityFields[0]]) === String(expected);
    return {
      pass,
      reason: pass
        ? "authoritative source row identity exact"
        : "authoritative source row identity missing, duplicated, or mismatched",
      assertion,
      actual,
      expected,
    };
  }
  if (genericContainsFixtureOperator(assertion.operator)) {
    const expected = expectedValueFor(context, assertion, "response") ?? context.fixtureId;
    return { pass: recursiveContains(actual, expected), reason: `${assertion.operator} expected ${valueText(expected)}`, assertion, actual };
  }
  if (genericSensitiveAbsenceOperator(assertion.operator)) {
    const canaries = forbiddenCanaries(context);
    return { pass: canaries.length > 0 && canaries.every(canary => !valueText(actual).includes(canary)), reason: assertion.operator, assertion, actual };
  }
  if (["equals-seed", "equals-request", "equals-requested-fields", "equals-requested-resolution", "equals-put-response", "equals-put-response-review", "equals-review-projection", "equals-seed-counts", "equals-seed-derivation"].includes(assertion.operator)) {
    const expected = expectedValueFor(context, assertion, "response");
    if (expected === undefined) return { pass: false, reason: `expected value missing for ${assertion.operator}:${assertion.path}`, assertion, actual };
    if (assertion.operator === "equals-seed" &&
        expected && typeof expected === "object" &&
        /^[a-f0-9]{64}$/.test(String(expected.sha256 || "")) &&
        typeof expected.present === "boolean") {
      const actualPresent = typeof actual === "string" && actual.length > 0;
      const actualSha256 = sha256Text(typeof actual === "string" ? actual : "");
      return {
        pass: actualPresent === expected.present && actualSha256 === expected.sha256,
        reason: "equals-seed-digest",
        assertion,
        actual: { present: actualPresent, sha256: actualSha256 },
        expected,
      };
    }
    return { pass: deepEqual(actual, expected), reason: assertion.operator, assertion, actual, expected };
  }
  if (assertion.operator === "contains-stages") {
    const stages = scalarValues(actual).flatMap(value => Array.isArray(value) ? value : [value]).map(value => value?.stage ?? value);
    const expected = Array.isArray(assertion.expected) ? assertion.expected : [];
    return { pass: expected.length > 0 && expected.every(stage => stages.includes(stage)), reason: "contains-stages", assertion, actual, expected };
  }
  const semantic = evaluateSemanticFallback({ scope: "response", caseId, assertion, actual, context });
  return { ...semantic, assertion, actual };
}

function findForbiddenKey(value, forbiddenKeys, prefix = "") {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findForbiddenKey(value[index], forbiddenKeys, `${prefix}[${index}]`);
      if (found) return found;
    }
    return "";
  }
  if (!isObject(value)) return "";
  const normalized = new Set(forbiddenKeys.map(key => String(key).toLowerCase()));
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (normalized.has(key.toLowerCase())) return path;
    const found = findForbiddenKey(child, forbiddenKeys, path);
    if (found) return found;
  }
  return "";
}

function requestIdentity(method, path) {
  return `${String(method || "GET").toUpperCase()} ${path}`;
}

function findExchange(exchanges, method, path) {
  return exchanges.find(item => requestIdentity(item.method, item.path) === requestIdentity(method, path));
}

export function evaluateEventExactRequests({ spec, exchanges = [], context = {} }) {
  const results = [];
  for (const request of spec.requests) {
    let path;
    try {
      path = materializeEventExactTemplate(
        request.path,
        context.templateValues || { fixtureId: context.fixtureId },
        { context: "request-path" },
      );
    } catch (error) {
      results.push({ pass: false, kind: "request-template", request, reason: String(error?.message || error) });
      continue;
    }
    const exchange = findExchange(exchanges, request.method, path);
    if (!exchange) {
      results.push({ pass: false, kind: "request-missing", request, reason: `request exchange missing: ${requestIdentity(request.method, path)}` });
      continue;
    }
    const statusPass = request.allowedStatuses.includes(Number(exchange.status));
    results.push({ pass: statusPass, kind: "request-status", request, actual: exchange.status, expected: request.allowedStatuses, reason: statusPass ? "allowed status" : "unexpected status" });
    if (request.correlationRequired) {
      const identity = requestIdentity(request.method, path);
      const expectedCorrelation = context?.correlationByRequest?.[identity];
      const pass = typeof exchange.correlationId === "string" && exchange.correlationId.length > 0 &&
        (expectedCorrelation === undefined || exchange.correlationId === expectedCorrelation);
      results.push({ pass, kind: "request-correlation", request, actual: exchange.correlationId, expected: expectedCorrelation, reason: pass ? "correlated request/response" : `missing or mismatched correlation: ${identity}` });
    }
    const forbiddenPath = findForbiddenKey(exchange.json, request.forbiddenJsonKeys || []);
    results.push({ pass: !forbiddenPath, kind: "forbidden-json-key", request, actual: forbiddenPath, reason: forbiddenPath ? `forbidden JSON key: ${forbiddenPath}` : "forbidden keys absent" });
    for (const assertion of request.assertions) {
      const result = evaluateEventExactResponseAssertion({
        caseId: spec.caseId,
        assertion,
        responseJson: exchange.json,
        responseText: exchange.text,
        responseHeaders: exchange.headers,
        context,
      });
      results.push({ ...result, kind: "response-assertion", request });
    }
  }
  return results;
}

function domText(observation) {
  return String(observation?.text ?? observation?.textContent ?? "");
}

function evaluateDirectDom({ assertion, observation, context }) {
  const text = domText(observation);
  switch (assertion.operator) {
    case "text-includes":
      return { pass: text.includes(String(assertion.target)), reason: "text-includes" };
    case "contains-descendant": {
      const selector = materializeEventExactTemplate(
        assertion.target,
        context.templateValues || { fixtureId: context.fixtureId },
        { context: "selector" },
      );
      const match = (observation.descendantMatches || [])
        .find(candidate => candidate?.selector === selector);
      const pass = observation.rootCount === 1 &&
        observation.visibleRootCount === 1 &&
        (observation.descendants || []).includes(selector) &&
        match?.ownerNodeCount === 1 && match?.count === 1 &&
        match?.visibleCount === 1;
      return {
        pass,
        reason: pass
          ? "contains-exact-visible-descendant"
          : "exact visible descendant cardinality mismatch",
      };
    }
    case "contains-fixture-event":
    case "contains-fixture-marker":
      return { pass: recursiveContains(observation, context.fixtureId), reason: assertion.operator };
    case "not-contains-seed-credential-canary":
    case "not-contains-seed-raw-canary":
    case "not-contains-sensitive-canary": {
      const canaries = forbiddenCanaries(context);
      return { pass: canaries.length > 0 && canaries.every(canary => !text.includes(canary)), reason: assertion.operator };
    }
    case "does-not-claim-longrun-pass":
      return { pass: !/(30|120)\s*(분|minute).*pass/i.test(text), reason: "does-not-claim-longrun-pass" };
    case "history-bounded": {
      const attributes = (observation?.attributes || [])[0] || {};
      const count = Number(attributes["data-event-semantic-sample-count"]);
      const limit = Number(attributes["data-event-semantic-sample-limit"]);
      return {
        pass: Number.isInteger(count) && count > 0 && Number.isInteger(limit) && limit > 0 && count <= limit,
        reason: "history-bounded",
      };
    }
    case "selected-event-equals":
      return { pass: recursiveContains(observation, context.fixtureId), reason: "selected-event-equals" };
    case "slot-count-equals": {
      const semanticCount = (observation?.attributes || [])
        .map(attributes => attributes?.["data-event-semantic-slot-count"])
        .find(value => value !== undefined);
      const actual = semanticCount ?? observation?.descendantCounts?.[assertion.target];
      return { pass: Number(actual) === Number(assertion.expected), reason: "slot-count-equals" };
    }
    case "number-equals-response": {
      const expected = context?.responseValues?.[assertion.target];
      const actual = Number(observation?.number ?? observation?.value ?? text.trim());
      return { pass: expected !== undefined && Number(actual) === Number(expected), reason: expected === undefined ? `response value missing: ${assertion.target}` : "number-equals-response", actual, expected };
    }
    default:
      return null;
  }
}

export function evaluateEventExactDomAssertion({ caseId, assertion, observation, context = {} }) {
  const direct = evaluateDirectDom({ assertion, observation, context });
  if (direct) return { ...direct, assertion };
  const semantic = evaluateSemanticFallback({ scope: "dom", caseId, assertion, actual: observation, context });
  return { ...semantic, assertion, actual: observation };
}

export function evaluateEventExactDom({ spec, observations = [], context = {} }) {
  const results = [];
  for (const contract of spec.dom) {
    let selector;
    try {
      selector = materializeEventExactTemplate(
        contract.selector,
        context.templateValues || { fixtureId: context.fixtureId },
        { context: "selector" },
      );
    } catch (error) {
      results.push({ pass: false, kind: "dom-template", contract, reason: String(error?.message || error) });
      continue;
    }
    const observation = observations.find(item => item.selector === selector);
    if (!observation) {
      results.push({ pass: false, kind: "dom-missing", contract, reason: `DOM observation missing: ${selector}` });
      continue;
    }
    results.push({ pass: observation.exists === true && observation.visible === true, kind: "dom-presence", contract, reason: "exact DOM target must exist and be visible" });
    const text = domText(observation);
    for (const token of contract.requiredTextTokens) {
      results.push({ pass: text.includes(token), kind: "dom-required-text", contract, actual: text, expected: token, reason: `required DOM text: ${token}` });
    }
    for (const token of contract.forbiddenTextTokens) {
      results.push({ pass: !text.includes(token), kind: "dom-forbidden-text", contract, actual: text, expected: token, reason: `forbidden DOM text: ${token}` });
    }
    for (const attribute of contract.requiredAttributes) {
      const actual = observation.attributes?.[attribute.name];
      const expected = attribute.value === null ? null : materializeEventExactTemplate(
        attribute.value,
        context.templateValues || { fixtureId: context.fixtureId },
        { context: "literal" },
      );
      const pass = attribute.value === null ? actual !== undefined : String(actual) === String(expected);
      results.push({ pass, kind: "dom-required-attribute", contract, actual, expected, reason: `required DOM attribute: ${attribute.name}` });
    }
    for (const assertion of contract.assertions) {
      results.push({ ...evaluateEventExactDomAssertion({ caseId: spec.caseId, assertion, observation, context }), kind: "dom-assertion", contract });
    }
  }
  return results;
}

export function evaluateEventExactVisibleControl({ spec, observations = [], context = {} }) {
  let selector;
  try {
    selector = materializeEventExactTemplate(
      spec.visibleControl.selector,
      context.templateValues || { fixtureId: context.fixtureId },
      { context: "selector" },
    );
  } catch (error) {
    return [{ pass: false, kind: "visible-control-template", reason: String(error?.message || error) }];
  }
  const observation = observations.find(item => item.selector === selector);
  const present = observation?.exists === true && observation?.visible === true;
  const actualAction = observation?.action ?? context.visibleControlAction;
  return [
    { pass: present, kind: "visible-control-presence", actual: observation, expected: selector, reason: present ? "visible control observed" : `visible control missing: ${selector}` },
    { pass: actualAction === spec.visibleControl.action, kind: "visible-control-action", actual: actualAction, expected: spec.visibleControl.action, reason: actualAction === spec.visibleControl.action ? "visible control action bound" : "visible control action mismatch" },
  ];
}

function globMatches(path, pattern) {
  if (pattern.endsWith("/*")) return path === pattern.slice(0, -2) || path.startsWith(pattern.slice(0, -1));
  return path === pattern;
}

export function evaluateEventExactForbiddenNetwork({ spec, network = [] }) {
  const results = [];
  for (const forbidden of spec.forbiddenNetwork) {
    const match = network.find(item => String(item.method).toUpperCase() === forbidden.method && globMatches(item.path, forbidden.path));
    results.push({ pass: !match, kind: "forbidden-network", forbidden, actual: match, reason: match ? `forbidden network mutation: ${requestIdentity(match.method, match.path)}` : "forbidden network mutation absent" });
  }
  return results;
}

function evaluateSnapshot(contract, evidence) {
  if (!evidence) return { pass: false, reason: `snapshot evidence missing: ${contract.scope}` };
  if (contract.policy === "equal") return { pass: evidence.beforeHash !== undefined && evidence.beforeHash === evidence.afterHash, reason: "before/after equal" };
  if (contract.policy === "restore") return { pass: evidence.beforeHash !== undefined && evidence.beforeHash === evidence.restoredHash, reason: "restored byte exact" };
  if (["baseline-after-cleanup", "remove-fixture-then-equal"].includes(contract.policy)) {
    return { pass: evidence.beforeHash !== undefined && evidence.beforeHash === evidence.cleanupHash && evidence.fixtureRemaining !== true, reason: contract.policy };
  }
  return { pass: false, reason: `unsupported snapshot policy: ${contract.policy}` };
}

export function evaluateEventExactStateAndCleanup({ spec, snapshots = {}, cleanupEvidence = {} }) {
  const results = spec.stateSnapshots.map(contract => ({
    ...evaluateSnapshot(contract, snapshots[contract.scope]),
    kind: "state-snapshot",
    contract,
  }));
  for (const assertion of spec.cleanup.assertions) {
    results.push({
      pass: cleanupEvidence[assertion] === true,
      kind: "cleanup-assertion",
      assertion,
      reason: cleanupEvidence[assertion] === true ? "cleanup assertion passed" : `cleanup evidence missing or false: ${assertion}`,
    });
  }
  return results;
}

export function createEventExactOracleEvaluationPlan(caseId) {
  const spec = eventExactOracleFor(caseId);
  const semanticEvidenceKeys = [
    ...spec.requests.flatMap(request => request.assertions.filter(assertion => !directResponseAssertion(assertion)).map(assertion =>
      eventExactSemanticEvidenceKey({ scope: "response", caseId, operator: assertion.operator, subject: assertion.path }))),
    ...spec.dom.flatMap(contract => contract.assertions.filter(assertion => !directDomAssertion(assertion)).map(assertion =>
      eventExactSemanticEvidenceKey({ scope: "dom", caseId, operator: assertion.operator, subject: assertion.target }))),
  ];
  return Object.freeze({
    caseId,
    responseAssertionCount: spec.requests.reduce((count, item) => count + item.assertions.length, 0),
    domAssertionCount: spec.dom.reduce((count, item) => count + item.assertions.length, 0),
    requestCount: spec.requests.length,
    domTargetCount: spec.dom.length,
    forbiddenNetworkCount: spec.forbiddenNetwork.length,
    snapshotCount: spec.stateSnapshots.length,
    cleanupAssertionCount: spec.cleanup.assertions.length,
    visibleControlCount: 1,
    semanticEvidenceKeys: Object.freeze(semanticEvidenceKeys),
  });
}

export function evaluateEventExactOracle({
  caseId,
  actualRoute,
  actualRole,
  exchanges = [],
  domObservations = [],
  network = [],
  snapshots = {},
  cleanupEvidence = {},
  context = {},
  throwOnFailure = false,
}) {
  const spec = eventExactOracleFor(caseId);
  const evaluationContext = { ...context, fixtureId: context.fixtureId, templateValues: { fixtureId: context.fixtureId, ...(context.templateValues || {}) } };
  const results = [
    { pass: typeof context.fixtureId === "string" && context.fixtureId.length > 0, kind: "fixture-context", actual: context.fixtureId, expected: "non-empty fixtureId", reason: "exact fixture identity" },
    { pass: actualRoute === spec.route, kind: "route", actual: actualRoute, expected: spec.route, reason: "exact product route" },
    { pass: actualRole === spec.role, kind: "role", actual: actualRole, expected: spec.role, reason: "exact account role" },
    ...evaluateEventExactRequests({ spec, exchanges, context: evaluationContext }),
    ...evaluateEventExactVisibleControl({ spec, observations: domObservations, context: evaluationContext }),
    ...evaluateEventExactDom({ spec, observations: domObservations, context: evaluationContext }),
    ...evaluateEventExactForbiddenNetwork({ spec, network }),
    ...evaluateEventExactStateAndCleanup({ spec, snapshots, cleanupEvidence }),
  ];
  const failures = results.filter(item => item.pass !== true);
  const report = Object.freeze({
    schema: "media-server.v390-ui-exact-event-oracle-evaluation.v1",
    caseId,
    pass: failures.length === 0,
    resultCount: results.length,
    failureCount: failures.length,
    results: Object.freeze(results),
  });
  if (throwOnFailure && failures.length) {
    throw new Error(`${caseId} exact event oracle failed (${failures.length}/${results.length}): ${failures.map(item => item.reason).join("; ")}`);
  }
  return report;
}

export function eventExactOracleEvaluatorCapabilities() {
  return Object.freeze({
    schema: "media-server.v390-ui-exact-event-oracle-evaluator-capabilities.v1",
    directResponseOperators: Object.freeze([...DIRECT_RESPONSE_OPERATORS].sort()),
    directDomOperators: Object.freeze([...DIRECT_DOM_OPERATORS].sort()),
    semanticFallback: "required-keyed-evidence-fail-closed",
    semanticEvidenceKeyFormat: "<response|dom>:<caseId>:<operator>:<path|target>",
  });
}
