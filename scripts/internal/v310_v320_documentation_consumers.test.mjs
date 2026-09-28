// 문서 소비자 자체검사. 실제 제품 실행 대신 격리 자식 프로세스의 읽기 값만 변경한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const cases = [
  ['v310_event_clip_contract', 'OPS-062', 'media-server.encoded-event-clip-contract.v1'],
  ['v310_replay_timeline_ui', 'UI-060', 'media-server.ops.v310-replay-timeline-ui.v1'],
  ['v310_client_safe_event_digest', 'CLIENT-025', 'media-server.client.event-digest.v1'],
  ['v310_scoped_integrator_search_api', 'CLIENT-026', 'media-server.integrator.scoped-event-search.v1'],
  ['v310_operator_feature_correction', 'EVT-061', 'media-server.ops.operator-feature-correction.v1'],
  ['v310_optional_vector_search', 'LAB-089', 'media-server.v310-optional-vector-search-report.v1'],
  ['v310_retention_export_hardening', 'EVT-062', 'media-server.v310.retention-export-hardening.v1'],
  ['v320_resolution_state_contract', 'EVT-063', 'media-server.ops.resolution-state.v1'],
  ['v320_unified_ops_events_workspace', 'UI-062', 'media-server.ops.v320-unified-events-workspace.v1'],
  ['v320_evidence_quality_layer', 'UI-063', 'media-server.ops.v320-evidence-quality.v1'],
  ['v320_source_reliability_context', 'UI-064', 'media-server.ops.v320-source-reliability-context.v1'],
  ['v320_ai_review_quality_context', 'UI-065', 'media-server.ops.v320-ai-review-quality-context.v1'],
  ['v320_operator_resolution_flow', 'UI-066', 'media-server.ops.v320-operator-resolution-flow.v1'],
  ['v320_action_readiness_checklist', 'UI-067', 'media-server.ops.v320-action-readiness-checklist.v1'],
  ['v320_client_safe_resolution_digest', 'CLIENT-027', 'media-server.client.resolution-digest.v1'],
  ['v320_resolution_search_metrics', 'UI-069', 'media-server.ops.v320-resolution-search-metrics.v1'],
  ["v330_client_safe_source_status_digest","UI-072","media-server.client.source-status-digest.v1","media-server.client.source-status-digest.v1"],
  ["v330_incident_source_correlation_layer","UI-070","media-server.ops.v330-incident-source-correlation.v1","media-server.ops.v330-incident-source-correlation.v1"],
  ["v330_operator_recheck_recovery_queue","UI-071","media-server.ops.v330-operator-recheck-recovery-queue.v1","media-server.ops.v330-operator-recheck-recovery-queue.v1"],
  ["v330_reliability_timeline_health_history","SRC-035","media-server.ops.v330-reliability-timeline-health-history.v1","/ops/api/source-registry/reliability-timeline"],
  ["v330_source_onboarding_quality_summary","SRC-034","media-server.ops.v330-source-onboarding-quality-summary.v1","/ops/api/source-registry/onboarding-quality"],
  ["v330_source_registry_snapshot_identity","SRC-033","media-server.ops.v330-source-registry-snapshot-identity.v1","/ops/api/source-registry/snapshot"],
  ["v330_source_reliability_search_metrics","UI-073","media-server.ops.v330-source-reliability-search-metrics.v1","/ops/api/source-registry/reliability-search-metrics"],
  ["v340_approval_gated_recovery_checklist_audit","UI-076","media-server.ops.v340-approval-gated-recovery-checklist.v1","/ops/api/source-registry/approval-gated-recovery-checklist"],
  ["v340_client_safe_maintenance_digest","UI-077","media-server.client.v340-maintenance-digest.v1","media-server.client.v340-maintenance-digest.v1"],
  ["v340_continuity_drill_contract","SAFE-125","media-server.ops.v340-continuity-drill-contract.v1","/ops/api/source-registry/continuity-drill/contract"],
  ["v340_drill_evidence_export_cleanup_manifest","UI-078","media-server.ops.v340-drill-evidence-export-cleanup-manifest.v1","/ops/api/source-registry/drill-evidence-export-cleanup-manifest"],
  ["v340_field_bridge_condition_gates","UI-079","media-server.ops.v340-field-bridge-condition-gates.v1","/ops/api/source-registry/field-bridge-condition-gates"],
  ["v340_ops_continuity_drill_workspace_ui","UI-075","media-server.ops.v340-continuity-drill-workspace-ui.v1","media-server.ops.v340-continuity-drill-workspace-ui.v1"],
  ["v340_recovery_candidate_package","SRC-041","media-server.ops.v340-recovery-candidate-package.v1","/ops/api/source-registry/recovery-candidate-package"],
  ["v340_source_health_replay_drift_diff","SRC-042","media-server.ops.v340-source-health-replay-drift-diff.v1","/ops/api/source-registry/source-health-replay-drift-diff"],
  ["v350_client_impact_forecast","UI-083","media-server.client.v350-impact-forecast.v1","media-server.client.v350-impact-forecast.v1"],
  ["v350_client_safe_operations_notice","UI-084","media-server.client.v350-operations-notice.v1","media-server.client.v350-operations-notice.v1"],
  ["v350_drill_run_ledger_plan_comparison","UI-082","media-server.ops.v350-drill-run-ledger.v1","/ops/api/live-operations/drill-run-ledger"],
  ["v350_field_evidence_intake","UI-086","media-server.ops.v350-field-evidence-intake.v1","/ops/api/live-operations/field-evidence-intake"],
  ["v350_incident_to_command_handoff","UI-080","media-server.ops.v350-incident-command-handoff.v1","media-server.ops.v350-incident-command-handoff.v1"],
  ["v350_live_operations_graph_contract","SRC-044","media-server.ops.v350-live-operations-graph.v1","/ops/api/live-operations/graph"],
  ["v350_operations_command_plan_contract","SRC-045","media-server.ops.v350-command-plan.v1","/ops/api/live-operations/command-plan"],
  ["v350_operations_export_bundle_handoff_map","UI-085","media-server.ops.v350-export-bundle-handoff-map.v1","/ops/api/live-operations/export-bundle-handoff-map"],
  ["v350_ops_command_workspace_ui","UI-081","media-server.ops.v350-command-workspace-ui.v1","media-server.ops.v350-command-workspace-ui.v1"],
  ["v350_staged_change_plan_impact_preview","SRC-046","media-server.ops.v350-staged-change-plan-impact-preview.v1","/ops/api/live-operations/staged-change-plan-impact-preview"],
  ["v350_vlm_assisted_ops_explanation","UI-087","media-server.ops.v350-vlm-assisted-explanation.v1","/ops/api/live-operations/vlm-assisted-explanation"],
  ["v360_client_notice_preview","UI-090","media-server.ops.v360-client-notice-preview.v1","/ops/api/live-operations/simulation/client-notice-preview"],
  ["v360_command_plan_dry_run_simulator","SRC-050","media-server.ops.v360-command-plan-dry-run.v1","/ops/api/live-operations/simulation/command-plan-dry-run"],
  ["v360_field_evidence_simulation_adapter","UI-093","media-server.ops.v360-field-evidence-simulation-adapter.v1","/ops/api/live-operations/simulation/field-evidence-adapter"],
  ["v360_operations_simulation_run_contract","LAB-095","media-server.ops.v360-simulation-run-contract.v1","/ops/api/live-operations/simulation/run-contract"],
  ["v360_ops_simulation_workspace_ui","UI-088","media-server.ops.v360-simulation-workspace-ui.v1","media-server.ops.v360-simulation-workspace-ui.v1"],
  ["v360_rule_va_what_if_replay_pack","UI-091","media-server.ops.v360-rule-va-what-if-replay-pack.v1","/ops/api/live-operations/simulation/rule-va-what-if-replay-pack"],
  ["v360_safe_apply_readiness_gate","SAFE-153","media-server.ops.v360-safe-apply-readiness.v1","/ops/api/live-operations/simulation/safe-apply-readiness"],
  ["v360_simulation_export_bundle","UI-092","media-server.ops.v360-simulation-export-bundle.v1","/ops/api/live-operations/simulation/export-bundle"],
  ["v360_simulation_input_contract","SRC-049","media-server.ops.v360-simulation-input-pack.v1","/ops/api/live-operations/simulation/input-pack"],
  ["v360_simulation_run_ledger_comparison","UI-089","media-server.ops.v360-simulation-run-ledger.v1","/ops/api/live-operations/simulation/run-ledger"],
  ["v360_source_rule_impact_diff","SRC-051","media-server.ops.v360-source-rule-impact-diff.v1","/ops/api/live-operations/simulation/impact-diff"],
  ["v360_vlm_assisted_simulation_explanation","UI-094","media-server.ops.v360-vlm-assisted-simulation-explanation.v1","/ops/api/live-operations/simulation/vlm-assisted-explanation"],
  ["v370_approval_ticket_workflow","LAB-105","media-server.ops.v370-approval-ticket-workflow.v1","/ops/api/site-operations/approval-ticket-workflow"],
  ["v370_client_notice_by_site_view_group","UI-096","media-server.ops.v370-client-notice-by-site-view-group.v1","/ops/api/site-operations/client-notice-by-site-view-group"],
  ["v370_cross_site_safe_apply_readiness","SRC-059","media-server.ops.v370-cross-site-safe-apply-readiness.v1","/ops/api/site-operations/cross-site-safe-apply-readiness"],
  ["v370_export_handoff_bundle","UI-101","media-server.ops.v370-export-handoff-bundle.v1","/ops/api/site-operations/export-handoff-bundle"],
  ["v370_field_evidence_attachment","UI-098","media-server.ops.v370-field-evidence-attachment.v1","/ops/api/site-operations/field-evidence-attachment"],
  ["v370_limited_safe_execution_pilot","UI-099","media-server.ops.v370-limited-safe-execution-pilot.v1","/ops/api/site-operations/limited-safe-execution-pilot"],
  ["v370_outcome_reconciliation","UI-100","media-server.ops.v370-outcome-reconciliation.v1","/ops/api/site-operations/outcome-reconciliation"],
  ["v370_rule_va_what_if_by_site","UI-097","media-server.ops.v370-rule-va-what-if-by-site.v1","/ops/api/site-operations/rule-va-what-if-by-site"],
  ["v370_runbook_instance_ledger","LAB-104","media-server.ops.v370-runbook-instance-ledger.v1","/ops/api/site-operations/runbook-instance-ledger"],
  ["v370_runbook_template_contract","LAB-103","media-server.ops.v370-runbook-template-contract.v1","/ops/api/site-operations/runbook-template-contract"],
  ["v370_site_aware_source_registry_projection","SRC-055","media-server.ops.v370-site-aware-source-registry-projection.v1","/ops/api/site-operations/source-registry-projection"],
  ["v370_site_health_rollup","SRC-056","media-server.ops.v370-site-health-rollup.v1","/ops/api/site-operations/health-rollup"],
  ["v370_site_impact_graph","SRC-057","media-server.ops.v370-site-impact-graph.v1","/ops/api/site-operations/impact-graph"],
  ["v370_site_operations_workspace_ui","UI-095","media-server.ops.v370-site-operations-workspace-ui.v1","media-server.ops.v370-site-operations-workspace-ui.v1"],
  ["v370_site_simulation_input_pack","SRC-058","media-server.ops.v370-site-simulation-input-pack.v1","/ops/api/site-operations/simulation-input-pack"],
  ["v370_site_source_group_contract","SRC-054","media-server.ops.v370-site-source-group-contract.v1","/ops/api/site-operations/source-group-contract"],
  ["v380_action_capability_contract","LAB-112","media-server.ops.v380-action-capability-contract.v1","/ops/api/actions/capability-contract"],
  ["v380_action_readiness_preflight","LAB-115","media-server.ops.v380-action-readiness-preflight.v1","/ops/api/actions/readiness-preflight"],
  ["v380_action_receipt_bundle","UI-105","media-server.ops.v380-action-receipt-bundle.v1","/ops/api/actions/receipt-bundle"],
  ["v380_action_request_ledger_contract","LAB-113","media-server.ops.v380-action-request-ledger-contract.v1","/ops/api/actions/request-ledger"],
  ["v380_approval_decision_gate","LAB-114","media-server.ops.v380-approval-decision-gate.v1","/ops/api/actions/approval-decision-gate"],
  ["v380_client_notice_draft_queue","LAB-117","media-server.ops.v380-client-notice-draft-queue.v1","/ops/api/actions/client-notice-draft-queue"],
  ["v380_client_safe_action_notice_preview","UI-103","media-server.client.v380-action-notice-preview.v1","media-server.client.v380-action-notice-preview.v1"],
  ["v380_default_off_action_explanation","UI-107","media-server.ops.v380-default-off-action-explanation.v1","/ops/api/actions/default-off-explanation"],
  ["v380_field_connector_evidence_package","UI-106","media-server.ops.v380-field-connector-evidence-package.v1","/ops/api/actions/field-connector-evidence-package"],
  ["v380_ops_action_control_workspace_ui","UI-102","media-server.ops.v380-action-control-workspace-ui.v1","media-server.ops.v380-action-control-workspace-ui.v1"],
  ["v380_ops_action_route_boundary","LAB-111","media-server.ops.v380-action-route-boundary.v1","/ops/api/actions/route-boundary"],
  ["v380_outcome_observer_reconciliation","UI-104","media-server.ops.v380-outcome-observer-reconciliation.v1","/ops/api/actions/outcome-reconciliation"],
  ["v380_rule_draft_action_package","LAB-118","media-server.ops.v380-rule-draft-action-package.v1","/ops/api/actions/rule-draft-package"],
  ["v380_source_recheck_action_pilot","LAB-116","media-server.ops.v380-source-recheck-action-pilot.v1","/ops/api/actions/source-recheck-pilot"],
];
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
function snapshot() {
  return Object.fromEntries(['src', 'include', 'test/fixtures'].flatMap(dir => fs.readdirSync(root + dir, {recursive: true})
    .map(name => dir + '/' + name).filter(name => fs.statSync(root + name).isFile()))
    .map(name => [name, sha(fs.readFileSync(root + name))]));
}
function invoke(name, mutation = {}) {
  const code = String.raw`
    import fs from 'node:fs'; import path from 'node:path'; import {pathToFileURL} from 'node:url';
    const root = ${JSON.stringify(root)}, mutation = ${JSON.stringify(mutation)};
    const original = fs.readFileSync;
    fs.readFileSync = function(file, options) {
      const relative = path.relative(root, String(file));
      if (['docs/release-test-records.md','docs/release-evidence-index.md','docs/development-backlog.md','docs/README.md'].includes(relative)) throw new Error('종료 기록/직접 색인 의존: ' + relative);
      let value = original.call(this, file, options);
      if (typeof value !== 'string') return value;
      if (relative.startsWith('docs/') && relative.endsWith('.md')) value = value.replace(/^#{1,6} .*$/gm, '# 변경 가능한 제목');
      if (mutation.schema && (relative.startsWith('src/') || relative.startsWith('include/'))) value = value.replaceAll(mutation.schema, 'missing-contract-schema');
      if (mutation.removeId && relative === 'docs/project-feature-test-inventory.md') value = value.split('\n').filter(line => !line.startsWith('| ' + mutation.removeId + ' |')).join('\n');
      if (mutation.manual && relative === 'docs/manual-ui-checklist.md') value = '';
      if (mutation.identifier && relative === 'docs/project-feature-test-inventory.md') value = value.replaceAll(mutation.identifier, 'missing-current-contract');
      if (mutation.currentDocIdentifier && relative.startsWith('docs/') && relative !== 'docs/project-feature-test-inventory.md') value = value.replaceAll(mutation.currentDocIdentifier, 'missing-current-contract');
      if (mutation.fixturePath === relative) {
        const parsed = JSON.parse(value);
        if (mutation.rawPrompt) parsed.cases[0].observation.redactionReview.rawPromptStored = true;
        else parsed.contractInvariants.runtimeVlmCallPerformed = true;
        value = JSON.stringify(parsed);
      }
      if (mutation.mapping && relative === 'test/fixtures/project_feature_implementation_evidence.json') {
        const parsed = JSON.parse(value); parsed.items.find(item => item.id === mutation.mapping).verifierEvidence.command = 'verify-wrong-command'; value = JSON.stringify(parsed);
      }
      if (mutation.anchor && relative === 'test/fixtures/project_feature_implementation_evidence.json') {
        const parsed = JSON.parse(value); parsed.items.find(item => item.id === 'UI-069').verifierEvidence.anchor = 'UI-069'; value = JSON.stringify(parsed);
      }
      if (mutation.duplicate && relative === 'scripts/internal/verify_v320_resolution_search_metrics.mjs') value += '\nassertIncludes(searchMetricsBlock, "media-server.ops.v320-resolution-search-metrics.v1", "UI-069 block-scoped canonical product state");\n';
      if (mutation.control && relative === 'src/ingress/product_ui_server_pages.cpp') value = value.replaceAll(typeof mutation.control === 'string' ? mutation.control : 'ops-v320-unified-events-workspace', 'removed-workspace-control');
      if (mutation.functionBody && relative === 'src/ingress/webrtc_http_server_ops_workflows.cpp') {
        const {signature, token} = mutation.functionBody;
        const start = value.indexOf('std::string ' + signature + '(');
        if (start < 0) throw new Error('반례 준비 함수 없음: ' + signature);
        const end = value.indexOf('// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN', start);
        if (end < 0) throw new Error('반례 준비 함수 경계 없음: ' + signature);
        const body = value.slice(start, end);
        if (!body.includes(token)) throw new Error('반례 준비 token 없음: ' + token);
        value = value.slice(0, start) + body.replaceAll(token, 'removed-function-obligation') + value.slice(end);
      }
      if (mutation.handoffAnchor && relative === 'test/fixtures/project_feature_implementation_evidence.json') {
        const parsed = JSON.parse(value); parsed.items.find(item => item.id === 'UI-080').verifierEvidence.anchor = 'UI-080'; value = JSON.stringify(parsed);
      }
      if (mutation.handoffDuplicate && relative === 'scripts/internal/verify_v350_incident_to_command_handoff.mjs') value += '\nassertIncludes(extractNamedFunctionBlock(files.uiScript, "renderV350IncidentCommandHandoff"), "incidentCommandHandoff", "UI-080 block-scoped canonical product state");\n';
      if (mutation.pin && relative === 'src/analysis/event_retention_cleanup.cpp') value = value.replaceAll('item.pinned && request.policy.pinned_excludes_automatic_cleanup', 'item.pinned && !request.policy.pinned_excludes_automatic_cleanup');
      if (mutation.identity && relative === 'test/fixtures/v310_optional_vector_search/cases.json') {
        const parsed = JSON.parse(value); parsed.cases[0].contractInvariants.identityEmbeddingIndexed = true; value = JSON.stringify(parsed);
      }
      return value;
    };
    for (const key of ['writeFileSync','appendFileSync','unlinkSync','rmSync','renameSync','mkdirSync']) fs[key] = () => {throw new Error('정적 검사의 파일 변경 금지');};
    await import(pathToFileURL(path.join(root, 'scripts/internal/verify_' + ${JSON.stringify(name)} + '.mjs')).href);
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', code], {cwd: root, encoding: 'utf8', timeout: 15000, maxBuffer: 4 * 1024 * 1024});
  assert.equal(result.error, undefined); assert.equal(result.signal, null);
  return result;
}
function rejected(result, reason) {
  assert.equal(result.status, 1, result.stderr + result.stdout);
  const output = result.stdout + result.stderr;
  assert(/\[fail\]/i.test(output) && output.includes(reason), output);
}
test('V31-V38-DOC 기능 문서 소비자', async t => {
  const before = snapshot();
  try {
    for (const [name, id, schema, identifier] of cases) {
      await t.test('01 종료 기록 없이 정상 ' + name, () => {
        const result = invoke(name); assert.equal(result.status, 0, result.stderr + result.stdout);
        assert(result.stdout.includes('uiFulltest: not-run-by-this-command'));
        assert(result.stdout.includes('longrun30Or120: not-run-by-this-command'));
      });
      await t.test('02 현재 정의 누락 거부 ' + id, () => rejected(invoke(name, {removeId: id}), id));
      await t.test('03 기존 제품 계약 검사 실패 전파 ' + name, () => rejected(invoke(name, {schema}), schema));
      if (identifier) await t.test('08 현행 문서 계약 식별자 누락 거부 ' + name, () => rejected(invoke(name, {identifier}), identifier));
    }
    for (const name of ['v310_client_safe_event_digest','v310_operator_feature_correction','v320_client_safe_resolution_digest',
      'v330_client_safe_source_status_digest',
      'v340_approval_gated_recovery_checklist_audit',
      'v340_client_safe_maintenance_digest',
      'v340_drill_evidence_export_cleanup_manifest',
      'v340_field_bridge_condition_gates',
      'v340_ops_continuity_drill_workspace_ui',
    ]) {
      await t.test('04 실제 UI 정의 연결 유지 ' + name, () => rejected(invoke(name, {manual: true}), 'manual UI'));
    }
    for (const [name, id] of [['v310_replay_timeline_ui','SAFE-095'], ['v310_operator_feature_correction','SAFE-098'], ['v320_source_reliability_context','EVT-066'],
      ["v330_client_safe_source_status_digest","SRC-038"],
      ["v330_incident_source_correlation_layer","SRC-036"],
      ["v330_operator_recheck_recovery_queue","SRC-037"],
      ["v330_reliability_timeline_health_history","SRC-035"],
      ["v330_source_onboarding_quality_summary","SRC-034"],
      ["v330_source_registry_snapshot_identity","SRC-033"],
      ["v330_source_reliability_search_metrics","SRC-039"],
      ["v340_field_bridge_condition_gates","SRC-043"],
    ]) {
      await t.test('05 독립 인증/런타임 연결 유지 ' + id, () => rejected(invoke(name, {mapping: id}), id));
    }
    for (const [name, id] of [["v350_field_evidence_intake","SRC-047"],["v350_live_operations_graph_contract","SRC-044"],["v350_operations_command_plan_contract","SRC-045"],["v350_staged_change_plan_impact_preview","SRC-046"],["v350_staged_change_plan_impact_preview","RULE-106"],["v350_vlm_assisted_ops_explanation","SRC-048"],["v360_command_plan_dry_run_simulator","SRC-050"],["v360_field_evidence_simulation_adapter","SRC-052"],["v360_safe_apply_readiness_gate","SAFE-153"],["v360_safe_apply_readiness_gate","OPS-120"],["v360_simulation_input_contract","SRC-049"],["v360_source_rule_impact_diff","SRC-051"],["v360_source_rule_impact_diff","SAFE-152"],["v360_vlm_assisted_simulation_explanation","SRC-053"],["v370_cross_site_safe_apply_readiness","SRC-059"],["v370_cross_site_safe_apply_readiness","SAFE-168"],["v370_cross_site_safe_apply_readiness","OPS-135"],["v370_field_evidence_attachment","SRC-060"],["v370_limited_safe_execution_pilot","SRC-061"],["v370_outcome_reconciliation","SRC-062"],["v370_site_aware_source_registry_projection","SRC-055"],["v370_site_health_rollup","SRC-056"],["v370_site_impact_graph","SRC-057"],["v370_site_simulation_input_pack","SRC-058"],["v370_site_source_group_contract","SRC-054"],["v380_default_off_action_explanation","SRC-064"],["v380_field_connector_evidence_package","SRC-063"]]) {
      await t.test('09 독립 API 실행 연결 유지 ' + id, () => rejected(invoke(name, {mapping: id}), id));
    }
    for (const [name, signature, token] of [["v350_drill_run_ledger_plan_comparison","OpsV350DrillRunLedgerPlanComparisonJson","drillRunWritePerformed"],["v350_field_evidence_intake","OpsV350FieldEvidenceIntakeJson","fieldSmokeExecuted"],["v350_operations_export_bundle_handoff_map","OpsV350OperationsExportBundleHandoffMapJson","artifactExportExecuted"],["v350_vlm_assisted_ops_explanation","OpsV350VlmAssistedOpsExplanationJson","BuildV350LiveOperationsGraphContext"],["v360_client_notice_preview","OpsV360ClientNoticePreviewJson","BuildV360CommandPlanDryRunResults"],["v360_rule_va_what_if_replay_pack","OpsV360RuleVaWhatIfReplayPackJson","BuildV360SourceRuleImpactDiffs"],["v360_simulation_export_bundle","OpsV360SimulationExportBundleJson","fileWritePerformed"],["v360_simulation_run_ledger_comparison","OpsV360SimulationRunLedgerComparisonJson","simulationRunPersisted"]]) {
      await t.test('10 대상 함수 의무 누락 거부 ' + name, () => rejected(invoke(name, {functionBody: {signature, token}}), token));
    }
    for (const [name, control] of [['v350_ops_command_workspace_ui', 'ops-command-workspace'], ['v380_ops_action_control_workspace_ui', 'ops-action-control-workspace']]) {
      await t.test('10 분리된 UI 입력 검사 ' + name, () => rejected(invoke(name, {control}), control));
    }
    await t.test('10 UI-080 구형 anchor 거부', () => rejected(invoke('v350_incident_to_command_handoff', {handoffAnchor: true}), 'UI-080'));
    await t.test('10 UI-080 중복 assertion 거부', () => rejected(invoke('v350_incident_to_command_handoff', {handoffDuplicate: true}), 'one location'));
    await t.test('06 pin 보호 반례', () => rejected(invoke('v310_retention_export_hardening', {pin: true}), 'pinned'));
    await t.test('06 신원 embedding 반례', () => rejected(invoke('v310_optional_vector_search', {identity: true}), 'identity embedding'));
    await t.test('07 분리된 UI control 누락 거부', () => rejected(invoke('v320_unified_ops_events_workspace', {control: true}), 'ops-v320-unified-events-workspace'));
    await t.test('07 구형 ID anchor 거부', () => rejected(invoke('v320_resolution_search_metrics', {anchor: true}), 'UI-069'));
    await t.test('07 중복 assertion 위치 거부', () => rejected(invoke('v320_resolution_search_metrics', {duplicate: true}), 'one location'));
  } finally {
    assert.deepEqual(snapshot(), before, '실제 제품/fixture는 불변이어야 함');
  }
});

test('VLM-DOC 현행 계약과 종료 기록 분리', async t => {
  const cases = [
    ['evaluation_result_workflow', 'LAB-059', 'media-server.ops.vlm-evaluation-result-workflow.v1'],
    ['event_evidence_extraction', 'EVT-027', 'media-server.vlm-event-evidence-refs.v1'],
    ['privacy_transfer_guard', 'UI-024', 'media-server.vlm-privacy-transfer-guard.v1'],
    ['profile_storage', 'SAFE-023', 'media-server.vlm-profile.v1'],
    ['summary_search_candidates', 'EVT-032', 'media-server.vlm-summary-search-candidates.v1'],
    ['runtime_opt_in_contract', 'SAFE-025', 'media-server.vlm-runtime-opt-in-contract.v1'],
    ['observation_sidecar', 'LAB-040', 'media-server.vlm-observation.v1'],
    ['rule_suggestion_draft_workflow', 'UI-036', 'media-server.vlm-rule-suggestion-draft-workflow.v1'],
    ['install_connection_ui', 'UI-022', '/ops/api/vlm/install-connection/dry-run'],
    ['rule_suggestion_candidates', 'EVT-033', 'media-server.vlm-rule-suggestion-candidates.v1'],
    ['review_action_workflow', 'LAB-060', 'media-server.ops.vlm-review-action-state.v1'],
    ['runtime_status_ui', 'UI-033', '/ops/api/runtime/status'],
  ];
  const before = snapshot();
  try {
    for (const [name, id, identifier] of cases) {
      await t.test('01 역사 자료 없이 정상 ' + name, () => {
        const r = invoke('vlm_' + name);
        assert.equal(r.status, 0, r.stderr + r.stdout);
        assert(r.stdout.includes('uiFulltest: not-run-by-this-command'));
        assert(r.stdout.includes('longrun30Or120: not-run-by-this-command'));
      });
      await t.test('02 현행 ID 누락 ' + name, () => rejected(invoke('vlm_' + name, {removeId: id}), id));
      await t.test('03 현행 문서 식별자 누락 ' + name, () => rejected(invoke('vlm_' + name, {currentDocIdentifier: identifier}), identifier));
      const sourceFailure = name === 'rule_suggestion_draft_workflow' ? 'draft workflow schema' :
        name === 'rule_suggestion_candidates' ? 'candidate builder schema' : identifier;
      await t.test('04 제품 계약 누락 실패 전파 ' + name, () => rejected(invoke('vlm_' + name, {schema: identifier}), sourceFailure));
    }
    for (const [name, id] of [
      ['privacy_transfer_guard', 'LAB-042'], ['summary_search_candidates', 'LAB-043'],
      ['runtime_opt_in_contract', 'SAFE-025'], ['rule_suggestion_draft_workflow', 'SAFE-038'],
      ['rule_suggestion_candidates', 'LAB-044'], ['rule_suggestion_candidates', 'RULE-048'],
      ['rule_suggestion_candidates', 'RULE-066'], ['rule_suggestion_candidates', 'RULE-067'],
      ['rule_suggestion_candidates', 'RULE-068'], ['rule_suggestion_candidates', 'RULE-069'],
    ]) await t.test('05 독립 실행 연결 유지 ' + id, () => rejected(invoke('vlm_' + name, {mapping: id}), id));
    await t.test('06 sidecar 원문 보존 거부', () => rejected(invoke('vlm_observation_sidecar', {
      fixturePath: 'test/fixtures/vlm_observation_store/observations.json', rawPrompt: true,
    }), 'rawPromptStored'));
    await t.test('06 자동 runtime 호출 허용 거부', () => rejected(invoke('vlm_evaluation_result_workflow', {
      fixturePath: 'test/fixtures/vlm_evaluation_result_workflow/cases.json',
    }), 'runtimeVlmCallPerformed'));
    await t.test('06 현행 UI control 누락 거부', () => rejected(invoke('vlm_review_action_workflow', {
      control: 'data-vlm-review-action-workflow="ops-only-review-state"',
    }), 'data-vlm-review-action-workflow'));
  } finally {
    assert.deepEqual(snapshot(), before, '실제 제품/fixture 파일 변경 금지');
  }
});
