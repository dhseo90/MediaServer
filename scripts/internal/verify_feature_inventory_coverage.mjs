#!/usr/bin/env node
// 파일 용도: 모든 feature inventory ID가 verifier, 수동 UI 풀테스트, longrun gate, 제외 경계 중 하나에 연결되는지 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Feature inventory coverage verification

Usage:
  ./server.sh verify-feature-inventory-coverage [options]

Options:
  --report <path>       Write a Markdown coverage report.
  --json-report <path>  Write a JSON coverage report.
  -h, --help            Show help.

Checks:
  - every docs/project-feature-test-inventory.md feature ID has a coverage target
  - stability rows map to a verifier family
  - UI rows map to the manual UI fulltest standard/checklist
  - 30/120-minute rows map to explicit approval-only longrun conditions
  - rows outside stability/30-minute/120-minute/UI are rejected
  - a missing-ID negative fixture produces FAIL rows
`);
}

assertKnownOptions(rawArgs, ["report", "json-report", "h", "help"]);

const args = parseArgs(rawArgs);
const inventory = readText("docs/project-feature-test-inventory.md");
const rows = parseFeatureRows(inventory);
const checks = [];

const stabilityVerifierByPrefix = {
  UI: ["verify-auth-bootstrap", "verify-auth-routes", "verify-ops-client-ui", "verify-ops-route-boundaries", "verify-vlm-install-connection-ui", "verify-vlm-profile-storage", "verify-vlm-runtime-opt-in-contract", "verify-vlm-runtime-status-ui", "verify-vlm-evaluation-result-workflow", "verify-vlm-review-action-workflow", "verify-vlm-rule-suggestion-draft-workflow", "verify-vlm-ops-event-review-ui", "verify-vlm-privacy-transfer-guard", "verify-ops-event-action-incident-workflow", "verify-ops-alert-delivery-integrations", "verify-v250-ops-events-semantic-search-ui", "verify-v250-incident-timeline-graph", "verify-v250-explainable-incident-brief", "verify-v250-similar-incident-lookup", "verify-v250-redacted-incident-evidence-bundle", "verify-v250-owner-release-readiness", "verify-v260-incident-memory-productization", "verify-v260-rule-suggestion-review", "verify-v260-onvif-credential-gate", "verify-v260-runtime-dashboard-trends", "verify-v260-scenario-cross-zone-reentry", "verify-v260-owner-release-readiness", "verify-v270-incident-triage-board", "verify-v270-incident-decision-scorecard", "verify-v270-operational-action-pack", "verify-v270-rule-what-if-preview", "verify-v270-operator-outcome-memory", "verify-v280-incident-action-readiness-queue", "verify-v280-approval-gated-rule-draft", "verify-v280-evidence-intake-field-readiness", "verify-v280-runtime-evidence-window", "verify-v280-owner-release-readiness", "verify-v300-ops-events-ui", "verify-v310-replay-timeline-ui", "verify-v310-operator-feature-correction", "verify-v320-unified-ops-events-workspace", "verify-v320-evidence-quality-layer", "verify-v320-source-reliability-context", "verify-v320-source-reliability-runtime-sample", "verify-v320-ai-review-quality-context", "verify-v320-operator-resolution-flow", "verify-v320-action-readiness-checklist", "verify-v320-client-safe-resolution-digest", "verify-v320-resolution-search-metrics", "verify-v330-incident-source-correlation-layer", "verify-v330-operator-recheck-recovery-queue", "verify-v330-client-safe-source-status-digest", "verify-v330-source-reliability-search-metrics", "verify-v330-ops-backup-recovery-source-handoff", "verify-v340-ops-continuity-drill-workspace-ui", "verify-v340-approval-gated-recovery-checklist-audit", "verify-v340-client-safe-maintenance-digest", "verify-v340-drill-evidence-export-cleanup-manifest", "verify-v340-field-bridge-condition-gates", "verify-v350-ops-command-workspace-ui", "verify-v350-drill-run-ledger-plan-comparison", "verify-v350-client-impact-forecast", "verify-v350-client-safe-operations-notice", "verify-v350-operations-export-bundle-handoff-map", "verify-v350-field-evidence-intake", "verify-v350-vlm-assisted-ops-explanation"],
  AUTH: ["verify-auth-regression-matrix", "verify-auth-bootstrap", "verify-auth-users", "verify-auth-routes", "verify-auth-ui-smoke", "verify-auth-scope-picker"],
  SRC: ["verify-v230-conditional-field-evidence", "verify-ops-source-lifecycle", "verify-ops-source-health-bulk", "verify-ops-client-ui", "verify-onvif-no-device-suite", "verify-v260-onvif-credential-gate", "verify-v280-evidence-intake-field-readiness", "verify-v330-source-registry-snapshot-identity", "verify-v330-source-onboarding-quality-summary", "verify-v330-reliability-timeline-health-history", "verify-v330-incident-source-correlation-layer", "verify-v330-operator-recheck-recovery-queue", "verify-v330-client-safe-source-status-digest", "verify-v330-source-reliability-search-metrics", "verify-v330-ops-backup-recovery-source-handoff", "verify-v340-recovery-candidate-package", "verify-v340-source-health-replay-drift-diff", "verify-v340-field-bridge-condition-gates", "verify-v350-field-evidence-intake", "verify-v350-vlm-assisted-ops-explanation"],
  RULE: ["verify-rule-ui", "verify-ops-rules-roundtrip", "verify-ops-rule-validation-matrix", "verify-va-event-coverage-report", "verify-va-replay", "verify-analysis-state", "verify-v260-scenario-cross-zone-reentry", "verify-v280-approval-gated-rule-draft"],
  EVT: ["verify-va-event-coverage-report", "verify-va-events", "verify-analysis-state", "verify-ops-event-review-inbox", "verify-ops-event-records-scope", "verify-ops-alert-delivery-integrations", "verify-ops-event-action-incident-workflow", "verify-va-runtime-console", "verify-vlm-event-evidence-extraction", "verify-vlm-observation-sidecar", "verify-vlm-event-explanation-hints", "verify-vlm-review-action-workflow", "verify-vlm-ops-event-review-ui", "verify-vlm-summary-search-candidates", "verify-vlm-rule-suggestion-candidates", "verify-vlm-rule-suggestion-draft-workflow", "verify-v250-incident-text-projection", "verify-v250-incident-memory-index", "verify-v250-ops-events-semantic-search-ui", "verify-v250-incident-timeline-graph", "verify-v250-explainable-incident-brief", "verify-v250-similar-incident-lookup", "verify-v250-redacted-incident-evidence-bundle", "verify-v260-incident-memory-productization", "verify-v260-rule-suggestion-review", "verify-v260-runtime-dashboard-trends", "verify-v260-scenario-cross-zone-reentry", "verify-v270-incident-triage-board", "verify-v270-incident-decision-scorecard", "verify-v270-operational-action-pack", "verify-v270-rule-what-if-preview", "verify-v270-operator-outcome-memory", "verify-v280-incident-action-readiness-queue", "verify-v280-approval-gated-rule-draft", "verify-v280-evidence-intake-field-readiness", "verify-v280-runtime-evidence-window", "verify-v310-operator-feature-correction", "verify-v310-retention-export-hardening", "verify-v320-resolution-state-contract", "verify-v320-unified-ops-events-workspace", "verify-v320-evidence-quality-layer", "verify-v320-source-reliability-context", "verify-v320-source-reliability-runtime-sample", "verify-v320-ai-review-quality-context", "verify-v320-operator-resolution-flow", "verify-v320-action-readiness-checklist", "verify-v320-resolution-search-metrics", "verify-v330-incident-source-correlation-layer", "verify-v330-operator-recheck-recovery-queue", "verify-v340-recovery-candidate-package", "verify-v350-vlm-assisted-ops-explanation"],
  CLIENT: ["verify-client-live-workspace", "verify-client-dashboard-polish", "verify-client-source-dock-events", "verify-ops-client-ui", "verify-v250-client-safe-incident-digest", "verify-v280-client-safe-followup-digest", "verify-v310-client-safe-event-digest", "verify-v310-scoped-integrator-search-api", "verify-v320-client-safe-resolution-digest", "verify-v330-client-safe-source-status-digest", "verify-v340-client-safe-maintenance-digest", "verify-v350-client-impact-forecast", "verify-v350-client-safe-operations-notice"],
  MEDIA: ["verify-v230-conditional-field-evidence", "verify-codecs", "verify-webrtc-ice", "verify-external-turn-whep-field-gate", "verify-webrtc-va-metadata", "verify-v340-field-bridge-condition-gates", "verify-v350-field-evidence-intake"],
  LAB: ["verify-analysis-state", "verify-va-metadata-sidechannel", "verify-ws-metadata", "verify-image-analysis", "verify-vlm-boundary", "verify-vlm-selection-decision", "verify-vlm-pc-capability", "verify-vlm-recommendation-engine", "verify-vlm-install-connection-dry-run", "verify-vlm-profile-storage", "verify-vlm-runtime-opt-in-contract", "verify-v230-vlm-opt-in-operational-evidence", "verify-vlm-local-runtime-smoke", "verify-vlm-cloud-provider-field-smoke-gate", "verify-vlm-queue-backpressure-stability", "verify-runtime-model-bundle-rc-rehearsal", "verify-vlm-evaluation-harness", "verify-vlm-evaluation-result-workflow", "verify-vlm-review-action-workflow", "verify-vlm-observation-sidecar", "verify-vlm-event-explanation-hints", "verify-vlm-privacy-transfer-guard", "verify-vlm-summary-search-candidates", "verify-vlm-rule-suggestion-candidates", "verify-vlm-rule-suggestion-draft-workflow", "verify-v250-incident-text-projection", "verify-v250-incident-memory-index", "verify-v250-incident-timeline-graph", "verify-v250-explainable-incident-brief", "verify-v250-similar-incident-lookup", "verify-v250-redacted-incident-evidence-bundle", "verify-v260-incident-memory-productization", "verify-v260-rule-suggestion-review", "verify-v260-onvif-credential-gate", "verify-v260-runtime-dashboard-trends", "verify-v260-scenario-cross-zone-reentry", "verify-v270-incident-triage-board", "verify-v270-incident-decision-scorecard", "verify-v270-operational-action-pack", "verify-v270-rule-what-if-preview", "verify-v270-operator-outcome-memory", "verify-v280-incident-action-readiness-queue", "verify-v280-approval-gated-rule-draft", "verify-v280-evidence-intake-field-readiness", "verify-v280-runtime-evidence-window", "verify-v300-feature-schema-privacy", "verify-v300-vlm-feature-queue", "verify-v300-feature-only-retention", "verify-v300-search-dsl-query-convert", "verify-v300-feature-search-index", "verify-v300-retention-pin-cleanup", "verify-v310-optional-vector-search", "verify-v340-staging-restore-validation-harness", "verify-v340-field-bridge-condition-gates", "verify-v350-field-evidence-intake", "verify-v350-vlm-assisted-ops-explanation"],
  SAFE: ["verify-v230-conditional-field-evidence", "verify-integrator-contract-artifact", "verify-auth-routes", "verify-ops-client-ui", "verify-ui-blocking-dialog-policy", "verify-event-post", "verify-webrtc-va-metadata", "verify-ws-metadata", "verify-analysis-state", "verify-external-turn-whep-field-gate", "verify-runtime-model-bundle-rc-rehearsal", "verify-vlm-boundary", "verify-vlm-install-connection-scope-gate", "verify-vlm-profile-storage", "verify-vlm-runtime-opt-in-contract", "verify-v230-vlm-opt-in-operational-evidence", "verify-vlm-local-runtime-smoke", "verify-vlm-cloud-provider-field-smoke-gate", "verify-vlm-queue-backpressure-stability", "verify-vlm-review-action-workflow", "verify-vlm-observation-sidecar", "verify-vlm-privacy-transfer-guard", "verify-vlm-summary-search-candidates", "verify-vlm-rule-suggestion-candidates", "verify-vlm-rule-suggestion-draft-workflow", "verify-ops-event-action-incident-workflow", "verify-ops-alert-delivery-integrations", "verify-v250-incident-text-projection", "verify-v250-incident-memory-index", "verify-v250-ops-events-semantic-search-ui", "verify-v250-incident-timeline-graph", "verify-v250-explainable-incident-brief", "verify-v250-similar-incident-lookup", "verify-v250-client-safe-incident-digest", "verify-v250-redacted-incident-evidence-bundle", "verify-v250-owner-release-readiness", "verify-v260-incident-memory-productization", "verify-v260-rule-suggestion-review", "verify-v260-onvif-credential-gate", "verify-v260-runtime-dashboard-trends", "verify-v260-scenario-cross-zone-reentry", "verify-v260-owner-release-readiness", "verify-v270-incident-triage-board", "verify-v270-incident-decision-scorecard", "verify-v270-operational-action-pack", "verify-v270-rule-what-if-preview", "verify-v270-operator-outcome-memory", "verify-v270-owner-release-readiness", "verify-release-metadata", "verify-v280-incident-action-readiness-queue", "verify-v280-approval-gated-rule-draft", "verify-v280-evidence-intake-field-readiness", "verify-v280-runtime-evidence-window", "verify-v280-client-safe-followup-digest", "verify-v280-owner-release-readiness", "verify-v290-final-contract-freeze", "verify-v290-v28-regression-bundle", "verify-v290-2x-compatibility-baseline", "verify-v290-release-test-records-enforcement", "verify-v290-ui-fulltest-criteria-freeze", "verify-v290-release-evidence-hygiene", "verify-v290-public-docs-assets-refresh", "verify-v290-final-stabilization-run", "verify-v290-owner-release-readiness", "verify-v300-entry-baseline", "verify-v300-event-evidence-contract", "verify-v300-feature-schema-privacy", "verify-v300-vlm-feature-queue", "verify-v300-feature-only-retention", "verify-v300-search-dsl-query-convert", "verify-v300-feature-search-index", "verify-v300-ops-events-ui", "verify-v300-retention-pin-cleanup", "verify-v300-stabilization-release-readiness", "verify-v310-entry-baseline", "verify-v310-event-clip-contract", "verify-v310-replay-timeline-ui", "verify-v310-client-safe-event-digest", "verify-v310-scoped-integrator-search-api", "verify-v310-operator-feature-correction", "verify-v310-optional-vector-search", "verify-v310-retention-export-hardening", "verify-v310-stabilization-release-readiness", "verify-v320-entry-baseline", "verify-v320-resolution-state-contract", "verify-v320-unified-ops-events-workspace", "verify-v320-evidence-quality-layer", "verify-v320-source-reliability-context", "verify-v320-source-reliability-runtime-sample", "verify-v320-ai-review-quality-context", "verify-v320-operator-resolution-flow", "verify-v320-action-readiness-checklist", "verify-v320-client-safe-resolution-digest", "verify-v320-resolution-search-metrics", "verify-v320-stabilization-release-readiness", "verify-v330-entry-baseline", "verify-v330-source-registry-snapshot-identity", "verify-v330-source-onboarding-quality-summary", "verify-v330-reliability-timeline-health-history", "verify-v330-incident-source-correlation-layer", "verify-v330-operator-recheck-recovery-queue", "verify-v330-client-safe-source-status-digest", "verify-v330-operator-runbook-reliability-handoff", "verify-v330-source-reliability-search-metrics", "verify-v330-ops-backup-recovery-source-handoff", "verify-v330-stabilization-release-readiness", "verify-v340-entry-baseline", "verify-v340-continuity-drill-contract", "verify-v340-recovery-candidate-package", "verify-v340-staging-restore-validation-harness", "verify-v340-source-health-replay-drift-diff", "verify-v340-ops-continuity-drill-workspace-ui", "verify-v340-approval-gated-recovery-checklist-audit", "verify-v340-client-safe-maintenance-digest", "verify-v340-drill-evidence-export-cleanup-manifest", "verify-v340-field-bridge-condition-gates", "verify-v340-stabilization-release-readiness", "verify-v350-entry-baseline", "verify-v350-live-operations-graph-contract", "verify-v350-operations-command-plan-contract", "verify-v350-incident-to-command-handoff", "verify-v350-staged-change-plan-impact-preview", "verify-v350-ops-command-workspace-ui", "verify-v350-drill-run-ledger-plan-comparison", "verify-v350-client-impact-forecast", "verify-v350-client-safe-operations-notice", "verify-v350-operations-export-bundle-handoff-map", "verify-v350-field-evidence-intake", "verify-v350-vlm-assisted-ops-explanation", "verify-v350-stabilization-release-readiness"],
  OPS: ["verify-release-metadata", "verify-docs-links", "verify-docs-ui-assets", "verify-v230-ops-backup-recovery-lifecycle", "verify-ops-backup-recovery-guide", "verify-ops-backup-restore-dry-run", "verify-ops-evidence-retention-cleanup", "verify-v250-owner-release-readiness", "verify-v260-owner-release-readiness", "verify-v270-owner-release-readiness", "verify-v280-owner-release-readiness", "verify-v290-final-contract-freeze", "verify-v290-v28-regression-bundle", "verify-v290-2x-compatibility-baseline", "verify-v290-release-test-records-enforcement", "verify-v290-ui-fulltest-criteria-freeze", "verify-v290-release-evidence-hygiene", "verify-v290-public-docs-assets-refresh", "verify-v290-final-stabilization-run", "verify-v290-owner-release-readiness", "verify-v300-entry-baseline", "verify-v300-event-evidence-contract", "verify-v300-feature-schema-privacy", "verify-v300-vlm-feature-queue", "verify-v300-feature-only-retention", "verify-v300-search-dsl-query-convert", "verify-v300-feature-search-index", "verify-v300-ops-events-ui", "verify-v300-retention-pin-cleanup", "verify-v300-stabilization-release-readiness", "verify-v310-entry-baseline", "verify-v310-event-clip-contract", "verify-v310-replay-timeline-ui", "verify-v310-scoped-integrator-search-api", "verify-v310-operator-feature-correction", "verify-v310-optional-vector-search", "verify-v310-retention-export-hardening", "verify-v310-stabilization-release-readiness", "verify-v320-entry-baseline", "verify-v320-resolution-state-contract", "verify-v320-unified-ops-events-workspace", "verify-v320-evidence-quality-layer", "verify-v320-source-reliability-context", "verify-v320-source-reliability-runtime-sample", "verify-v320-ai-review-quality-context", "verify-v320-operator-resolution-flow", "verify-v320-action-readiness-checklist", "verify-v320-client-safe-resolution-digest", "verify-v320-resolution-search-metrics", "verify-v320-stabilization-release-readiness", "verify-v330-entry-baseline", "verify-v330-source-registry-snapshot-identity", "verify-v330-source-onboarding-quality-summary", "verify-v330-reliability-timeline-health-history", "verify-v330-incident-source-correlation-layer", "verify-v330-operator-recheck-recovery-queue", "verify-v330-client-safe-source-status-digest", "verify-v330-operator-runbook-reliability-handoff", "verify-v330-source-reliability-search-metrics", "verify-v330-ops-backup-recovery-source-handoff", "verify-v330-stabilization-release-readiness", "verify-v340-entry-baseline", "verify-v340-continuity-drill-contract", "verify-v340-recovery-candidate-package", "verify-v340-staging-restore-validation-harness", "verify-v340-source-health-replay-drift-diff", "verify-v340-ops-continuity-drill-workspace-ui", "verify-v340-approval-gated-recovery-checklist-audit", "verify-v340-client-safe-maintenance-digest", "verify-v340-drill-evidence-export-cleanup-manifest", "verify-v340-field-bridge-condition-gates", "verify-v340-stabilization-release-readiness", "verify-v350-entry-baseline", "verify-v350-live-operations-graph-contract", "verify-v350-operations-command-plan-contract", "verify-v350-incident-to-command-handoff", "verify-v350-staged-change-plan-impact-preview", "verify-v350-ops-command-workspace-ui", "verify-v350-drill-run-ledger-plan-comparison", "verify-v350-client-impact-forecast", "verify-v350-client-safe-operations-notice", "verify-v350-operations-export-bundle-handoff-map", "verify-v350-field-evidence-intake", "verify-v350-vlm-assisted-ops-explanation", "verify-v350-stabilization-release-readiness"],
};

const v360VerifierCoverage = {
  UI: [
    "verify-v360-ops-simulation-workspace-ui",
    "verify-v360-simulation-run-ledger-comparison",
    "verify-v360-client-notice-preview",
    "verify-v360-rule-va-what-if-replay-pack",
    "verify-v360-simulation-export-bundle",
    "verify-v360-field-evidence-simulation-adapter",
    "verify-v360-vlm-assisted-simulation-explanation",
  ],
  SRC: [
    "verify-v360-simulation-input-contract",
    "verify-v360-command-plan-dry-run-simulator",
    "verify-v360-source-rule-impact-diff",
    "verify-v360-field-evidence-simulation-adapter",
    "verify-v360-vlm-assisted-simulation-explanation",
  ],
  RULE: [
    "verify-v360-command-plan-dry-run-simulator",
    "verify-v360-source-rule-impact-diff",
    "verify-v360-rule-va-what-if-replay-pack",
  ],
  EVT: [
    "verify-v360-simulation-input-contract",
    "verify-v360-rule-va-what-if-replay-pack",
    "verify-v360-vlm-assisted-simulation-explanation",
  ],
  CLIENT: [
    "verify-v360-source-rule-impact-diff",
    "verify-v360-client-notice-preview",
  ],
  MEDIA: [
    "verify-v360-field-evidence-simulation-adapter",
  ],
  LAB: [
    "verify-v360-operations-simulation-run-contract",
    "verify-v360-simulation-run-ledger-comparison",
    "verify-v360-rule-va-what-if-replay-pack",
    "verify-v360-simulation-export-bundle",
    "verify-v360-field-evidence-simulation-adapter",
    "verify-v360-vlm-assisted-simulation-explanation",
  ],
  SAFE: [
    "verify-v360-entry-baseline",
    "verify-v360-simulation-input-contract",
    "verify-v360-operations-simulation-run-contract",
    "verify-v360-command-plan-dry-run-simulator",
    "verify-v360-source-rule-impact-diff",
    "verify-v360-safe-apply-readiness-gate",
    "verify-v360-ops-simulation-workspace-ui",
    "verify-v360-simulation-run-ledger-comparison",
    "verify-v360-client-notice-preview",
    "verify-v360-rule-va-what-if-replay-pack",
    "verify-v360-simulation-export-bundle",
    "verify-v360-field-evidence-simulation-adapter",
    "verify-v360-vlm-assisted-simulation-explanation",
    "verify-v360-stabilization-release-readiness",
  ],
  OPS: [
    "verify-v360-entry-baseline",
    "verify-v360-simulation-input-contract",
    "verify-v360-operations-simulation-run-contract",
    "verify-v360-command-plan-dry-run-simulator",
    "verify-v360-source-rule-impact-diff",
    "verify-v360-safe-apply-readiness-gate",
    "verify-v360-ops-simulation-workspace-ui",
    "verify-v360-simulation-run-ledger-comparison",
    "verify-v360-client-notice-preview",
    "verify-v360-rule-va-what-if-replay-pack",
    "verify-v360-simulation-export-bundle",
    "verify-v360-field-evidence-simulation-adapter",
    "verify-v360-vlm-assisted-simulation-explanation",
    "verify-v360-stabilization-release-readiness",
  ],
};

for (const [prefix, verifiers] of Object.entries(v360VerifierCoverage)) {
  stabilityVerifierByPrefix[prefix].push(...verifiers);
}

check("inventory row count is stable", () => {
  const declaredTotal = summaryCount(inventory, "전체 기능 항목");
  assert(rows.length === declaredTotal, `expected ${declaredTotal} feature rows, found ${rows.length}`);
  assert(new Set(rows.map(row => row.id)).size === rows.length, "duplicate feature ID exists");
});

check("inventory uses only the four approved test areas", () => {
  const allowedAreas = new Set(["안정화", "30분", "120분", "UI"]);
  for (const row of rows) {
    for (const area of splitAreas(row.area)) {
      assert(allowedAreas.has(area), `feature ${row.id} uses unsupported test area: ${area}`);
    }
  }
  const featureAreaText = rows.map(row => row.area).join("\n");
  for (const forbidden of ["필드 별도", "field 별도", "30분 조건부", "120분 조건부", "field-smoke-or-exclusion"]) {
    assert(!featureAreaText.includes(forbidden), `inventory must not contain unsupported test area wording: ${forbidden}`);
  }
});

check("coverage docs and server command are wired", () => {
  const docs = [
    readText("docs/project-feature-test-inventory.md"),
    readText("docs/stream-verification.md"),
    readText("docs/development-backlog.md"),
  ].join("\n");
  const server = readText("server.sh");
  for (const snippet of [
    "verify-feature-inventory-coverage",
    "media-server.feature-inventory-coverage.v1",
    "missing coverage target",
    "누락 ID는 release gate에서 FAIL",
  ]) {
    assert(docs.includes(snippet), `docs missing coverage snippet: ${snippet}`);
  }
  assert(server.includes("verify-feature-inventory-coverage"), "server.sh missing coverage command");
  assert(server.includes("verify_feature_inventory_coverage.mjs"), "server.sh missing coverage script dispatch");
});

check("all feature IDs have coverage targets", () => {
  const report = buildCoverageReport(rows, stabilityVerifierByPrefix);
  assert(report.summary.missing === 0, `missing coverage targets: ${report.summary.missing}`);
});

check("negative missing-ID fixture fails", () => {
  const brokenMap = { ...stabilityVerifierByPrefix, UI: [] };
  const brokenRow = { ...rows.find(row => row.id === "UI-001"), area: "안정화" };
  const report = buildCoverageReport([brokenRow], brokenMap);
  assert(report.summary.missing === 1, `negative fixture should have one missing row, got ${report.summary.missing}`);
  assert(report.items[0].status === "FAIL", "negative fixture row must be FAIL");
});

const report = buildCoverageReport(rows, stabilityVerifierByPrefix);
if (args.report) writeText(args.report, renderMarkdown(report));
if (args.jsonReport) writeText(args.jsonReport, `${JSON.stringify(report, null, 2)}\n`);

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

console.log("");
console.log("== Feature inventory coverage summary ==");
console.log(`- featureRows: ${rows.length}`);
console.log(`- covered: ${report.summary.covered}`);
console.log(`- missing: ${report.summary.missing}`);
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
if (fail > 0) process.exit(1);

function parseArgs(argsList) {
  const parsed = {};
  for (let index = 0; index < argsList.length; index += 1) {
    const token = argsList[index];
    if (token.startsWith("--report=")) parsed.report = token.slice("--report=".length);
    else if (token === "--report") parsed.report = argsList[++index];
    else if (token.startsWith("--json-report=")) parsed.jsonReport = token.slice("--json-report=".length);
    else if (token === "--json-report") parsed.jsonReport = argsList[++index];
  }
  return parsed;
}

function buildCoverageReport(featureRows, verifierMap) {
  const items = featureRows.map(row => {
    const targets = coverageTargets(row, verifierMap);
    return {
      id: row.id,
      feature: row.feature,
      area: row.area,
      targets,
      status: targets.length > 0 ? "PASS" : "FAIL",
      reason: targets.length > 0 ? "" : "missing coverage target",
    };
  });
  return {
    schema: "media-server.feature-inventory-coverage.v1",
    generatedAt: new Date().toISOString(),
    summary: {
      total: items.length,
      covered: items.filter(item => item.status === "PASS").length,
      missing: items.filter(item => item.status === "FAIL").length,
    },
    items,
  };
}

function coverageTargets(row, verifierMap) {
  const targets = [];
  const prefix = row.id.split("-", 1)[0];
  if (hasArea(row.area, "안정화")) {
    for (const verifier of verifierMap[prefix] || []) {
      targets.push({ kind: "stability", command: `./server.sh ${verifier}` });
    }
  }
  if (hasArea(row.area, "UI")) {
    targets.push({ kind: "manual-ui-fulltest", document: "docs/manual-ui-fulltest.md + docs/manual-ui-checklist.md" });
  }
  if (hasArea(row.area, "30분")) {
    targets.push({ kind: "30-minute", command: "./server.sh verify-predev --soak-minutes 30", approval: "required" });
  }
  if (hasArea(row.area, "120분")) {
    targets.push({ kind: "120-minute", command: "./server.sh verify-predev --soak-minutes 120", approval: "required" });
    targets.push({ kind: "120-minute", command: "./server.sh verify-va-runtime-console-longrun --duration-minutes 120", approval: "conditional" });
  }
  return targets;
}

function parseFeatureRows(text) {
  return text
    .split(/\r?\n/)
    .filter(line => /^\| (UI|AUTH|SRC|RULE|EVT|CLIENT|MEDIA|LAB|SAFE|OPS)-\d+ \|/.test(line))
    .map(line => {
      const cells = line.split("|").slice(1, -1).map(cell => cell.trim());
      return {
        id: cells[0] || "",
        feature: cells[1] || "",
        uiNeed: cells[2] || "",
        testNeed: cells[3] || "",
        area: cells[4] || "",
        pass: cells[5] || "",
      };
    });
}

function hasArea(area, token) {
  return splitAreas(area).includes(token);
}

function splitAreas(area) {
  return area.split(",").map(item => item.trim()).filter(Boolean);
}

function summaryCount(text, label) {
  const pattern = new RegExp(`^\\| ${escapeRegex(label)} \\| (\\d+) \\|$`, "m");
  const match = text.match(pattern);
  assert(match, `missing summary count for ${label}`);
  return Number(match[1]);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function renderMarkdown(report) {
  const lines = [
    "# Feature Inventory Coverage Report",
    "",
    `- schema: ${report.schema}`,
    `- generatedAt: ${report.generatedAt}`,
    `- total: ${report.summary.total}`,
    `- covered: ${report.summary.covered}`,
    `- missing: ${report.summary.missing}`,
    "",
    "| feature ID | feature | area | status | targets | reason |",
    "| --- | --- | --- | --- | --- | --- |",
  ];
  for (const item of report.items) {
    const targets = item.targets.map(target => `${target.kind}:${target.command}`).join("<br>");
    lines.push(`| ${item.id} | ${escapeCell(item.feature)} | ${escapeCell(item.area)} | ${item.status} | ${escapeCell(targets)} | ${escapeCell(item.reason)} |`);
  }
  return `${lines.join("\n")}\n`;
}

function escapeCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function writeText(outputPath, content) {
  const resolved = path.resolve(rootDir, outputPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, content);
}

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
