// 파일 용도: canonical 424 UI case를 native Playwright 실행 manifest로 생성하고 검증한다.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { allowedCompletionSources } from "./v390_ui_completion_oracle_lib.mjs";
import {
  canonicalRequestedProjection,
  expectedRuntimeObservation,
  validateRequestedObservedEnvelope,
} from "./v390_ui_requested_observed_schema.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const nativeExactManifestSchema = "media-server.v390-ui-native-exact-cases.v2";
export const canonicalManifestSchema = "media-server.ui-fulltest-canonical-case-manifest.v1";
export const implementationManifestSchema = "media-server.feature-implementation-evidence.v2";
export const caseNativeWorkflowSchema = "media-server.v390-ui-case-native-workflow.v2";
export const review4WorkflowClasses = Object.freeze([
  "actionable",
  "form-submit",
  "persisted-mutation",
  "read-only-state",
  "hidden-disabled",
  "negative-route",
]);

const dynamicSelectorPattern = /\$\{|<%|\{\{/.source;
const productScreenRoutes = new Set([
  "/",
  "/setup",
  "/login",
  "/logout",
  "/password/change",
  "/invite/setup",
  "/client/request-access",
  "/ops",
  "/ops/home",
  "/ops/dashboard",
  "/ops/sources",
  "/ops/rules",
  "/ops/users",
  "/ops/events",
  "/ops/vlm",
  "/client/live",
  "/client/dashboard",
  "/client/events",
]);

const formContracts = new Map([
  ['[data-testid="auth-setup-form"]', { method: "post", action: "/setup", fields: ["username", "password", "confirm"] }],
  ['[data-testid="auth-login-form"]', { method: "post", action: "/login", fields: ["username", "password"] }],
  ['[data-testid="auth-password-change-form"]', { method: "post", action: "/password/change", fields: ["currentPassword", "password", "confirm"] }],
  ['[data-testid="auth-invite-setup-form"]', { method: "post", action: "/invite/setup", fields: ["token", "password", "confirm"] }],
  ["#request-form", { method: "", action: "", fields: ["username", "displayName", "contact", "viewId", "reason"] }],
]);

const localOnlyMutationCases = new Set([
  "UI-036", "RULE-101", "RULE-102", "CLIENT-002", "CLIENT-005", "SAFE-038",
]);
const forcedPersistedMutationCases = new Set([
  "RULE-011", "RULE-012", "RULE-016", "RULE-030", "RULE-073", "RULE-075",
]);
const endpointActionCases = new Set();
const readOnlyBoundaryCases = new Set(["RULE-007", "RULE-025"]);
const explicitHiddenControlCases = new Set(["RULE-017"]);
const formMutationCases = new Set(["UI-004", "UI-005", "AUTH-036"]);
const supportedAccountRoles = new Set(["anonymous", "admin", "operator", "viewer"]);
const actionRoleOverrides = new Map([
  ["AUTH-014", "admin"],
  ["AUTH-015", "admin"],
  ["AUTH-033", "admin"],
  ["AUTH-037", "admin"],
  ["AUTH-038", "admin"],
  ["AUTH-039", "anonymous"],
]);
const formSubmitOverrides = new Map([
  ["UI-004", {
    selector: '[data-testid="auth-password-change-form"]',
    submitSelector: '[data-testid="auth-password-change-form"] button[type="submit"]',
    route: "/password/change",
    method: "POST",
    path: "/password/change",
    fields: ["currentPassword", "password", "confirm"],
    allowedStatuses: [302],
  }],
  ["UI-005", {
    selector: 'form[action="/logout"]',
    submitSelector: 'form[action="/logout"] button[type="submit"]',
    route: "/ops/home",
    method: "POST",
    path: "/logout",
    fields: [],
    allowedStatuses: [302],
  }],
  ["AUTH-036", {
    selector: "#request-form",
    submitSelector: '#request-form button[type="submit"]',
    route: "/client/request-access",
    method: "POST",
    path: "/client/api/access-requests",
    fields: ["username", "displayName", "contact", "viewId", "reason"],
    allowedStatuses: [201],
  }],
  ["AUTH-005", {
    selector: '[data-testid="auth-setup-form"]',
    submitSelector: '[data-testid="auth-setup-form"] button[type="submit"]',
    route: "/setup",
    method: "POST",
    path: "/setup",
    fields: ["username", "password", "confirm"],
    allowedStatuses: [302],
  }],
  ["AUTH-007", {
    selector: '[data-testid="auth-login-form"]',
    submitSelector: '[data-testid="auth-login-form"] button[type="submit"]',
    route: "/login",
    method: "POST",
    path: "/login",
    fields: ["username", "password"],
    allowedStatuses: [403],
  }],
  ["AUTH-014", {
    selector: "#user-form",
    submitSelector: "#user-save-selected",
    route: "/ops/users",
    method: "POST",
    path: "/ops/api/users",
    fields: ["username", "displayName", "password", "confirmPassword", "role", "viewId"],
    allowedStatuses: [201],
  }],
  ["AUTH-015", {
    selector: "#invite-create-form",
    submitSelector: '#invite-create-form button[type="submit"]',
    route: "/ops/users",
    method: "POST",
    path: "/ops/api/invites",
    fields: ["username", "displayName", "role", "viewId", "ttlSeconds"],
    allowedStatuses: [201],
  }],
  ["AUTH-033", {
    selector: "#invite-create-form",
    submitSelector: '#invite-create-form button[type="submit"]',
    route: "/ops/users",
    method: "POST",
    path: "/ops/api/invites",
    fields: ["username", "displayName", "role", "viewId", "ttlSeconds"],
    allowedStatuses: [201],
  }],
]);

const mutationPrimaryControls = new Map([
  ["UI-004", { selector: '[data-testid="auth-password-change-form"] button[type="submit"]', route: "/password/change" }],
  ["UI-005", { selector: 'form[action="/logout"] button[type="submit"]', route: "/ops/home" }],
  ["UI-023", { selector: "#opsVlmSaveProfile", route: "/ops/vlm" }],
  ["UI-029", { selector: "[data-delete-vlm-profile]", route: "/ops/vlm" }],
  ["UI-109", { selector: "#channel-save-selected", route: "/ops/sources" }],
  ["AUTH-018", { selector: "#user-save-selected", route: "/ops/users" }],
  ["AUTH-019", { selector: "#user-save-selected", route: "/ops/users" }],
  ["AUTH-036", { selector: '#request-form button[type="submit"]', route: "/client/request-access" }],
  ["AUTH-037", { selector: "[data-request-approve]", route: "/ops/users" }],
  ["AUTH-038", { selector: "[data-request-reject]", route: "/ops/users" }],
  ["AUTH-039", { selector: '#request-form button[type="submit"]', route: "/client/request-access" }],
  ["SRC-001", { selector: "#channel-save-selected", route: "/ops/sources" }],
  ["SRC-002", { selector: "#channel-save-selected", route: "/ops/sources" }],
  ["SRC-003", { selector: "#channel-save-selected", route: "/ops/sources" }],
  ["SRC-004", { selector: "#channel-save-selected", route: "/ops/sources" }],
  ["SRC-005", { selector: "#channel-save-selected", route: "/ops/sources" }],
  ["SRC-009", { selector: "#channel-save-selected", route: "/ops/sources" }],
  ["SRC-017", { selector: "#channel-save-selected", route: "/ops/sources" }],
  ["SRC-018", { selector: "#channel-save-selected", route: "/ops/sources" }],
  ["SRC-066", { selector: "#channel-save-selected", route: "/ops/sources" }],
  ["RULE-004", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-005", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-006", { selector: '[data-ops-rule-action="delete-va"]', route: "/ops/rules" }],
  ["RULE-008", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-011", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-012", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-016", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-018", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-019", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-020", { selector: '[data-ops-rule-action="delete-event-template"]', route: "/ops/rules" }],
  ["RULE-022", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-023", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-024", { selector: '[data-ops-rule-action="delete-profile"]', route: "/ops/rules" }],
  ["RULE-030", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-073", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-075", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-101", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-102", { selector: "#opsEventRuleTypeSelect", route: "/ops/rules" }],
  ["EVT-021", { selector: "[data-event-review-save]", route: "/ops/events" }],
  ["CLIENT-002", { selector: '[data-action="toggle-playback"]', route: "/client/live" }],
  ["CLIENT-005", { selector: "#liveAllStop", route: "/client/live" }],
  ["CLIENT-009", { selector: "#liveSaveLayoutPreference", route: "/client/live" }],
  ["SAFE-038", { selector: "[data-vlm-rule-draft-index]", route: "/ops/rules" }],
  ["UI-036", { selector: "[data-vlm-rule-draft-index]", route: "/ops/rules" }],
]);

const overrideControlSourceCatalog = new Map([
  ['[data-testid="auth-setup-form"] button[type="submit"]', {
    file: "src/ingress/product_ui_auth_pages.cpp",
    anchor: 'out << R"(    <form class="auth-form auth-form-grid" method="post" action="/setup" data-testid="auth-setup-form">',
  }],
  ['[data-testid="auth-password-change-form"] button[type="submit"]', {
    file: "src/ingress/product_ui_auth_pages.cpp",
    anchor: 'out << R"(    <form class="auth-form auth-form-grid" method="post" action="/password/change" data-testid="auth-password-change-form">',
  }],
  ['form[action="/logout"] button[type="submit"]', {
    file: "src/ingress/product_ui_auth_pages.cpp",
    anchor: '<form method="post" action="/logout"><button class="button-secondary" type="submit">로그아웃</button></form>',
  }],
  ["#opsVlmSaveProfile", {
    file: "src/ingress/product_ui_server_pages.cpp",
    anchor: '<button id="opsVlmSaveProfile" class="button-primary" type="button">profile 저장</button>',
  }],
  ["[data-delete-vlm-profile]", {
    file: "src/ingress/product_ui_page_scripts.cpp",
    anchor: 'data-delete-vlm-profile="${escapeHtml(profile.id || \'\')}"',
  }],
  ["#channel-save-selected", {
    file: "src/ingress/webrtc_http_server.cpp",
    anchor: '<button id="channel-save-selected" class="button-primary" type="submit" form="channel-form">저장</button>',
  }],
  ["#user-save-selected", {
    file: "src/ingress/webrtc_http_server.cpp",
    anchor: '<button id="user-save-selected" class="button-primary" type="submit" form="user-form">저장</button>',
  }],
  ['#request-form button[type="submit"]', {
    file: "src/ingress/product_ui_auth_pages.cpp",
    anchor: '<form id="request-form" class="auth-form auth-form-grid" data-testid="auth-access-request-form" data-access-route="request-access">',
  }],
  ["[data-request-approve]", {
    file: "src/ingress/product_ui_ops_users_script.cpp",
    anchor: 'data-request-approve="${escapeHtml(displayValue(request.requestId))}"',
  }],
  ["[data-request-reject]", {
    file: "src/ingress/product_ui_ops_users_script.cpp",
    anchor: 'data-request-reject="${escapeHtml(displayValue(request.requestId))}"',
  }],
  ["#opsRulesComposerSave", {
    file: "src/ingress/product_ui_server_pages.cpp",
    anchor: '<button id="opsRulesComposerSave" class="button-primary" type="button">저장</button>',
  }],
  ["#opsEventRuleTypeSelect", {
    file: "src/ingress/product_ui_server_pages.cpp",
    anchor: '<select id="opsEventRuleTypeSelect" aria-label="종류"></select>',
  }],
  ['[data-ops-rule-action="delete-va"]', {
    file: "src/ingress/product_ui_page_scripts.cpp",
    anchor: "opsRuleActionButton('삭제', 'delete-va', id, 'danger')",
  }],
  ['[data-ops-rule-action="delete-event-template"]', {
    file: "src/ingress/product_ui_page_scripts.cpp",
    anchor: "opsRuleActionButton('삭제', 'delete-event-template', id, 'danger')",
  }],
  ['[data-ops-rule-action="delete-profile"]', {
    file: "src/ingress/product_ui_page_scripts.cpp",
    anchor: "builtIn ? '' : opsRuleActionButton('삭제', 'delete-profile', id, 'danger')",
  }],
  ["[data-event-review-save]", {
    file: "src/ingress/product_ui_page_scripts.cpp",
    anchor: 'button type="button" class="button button-secondary button-compact" data-event-review-save',
  }],
  ['[data-action="toggle-playback"]', {
    file: "src/ingress/product_ui_client_scripts.cpp",
    anchor: 'data-action="toggle-playback" title="타일 ${tile.index + 1} 재생"',
  }],
  ["#liveAllStop", {
    file: "src/ingress/product_ui_client_scripts.cpp",
    anchor: '<button id="liveAllStop" class="ghost danger" type="button">전체 연결 해제</button>',
  }],
  ["#liveSaveLayoutPreference", {
    file: "src/ingress/product_ui_client_scripts.cpp",
    anchor: '<button id="liveSaveLayoutPreference" class="ghost" type="button">레이아웃 저장</button>',
  }],
  ["[data-vlm-rule-draft-index]", {
    file: "src/ingress/product_ui_page_scripts.cpp",
    anchor: 'data-vlm-rule-draft-index="${index}"',
  }],
  ['#invite-create-form button[type="submit"]', {
    file: "src/ingress/webrtc_http_server.cpp",
    anchor: '<form id="invite-create-form" class="inline-form">',
  }],
]);

const fillControls = new Set([
  "#opsIncidentSearchInput",
  "#opsVlmDisabledReason",
  "#opsScenarioBuilderClasses",
  "#dashVaQualityFilterInput",
]);

const checkboxControls = new Set([
  "#opsVlmProfileEnabled",
  "#opsEventRuleLoiteringGroundPlaneToggle",
]);

const disabledControls = new Set(["#opsVlmExternalTransferWarningAck"]);
const hiddenControls = new Set(["#opsEventRuleIdInput", "#opsVaRuleIdInput"]);
const detailsControls = new Set(['[data-testid="ops-context-actions"]']);
const enabledControls = new Set([
  "#add-channel",
  "#opsRulesComposerSave",
  '[data-action="toggle-playback"]',
  "#liveAllStop",
  "[data-vlm-rule-draft-index]",
]);
const linkControls = new Set(["#opsRulesReviewEventRecordLink"]);

const selectControls = new Map([
  ["#opsEventRulePresetSelect", "road"],
  ["#opsVaRuleReidSelect", "assist"],
  ["#opsProfileDetectorSelect", "dummy"],
  ["#opsEventRuleModeSelect", "scenario"],
  ["#opsVaRuleTrackerSelect", "kalman-lite"],
  ["#opsEventRuleTriggerDirectionSelect", "forward"],
  ["#opsEventRuleTypeSelect", "re-entry"],
  ["#opsScenarioBuilderType", "re-entry"],
  ["#opsVlmRuleDraftKindSelect", "line-crossing"],
  ["#eventRecordsEvidenceSelect", "snapshot"],
]);

const seededSelectControls = new Set(["#opsVaRuleTemplateSeedSelect"]);

const readModelControls = new Set([
  '[data-testid="client-live-action-reduction"]',
  '[data-testid="client-dashboard-shell"]',
  '[data-testid="client-dashboard-safe-summary"]',
  "#clientDashboardPresetStatus",
  "#dashSiteClientNoticePreviewList",
  "#opsVlmPrivacyGuardList",
  "#opsVlmStatus",
  "#opsVlmRuntimeStatusList",
  "#v320ActionReadinessChecklistGrid",
  "#opsVlmEvaluationRows",
  '[data-testid="ops-incident-rule-suggestion-review"]',
  "#opsIncidentTriageBoardRows",
  "#dashRuntimeOpsList",
  "#opsV320ResolutionTimeline",
  "#v320SourceReliabilityGrid",
  "#v320AiReviewQualityGrid",
  "#v320OperatorResolutionFlowGrid",
  '[data-testid="client-safe-resolution-digest"]',
  "#v320ResolutionSearchMetricsGrid",
  "#v330IncidentSourceCorrelationGrid",
  "#v330OperatorRecheckRecoveryQueueGrid",
  '[data-testid="client-safe-source-status-digest"]',
  '[data-testid="client-safe-maintenance-digest"]',
  "#v350IncidentCommandHandoffGrid",
  '[data-testid="client-impact-forecast"]',
  '[data-testid="client-operations-notice"]',
  "#dashCommandWorkspaceExportBundleMap",
  "#dashCommandWorkspaceVlmAssistedExplanation",
  "#opsIncidentActionReadinessQueueRows",
  '[data-testid="client-action-notice-preview"]',
  "#opsVlmRuleDraftBridgeStatus",
  "#dashActionExecutionDeferralList",
  "#dashFieldEvidenceBridgeList",
  '[data-testid="auth-password-policy"]',
  "#channelScopePolicy",
  "#opsRulesValidationList",
  "#opsVaRuleTrackingSummary",
  "#opsVaRuleGeometryMinimumText",
  "#dashSimulationWorkspaceVlmAssistedExplanationList",
  "#opsEvidenceIntakeFieldReadinessRows",
  "#dashIncidentTimeline",
  "#dashReidAssistDecisionList",
  "#dashRootCauseList",
  '[data-testid="ops-scenario-builder"]',
  "#opsEventRuleSettingsHeading",
  "#opsEventRulePresetSummary",
  "#opsOperatorOutcomeMemoryRows",
  "#dashRuntimeTrendSparkline",
  "#dashRootCauseActionOutput",
  '[data-testid="ops-vlm-event-review-card"]',
  "#eventReviewRows",
  "#dashCommandWorkspaceLedgerList",
  "#opsRulesDetailPanel",
  "#opsApprovalGatedRuleDraftReadinessRows",
  '[data-testid="client-live-dock-event-feed"]',
  '[data-testid="client-live-va-overlay-toggle"]',
  '[data-testid="client-safe-followup-digest"]',
  '[data-testid="client-safe-incident-digest"]',
  '[data-testid="client-safe-event-digest"]',
]);

const localCompletionContracts = new Map([
  ["UI-036", {
    postconditions: [
      { selector: "#opsRulesDetailPanel", property: "hidden", operator: "equals", value: false },
      { selector: "#opsEventRulePresetSelect", property: "value", operator: "equals", value: "custom" },
      { selector: "#opsRulesStatus", property: "text", operator: "includes", value: "저장" },
    ],
    forbiddenRequests: [
      { methods: ["POST", "PUT", "DELETE"], pathPrefix: "/lab/analysis/rules" },
      { methods: ["POST", "PUT", "DELETE"], pathPrefix: "/lab/analysis/va-rules" },
    ],
  }],
  ["SRC-024", {
    postconditions: [
      { selector: "#channel-detail-panel", property: "hidden", operator: "equals", value: false },
      { selector: "#channel-editor-mode", property: "text", operator: "includes", value: "새 채널" },
      { selector: "#channel-editor-title", property: "text", operator: "includes", value: "채널 추가" },
    ],
    forbiddenRequests: [
      { methods: ["POST", "DELETE"], pathPrefix: "/webrtc/session" },
    ],
  }],
  ["RULE-101", {
    postconditions: [
      { selector: "#opsRulesStatus", property: "text", operator: "includes", value: "저장 전 검증 실패" },
      { selector: "#opsRulesComposerSave", property: "hidden", operator: "equals", value: false },
    ],
    forbiddenRequests: [
      { methods: ["PUT"], pathPrefix: "/lab/analysis/va-rules/" },
    ],
  }],
  ["RULE-102", {
    postconditions: [
      { selector: "#opsRulesReviewLoop", property: "hidden", operator: "equals", value: false },
      { selector: "#opsRulesReviewEventTypeTitle", property: "text", operator: "includes", value: "re-entry" },
      { selector: "#opsRulesReviewEventRecordLink", property: "href", operator: "startsWith", value: "/ops/events#eventType=" },
    ],
    forbiddenRequests: [
      { methods: ["POST", "PUT", "DELETE"], pathPrefix: "/lab/analysis/rules" },
      { methods: ["POST", "PUT", "DELETE"], pathPrefix: "/lab/analysis/va-rules" },
    ],
  }],
  ["CLIENT-002", {
    seedRequirements: [{ kind: "live-tile-state", state: "idle", minimumCount: 1 }],
    requiredRequests: [
      { sequence: 1, method: "POST", urlPath: "/client/api/views/client-002-review4-fixture/webrtc/session", allowedStatuses: [200] },
      { sequence: 2, method: "POST", urlPath: "/client/api/views/client-002-review4-fixture/webrtc/session/client-002-review4-session/answer", allowedStatuses: [200] },
    ],
    postconditions: [
      { selector: '[data-action="toggle-playback"]', property: "ariaLabel", operator: "includes", value: "정지" },
      { selector: '[data-role="tile-playback-icon"]', property: "text", operator: "equals", value: "■" },
    ],
  }],
  ["CLIENT-005", {
    seedRequirements: [{ kind: "live-session", state: "active", minimumCount: 1, sessionId: "client-005-review4-session" }],
    requiredRequests: [
      { sequence: 1, method: "DELETE", urlPath: "/client/api/views/client-005-review4-fixture/webrtc/session/client-005-review4-session", allowedStatuses: [200] },
    ],
    postconditions: [
      { selector: '[data-action="toggle-playback"]', property: "ariaLabel", operator: "includes", value: "재생" },
      { selector: '[data-role="tile-playback-icon"]', property: "text", operator: "equals", value: "▶" },
    ],
  }],
  ["SAFE-038", {
    postconditions: [
      { selector: "#opsRulesDetailPanel", property: "hidden", operator: "equals", value: false },
      { selector: "#opsEventRulePresetSelect", property: "value", operator: "equals", value: "custom" },
      { selector: "#opsRulesStatus", property: "text", operator: "includes", value: "저장" },
    ],
    forbiddenRequests: [
      { methods: ["POST", "PUT", "DELETE"], pathPrefix: "/lab/analysis/rules" },
      { methods: ["POST", "PUT", "DELETE"], pathPrefix: "/lab/analysis/va-rules" },
      { methods: ["POST", "PUT", "DELETE"], pathPrefix: "/ops/api/events" },
    ],
  }],
]);

export function buildNativeExactManifest({ canonical, implementation }) {
  assert(canonical?.schema === canonicalManifestSchema, "unexpected canonical manifest schema");
  assert(implementation?.schema === implementationManifestSchema, "unexpected implementation manifest schema");
  assert(Array.isArray(canonical.cases) && canonical.cases.length === 424, "canonical exact case count must be 424");
  for (const item of canonical.cases) {
    assert(supportedAccountRoles.has(item.accountRole),
      `${item.testId} unsupported canonical account role: ${item.accountRole || "missing"}`);
  }
  const implementationByManualId = new Map(
    implementation.items
      .filter(item => typeof item.manualUiCaseId === "string" && item.manualUiCaseId)
      .map(item => [item.manualUiCaseId, item]),
  );
  assert(implementationByManualId.size === 424, "implementation exact manual UI case count must be 424");

  const cases = canonical.cases.map(canonicalCase => {
    const implementationItem = implementationByManualId.get(canonicalCase.testId);
    assert(implementationItem, `${canonicalCase.testId} implementation item missing`);
    const negativeRoute = canonicalCase.testId === "UI-018";
    const crossRouteNegative = canonicalCase.testId === "SAFE-017";
    const screenRoute = negativeRoute ? canonicalCase.route : normalizeProductScreenRoute(canonicalCase.route);
    const canonicalSelector = normalizeCanonicalSelector(canonicalCase.controlAction?.selector);
    const workflowClass = classifyWorkflow({ canonicalCase, implementationItem, canonicalSelector });
    const primaryControl = resolvePrimaryControl({
      canonicalCase,
      implementationItem,
      canonicalSelector,
      screenRoute,
      workflowClass,
    });
    const targetSelector = primaryControl.applicability === "required" ? primaryControl.selector : null;
    const sourceKind = implementationItem.semanticEvidence?.stateOracle?.oracleKind || "";
    const expectedBehavior = implementationItem.semanticEvidence?.stateOracle?.expectedBehavior || "";
    const expectedBehaviorSha256 = implementationItem.semanticEvidence?.stateOracle?.expectedBehaviorSha256 || "";
    const expectedNetworkUrlIncludes = inferNetworkUrlIncludes(canonicalCase);
    const workflowParts = buildCaseNativeWorkflow({
      canonicalCase,
      implementationItem,
      screenRoute,
      canonicalSelector,
      targetSelector,
      workflowClass,
      primaryControl,
      negativeRoute,
      crossRouteNegative,
    });
    const primaryActionPlan = primaryWorkflowAction(workflowParts.controlSequence, negativeRoute);
    const actions = workflowParts.controlSequence.map(action => ({
      ...action,
      ...(action.kind === "wait-visible" ? {} : {
        semanticCompletion: buildActionSemanticCompletion({
          caseId: canonicalCase.testId,
          screenRoute,
          action,
          negativeRoute,
          primaryActionId: primaryActionPlan.actionId,
          primaryControl,
          productAction: workflowParts.productAction,
          expectedProductState: workflowParts.expectedProductState,
          independentReadback: workflowParts.independentReadback,
          workflowInputs: workflowParts.inputs,
        }),
      }),
    }));
    const primaryCompletion = primarySemanticCompletion(actions);
    const hasCrossRouteNegative = actions.some(action => action.kind === "navigate-negative");
    const completionSources = [...new Set([
      primaryCompletion.requiredSource,
      ...primaryCompletion.attestedAlternatives,
    ])];
    const caseValue = {
      caseId: canonicalCase.testId,
      featureId: canonicalCase.featureId,
      disposition: negativeRoute ? "negative-route" : "native-executable",
      dispatch: "playwright-native",
      canonicalRoute: canonicalCase.route,
      screenRoute,
      accountRole: canonicalCase.accountRole,
      viewport: structuredClone(canonicalCase.viewport),
      theme: canonicalCase.theme,
      controlAction: {
        selector: targetSelector,
        requestedSelector: canonicalCase.controlAction?.selector ?? null,
        canonicalSelector,
        selectorSource: primaryControl.source,
        actionAnchor: canonicalCase.controlAction?.actionAnchor || "",
        actionRoute: primaryControl.route,
        targetSelector,
      },
      actions,
      workflow: {
        schema: caseNativeWorkflowSchema,
        workflowId: `${canonicalCase.testId}:native-workflow`,
        workflowClass,
        semanticClassification: workflowParts.semanticClassification,
        setup: workflowParts.setup,
        inputs: workflowParts.inputs,
        primaryControl,
        productAction: workflowParts.productAction,
        expectedProductState: workflowParts.expectedProductState,
        independentReadback: workflowParts.independentReadback,
        controlSequence: actions,
        expectedResults: [{
          resultId: `${canonicalCase.testId}:semantic-result`,
          kind: negativeRoute || crossRouteNegative ? "negative-route-status" : "reviewed-semantic-result",
          expectedBehavior,
          expectedBehaviorSha256,
          endpointHints: expectedNetworkUrlIncludes,
          stateLocator: compactLocator(workflowParts.expectedProductState.locator),
          readbackLocator: compactLocator(workflowParts.independentReadback.locator),
          completion: structuredClone(primaryCompletion),
        }],
        cleanup: workflowParts.cleanup,
      },
      oracle: {
        kind: negativeRoute
          ? "negative-route-status"
          : (hasCrossRouteNegative
              ? "semantic-cross-route-negative-status"
              : "semantic-endpoint-readback"),
        sourceKind,
        expectedBehavior,
        expectedBehaviorSha256,
        allowedStatuses: negativeRoute ? [404] : [200],
        completionRequired: true,
        allowedCompletionSources: completionSources,
        primaryActionId: primaryCompletion.actionId,
        primaryActionCorrelationId: primaryCompletion.correlationId,
        primaryControlSelector: primaryCompletion.controlSelector,
        independentReadbackIdentity: primaryCompletion.readback.identity,
      },
      artifacts: {
        screenshot: true,
        trace: true,
        browserConsole: true,
        serverLog: true,
      },
    };
    return {
      ...caseValue,
      requestedProjection: canonicalRequestedProjection(caseValue),
      observedProjection: expectedRuntimeObservation(caseValue),
    };
  });

  return {
    schema: nativeExactManifestSchema,
    sourceBindings: {
      canonicalSchema: canonical.schema,
      canonicalSha256: sha256Json(canonical),
      implementationSchema: implementation.schema,
      implementationSha256: sha256Json(implementation),
      selection: "canonical-exact-ordered-test-id",
    },
    counts: {
      exactCases: cases.length,
      positiveNative: cases.filter(item => item.disposition === "native-executable").length,
      negativeRoute: cases.filter(item => item.disposition === "negative-route").length,
      unsupported: 0,
    },
    evidenceBoundary: "execution manifest and contract are not actual 424-case UI fulltest or Step 26 eligibility evidence",
    cases,
  };
}

export function validateNativeExactManifest({ manifest, canonical, implementation }) {
  assert(manifest?.schema === nativeExactManifestSchema, "unexpected exact native manifest schema");
  const expected = buildNativeExactManifest({ canonical, implementation });
  assert(manifest.sourceBindings?.canonicalSha256 === expected.sourceBindings.canonicalSha256,
    "canonical source binding drift");
  assert(manifest.sourceBindings?.implementationSha256 === expected.sourceBindings.implementationSha256,
    "implementation source binding drift");
  assert(Array.isArray(manifest.cases) && manifest.cases.length === 424, "canonical exact case count must be 424");
  assertExact(manifest.cases.map(item => item.caseId), canonical.cases.map(item => item.testId),
    "canonical ordered case IDs");
  assertUnique(manifest.cases.map(item => item.caseId), "native exact case IDs");
  assertUnique(manifest.cases.map(item => item.workflow?.workflowId), "native exact workflow IDs");

  for (let index = 0; index < manifest.cases.length; index += 1) {
    const item = manifest.cases[index];
    const expectedItem = expected.cases[index];
    assert(item.featureId === expectedItem.featureId, `${item.caseId} featureId drift`);
    assert(supportedAccountRoles.has(item.accountRole), `${item.caseId} unsupported account role`);
    assert(item.accountRole === expectedItem.accountRole, `${item.caseId} accountRole drift`);
    assert(JSON.stringify(item.viewport) === JSON.stringify(expectedItem.viewport), `${item.caseId} viewport drift`);
    assert(item.theme === expectedItem.theme, `${item.caseId} theme drift`);
    assert(item.canonicalRoute === expectedItem.canonicalRoute, `${item.caseId} canonical route drift`);
    assert(!item.screenRoute.includes("/api/"), `${item.caseId} raw API screen route is forbidden`);
    assert(item.screenRoute === expectedItem.screenRoute, `${item.caseId} product screen route drift`);
    assert(item.disposition !== "unsupported", `${item.caseId} unsupported disposition is forbidden`);
    assert(item.disposition === expectedItem.disposition, `${item.caseId} disposition drift`);
    assert(item.dispatch === "playwright-native", `${item.caseId} native dispatch missing`);
    assert(Array.isArray(item.actions) && item.actions.length > 0, `${item.caseId} native actions missing`);
    assert(item.actions.every(action => action.dispatch === "playwright-native"), `${item.caseId} native action dispatch drift`);
    assert(item.actions.filter(action => action.kind !== "wait-visible").every(action =>
      action.semanticCompletion?.schema === "media-server.v390-ui-action-completion.v2"),
    `${item.caseId} semantic action completion missing`);
    assert(item.workflow?.schema === caseNativeWorkflowSchema, `${item.caseId} workflow schema drift`);
    assert(item.workflow.workflowId === `${item.caseId}:native-workflow`, `${item.caseId} workflow ID drift`);
    assert(review4WorkflowClasses.includes(item.workflow.workflowClass), `${item.caseId} workflow class invalid`);
    for (const field of ["setup", "inputs", "controlSequence", "expectedResults", "cleanup"]) {
      assert(Array.isArray(item.workflow[field]) && item.workflow[field].length > 0, `${item.caseId} workflow ${field} missing`);
    }
    assert(item.workflow.inputs.some(input => input.actualValue !== undefined || input.seedReference?.fixtureId),
      `${item.caseId} actual workflow input missing`);
    assert(JSON.stringify(item.actions) === JSON.stringify(item.workflow.controlSequence), `${item.caseId} action/workflow drift`);
    assert(!JSON.stringify(item.workflow).includes("runtime-control"), `${item.caseId} runtime-control is forbidden`);
    assert(!item.workflow.controlSequence.some(action => action.kind === "interact"), `${item.caseId} generic interact is forbidden`);
    assert(!JSON.stringify(item.workflow).includes('"submit":false'), `${item.caseId} submit:false is forbidden`);
    const primaryControl = item.workflow.primaryControl;
    assert(["required", "not-applicable"].includes(primaryControl?.applicability),
      `${item.caseId} primary control applicability missing`);
    assert(supportedAccountRoles.has(primaryControl.accountRole),
      `${item.caseId} primary control account role missing or unsupported`);
    const requiresActionRoleBinding = primaryControl.route !== item.screenRoute ||
      primaryControl.accountRole !== item.accountRole;
    const actionRoleBinding = item.workflow.setup.find(setup => setup.kind === "bind-action-role-session");
    if (requiresActionRoleBinding) {
      assert(actionRoleBinding?.accountRole === primaryControl.accountRole &&
        actionRoleBinding?.route === primaryControl.route && actionRoleBinding?.required === true,
      `${item.caseId} cross-route/role action session binding missing`);
    } else {
      assert(!actionRoleBinding, `${item.caseId} redundant action role session binding forbidden`);
    }
    if (primaryControl.applicability === "required") {
      assert(primaryControl.selector && !isRouteRootSelector(primaryControl.selector),
        `${item.caseId} route-root primary control forbidden`);
      assert(primaryControl.sourceLocator?.file && primaryControl.sourceLocator?.anchor &&
        /^[a-f0-9]{64}$/.test(primaryControl.sourceLocator?.contextSha256 || ""),
      `${item.caseId} primary control source locator missing`);
      if (["actionable", "form-submit", "persisted-mutation"].includes(item.workflow.workflowClass)) {
        assert(primaryControl.expectedVisible === true && primaryControl.expectedEnabled === true,
          `${item.caseId} actionable primary control must be visible/enabled`);
      }
    } else {
      assert(["read-only-state", "hidden-disabled", "negative-route"].includes(item.workflow.workflowClass),
        `${item.caseId} control not-applicable is forbidden for ${item.workflow.workflowClass}`);
      assert(primaryControl.reason && primaryControl.sourceLocator?.file && primaryControl.readbackLocator?.file,
        `${item.caseId} control not-applicable source/readback proof missing`);
    }
    const endpointCount = item.workflow.productAction?.endpoint ? 1 : 0;
    const localActionCount = item.workflow.productAction?.localAction ? 1 : 0;
    assert(endpointCount + localActionCount === 1,
      `${item.caseId} product action must declare exactly one endpoint or local action`);
    if (item.workflow.workflowClass === "persisted-mutation") {
      assert(endpointCount === 1 && localActionCount === 0,
        `${item.caseId} persisted mutation requires a durable endpoint action`);
    }
    if (item.workflow.workflowClass === "actionable" && endpointCount === 1) {
      assert(item.workflow.productAction.endpoint.allowedStatuses.every(status => status >= 400),
        `${item.caseId} actionable endpoint must be an explicit rejected/no-persist action`);
    }
    if (item.workflow.workflowClass === "form-submit") {
      assert(!hasMixedSuccessAndErrorStatuses(item.workflow.productAction.endpoint.allowedStatuses),
        `${item.caseId} form broad mixed success/error status set forbidden`);
    }
    assert(item.workflow.expectedProductState?.identity && item.workflow.expectedProductState?.locator?.file,
      `${item.caseId} expected product state missing`);
    assert(item.workflow.independentReadback?.identity && item.workflow.independentReadback?.locator?.file,
      `${item.caseId} independent readback missing`);
    assert(item.workflow.expectedProductState.identity !== item.workflow.independentReadback.identity,
      `${item.caseId} state/readback identity self-compare forbidden`);
    assert(locatorIdentity(item.workflow.expectedProductState.locator) !==
      locatorIdentity(item.workflow.independentReadback.locator),
    `${item.caseId} state/readback locator self-compare forbidden`);
    if (["persisted-mutation", "form-submit"].includes(item.workflow.workflowClass)) {
      assert(item.workflow.cleanup.some(cleanup => {
        const inverseCount = cleanup.inverseAction?.endpoint ? 1 : 0;
        const inverseLocalCount = cleanup.inverseAction?.localAction ? 1 : 0;
        return ["restore-fixture-state", "delete-created-fixture"].includes(cleanup.kind) &&
          cleanup.beforeSnapshotRef && inverseCount + inverseLocalCount === 1 &&
          cleanup.afterReadback?.identity &&
          ["absent", "equal-before", "inactive-or-equal-before"].includes(cleanup.afterReadback?.expectation) &&
          cleanup.readback?.identity;
      }), `${item.caseId} mutation cleanup inverse/readback missing`);
    } else {
      assert(item.workflow.cleanup.some(cleanup => cleanup.kind === "no-op-cleanup" && cleanup.persistedMutation === false),
        `${item.caseId} nonmutation no-op cleanup missing`);
    }
    if (item.workflow.workflowClass === "form-submit") {
      const formInput = item.workflow.inputs.find(input => input.kind === "form-values");
      assert(formInput?.submit === true,
        `${item.caseId} form submit input missing`);
      assert(!containsLiteralAuthMaterial(formInput.actualValue), `${item.caseId} form auth literal forbidden`);
      assert(item.workflow.controlSequence.some(action => action.kind === "submit-form"),
        `${item.caseId} form submit action missing`);
      assert(!item.workflow.controlSequence.some(action => action.kind === "assert-form-contract"),
        `${item.caseId} form contract-only action forbidden`);
    }
    if (!item.controlAction.selector) {
      assert(primaryControl.applicability === "not-applicable" &&
        ["read-only-state", "hidden-disabled", "negative-route"].includes(item.workflow.workflowClass),
      `${item.caseId} selector-null generic workflow forbidden`);
    }
    if (hiddenControls.has(item.controlAction.selector)) {
      assert(item.workflow.controlSequence.some(action => action.kind === "assert-hidden-control"),
        `${item.caseId} hidden control assertion missing`);
    }
    assert(JSON.stringify(item.actions) === JSON.stringify(expectedItem.actions), `${item.caseId} action plan drift`);
    assert(item.oracle?.sourceKind === expectedItem.oracle.sourceKind, `${item.caseId} oracle source kind drift`);
    assert(item.oracle?.expectedBehaviorSha256 === expectedItem.oracle.expectedBehaviorSha256,
      `${item.caseId} oracle digest drift`);
    assert(/^[a-f0-9]{64}$/.test(item.oracle.expectedBehaviorSha256), `${item.caseId} oracle digest invalid`);
    assert(JSON.stringify(item.oracle) === JSON.stringify(expectedItem.oracle), `${item.caseId} oracle contract drift`);
    assert(item.oracle.completionRequired === true, `${item.caseId} completionRequired must be true`);
    assert(item.oracle.allowedCompletionSources.every(source => allowedCompletionSources.includes(source)),
      `${item.caseId} unknown completion source`);
    assert(!item.oracle.allowedCompletionSources.includes("dom-transition"),
      `${item.caseId} arbitrary DOM completion source is forbidden`);
    assert(item.workflow.expectedResults[0]?.completion?.schema === "media-server.v390-ui-action-completion.v2",
      `${item.caseId} expected semantic completion missing`);
    const primaryCompletion = item.workflow.expectedResults[0].completion;
    assert(primaryCompletion.phase === "primary-action", `${item.caseId} primary completion phase missing`);
    assert(primaryCompletion.actionId === item.oracle.primaryActionId &&
      primaryCompletion.correlationId === item.oracle.primaryActionCorrelationId,
    `${item.caseId} primary completion identity drift`);
    assert(primaryCompletion.controlSelector === item.workflow.primaryControl.selector &&
      primaryCompletion.controlSelector === item.oracle.primaryControlSelector,
    `${item.caseId} primary completion selector drift`);
    assert(primaryCompletion.expectedBehaviorSha256 === item.workflow.expectedProductState.expectedBehaviorSha256,
      `${item.caseId} primary expected behavior drift`);
    assert(primaryCompletion.readback.identity === item.workflow.independentReadback.identity &&
      primaryCompletion.readback.identity === item.oracle.independentReadbackIdentity &&
      primaryCompletion.readback.staticLocatorIsNotRuntimePass === true,
    `${item.caseId} independent readback binding drift`);
    assert(Boolean(primaryCompletion.request) !== Boolean(primaryCompletion.localTransition),
      `${item.caseId} primary request/local transition must be exclusive`);
    if (item.workflow.productAction.endpoint) {
      const endpoint = item.workflow.productAction.endpoint;
      assert(primaryCompletion.request.correlationId === primaryCompletion.correlationId &&
        primaryCompletion.request.correlationId !== `${item.caseId}:navigation` &&
        primaryCompletion.request.method === endpoint.method &&
        primaryCompletion.request.urlPathTemplate === endpoint.path &&
        !primaryCompletion.request.urlPath.includes("{") &&
        JSON.stringify(primaryCompletion.request.allowedStatuses) === JSON.stringify(endpoint.allowedStatuses),
      `${item.caseId} action request completion drift`);
    } else {
      const localAction = item.workflow.productAction.localAction;
      assert(primaryCompletion.localTransition.selector === item.workflow.primaryControl.selector &&
        primaryCompletion.localTransition.type === localAction.type &&
        primaryCompletion.localTransition.target === localAction.target &&
        primaryCompletion.localTransition.effect === localAction.effect,
      `${item.caseId} local transition completion drift`);
    }
    assert(JSON.stringify(item.artifacts) === JSON.stringify(expectedItem.artifacts), `${item.caseId} artifact plan drift`);
    assert(JSON.stringify(item.requestedProjection) === JSON.stringify(expectedItem.requestedProjection),
      `${item.caseId} canonical requested projection drift`);
    assert(JSON.stringify(item.observedProjection) === JSON.stringify(expectedItem.observedProjection),
      `${item.caseId} runtime observed projection drift`);
    const projectionErrors = validateRequestedObservedEnvelope({
      requested: item.requestedProjection,
      observed: item.observedProjection,
      canonicalCase: canonical.cases[index],
      nativeCase: item,
    });
    assert(projectionErrors.length === 0,
      `${item.caseId} requested/observed projection invalid: ${projectionErrors.join("; ")}`);
  }

  const negative = manifest.cases.find(item => item.caseId === "UI-018");
  assert(negative?.disposition === "negative-route", "UI-018 negative route disposition missing");
  assert(negative.oracle?.kind === "negative-route-status", "UI-018 negative status oracle missing");
  const workflowClassCounts = Object.fromEntries(review4WorkflowClasses.map(workflowClass => [
    workflowClass,
    manifest.cases.filter(item => item.workflow.workflowClass === workflowClass).length,
  ]));
  const expectedWorkflowClassCounts = {
    actionable: 40,
    "form-submit": 15,
    "persisted-mutation": 35,
    "read-only-state": 287,
    "hidden-disabled": 45,
    "negative-route": 2,
  };
  for (const workflowClass of review4WorkflowClasses) {
    assert(workflowClassCounts[workflowClass] === expectedWorkflowClassCounts[workflowClass],
      `${workflowClass} workflow count mismatch`);
  }
  assert(JSON.stringify(manifest) === JSON.stringify(expected), "generated exact native manifest drift");
  return {
    caseCount: manifest.cases.length,
    positiveNative: manifest.cases.filter(item => item.disposition === "native-executable").length,
    negativeRoute: manifest.cases.filter(item => item.disposition === "negative-route").length,
    unsupported: manifest.cases.filter(item => item.disposition === "unsupported").length,
    workflowClassCounts,
  };
}

export function normalizeProductScreenRoute(route) {
  if (route === "/") return "/login";
  if (route === "/ops/api/events/reviews") return "/ops/events";
  if (route === "/client/api/views/{id}/events") return "/client/events";
  if (route === "/ops/api/audit") return "/ops/users";
  if (route.startsWith("/ops/api/source-registry/") || route.startsWith("/ops/api/onvif/")) {
    return "/ops/sources";
  }
  if (route === "/lab") return "/ops";
  assert(productScreenRoutes.has(route), `no product screen route mapping for ${route}`);
  return route;
}

function classifyWorkflow({ canonicalCase, implementationItem, canonicalSelector }) {
  const flowKind = implementationItem.semanticEvidence?.review4Proof?.flowKind || "";
  if (canonicalCase.testId === "UI-018" || canonicalCase.testId === "SAFE-017") return "negative-route";
  if (localOnlyMutationCases.has(canonicalCase.testId)) return "actionable";
  if (endpointActionCases.has(canonicalCase.testId)) return "actionable";
  if (formMutationCases.has(canonicalCase.testId) || formSubmitOverrides.has(canonicalCase.testId)) return "form-submit";
  if (forcedPersistedMutationCases.has(canonicalCase.testId)) return "persisted-mutation";
  if (flowKind === "mutation") return "persisted-mutation";
  if (formContracts.has(canonicalSelector)) return "form-submit";
  if (readOnlyBoundaryCases.has(canonicalCase.testId)) return "read-only-state";
  if (flowKind === "negative-invariant" || explicitHiddenControlCases.has(canonicalCase.testId) ||
      disabledControls.has(canonicalSelector)) {
    return "hidden-disabled";
  }
  if (canonicalSelector && !readModelControls.has(canonicalSelector)) return "actionable";
  return "read-only-state";
}

function resolvePrimaryControl({ canonicalCase, implementationItem, canonicalSelector, screenRoute, workflowClass }) {
  const caseId = canonicalCase.testId;
  const accountRole = actionRoleOverrides.get(caseId) || canonicalCase.accountRole;
  if (workflowClass === "actionable" && (localOnlyMutationCases.has(caseId) || endpointActionCases.has(caseId))) {
    const override = mutationPrimaryControls.get(caseId);
    const source = overrideControlSourceCatalog.get(override?.selector);
    assert(override && source, `${caseId} local mutation exact primary control/source missing`);
    return {
      applicability: "required",
      selector: override.selector,
      route: override.route,
      accountRole,
      source: "review4-local-mutation-control-override",
      expectedVisible: true,
      expectedEnabled: true,
      sourceLocator: sourceLocatorFromAnchor(caseId, source),
    };
  }
  if (workflowClass === "persisted-mutation") {
    const override = mutationPrimaryControls.get(caseId);
    assert(override, `${caseId} persisted mutation exact primary control override missing`);
    const source = overrideControlSourceCatalog.get(override.selector);
    assert(source, `${caseId} persisted mutation primary control source missing`);
    return {
      applicability: "required",
      selector: override.selector,
      route: override.route,
      accountRole,
      source: "review4-mutation-control-override",
      expectedVisible: true,
      expectedEnabled: true,
      sourceLocator: sourceLocatorFromAnchor(caseId, source),
    };
  }
  if (workflowClass === "form-submit") {
    const override = formSubmitOverrides.get(caseId);
    const spec = formSubmitSpec(caseId, canonicalSelector);
    const overrideSource = overrideControlSourceCatalog.get(spec.submitSelector);
    const locator = overrideSource
      ? sourceLocatorFromAnchor(caseId, overrideSource)
      : compactSourceLocator(implementationItem.semanticEvidence?.controlSelector?.locator);
    assert(spec.selector && spec.submitSelector, `${caseId} form selector missing`);
    return {
      applicability: "required",
      selector: spec.submitSelector,
      route: spec.route || screenRoute,
      accountRole,
      source: override ? "review4-form-submit-control-override" : "review4-canonical-form-submit-control",
      expectedVisible: true,
      expectedEnabled: true,
      sourceLocator: locator,
    };
  }
  const exactHiddenControl = explicitHiddenControlCases.has(caseId) && hiddenControls.has(canonicalSelector);
  const exactDisabledControl = disabledControls.has(canonicalSelector);
  if ((workflowClass === "hidden-disabled" && !exactHiddenControl && !exactDisabledControl) ||
      readOnlyBoundaryCases.has(caseId)) {
    return buildNotApplicablePrimaryControl({
      caseId,
      implementationItem,
      screenRoute,
      accountRole,
      workflowClass,
    });
  }
  if (canonicalSelector) {
    const locator = implementationItem.semanticEvidence?.controlSelector?.locator;
    assert(locator?.file && locator?.anchor, `${caseId} canonical primary control source missing`);
    const hidden = exactHiddenControl;
    const disabled = exactDisabledControl;
    return {
      applicability: "required",
      selector: canonicalSelector,
      route: screenRoute,
      accountRole,
      source: "review4-canonical-product-control",
      expectedVisible: !hidden,
      expectedEnabled: !hidden && !disabled,
      sourceLocator: compactSourceLocator(locator),
    };
  }
  return buildNotApplicablePrimaryControl({
    caseId,
    implementationItem,
    screenRoute,
    accountRole,
    workflowClass,
  });
}

function buildNotApplicablePrimaryControl({
  caseId,
  implementationItem,
  screenRoute,
  accountRole,
  workflowClass,
}) {
  const proof = implementationItem.semanticEvidence?.review4Proof || {};
  const sourceLocator = compactSourceLocator(proof.roles?.action || proof.roles?.state);
  const readbackLocator = compactSourceLocator(proof.roles?.readback);
  assert(sourceLocator?.file && readbackLocator?.file, `${caseId} control not-applicable source/readback proof missing`);
  return {
    applicability: "not-applicable",
    selector: null,
    route: screenRoute,
    accountRole,
    source: "review4-explicit-control-not-applicable",
    expectedVisible: false,
    expectedEnabled: false,
    reason: workflowClass === "negative-route"
      ? "negative route has no product control"
      : "reviewed feature is exercised by exact endpoint/readback rather than a direct product control",
    sourceLocator,
    readbackLocator,
  };
}

function buildCaseNativeWorkflow({
  canonicalCase,
  implementationItem,
  screenRoute,
  canonicalSelector,
  targetSelector,
  workflowClass,
  primaryControl,
  negativeRoute,
  crossRouteNegative,
}) {
  const caseId = canonicalCase.testId;
  const semantic = implementationItem.semanticEvidence || {};
  const proof = semantic.review4Proof || {};
  const semanticDigest = semantic.callChain?.digest || "";
  const semanticClassification = {
    flowKind: proof.flowKind || "",
    operation: proof.requirement?.operation || "",
    expectation: proof.requirement?.expectation || "",
    surface: proof.requirement?.surface || "",
  };
  const readbackLocator = compactSourceLocator(proof.roles?.readback || semantic.callChain?.roles?.readback);
  const stateLocator = distinctExpectedStateLocator(proof, readbackLocator);
  const expectedProductState = {
    identity: sourceIdentity("product-state", stateLocator),
    expectedBehavior: semantic.stateOracle?.expectedBehavior || "",
    expectedBehaviorSha256: semantic.stateOracle?.expectedBehaviorSha256 || "",
    locator: stateLocator,
  };
  const independentReadback = {
    identity: sourceIdentity("independent-readback", readbackLocator),
    kind: "reviewed-verifier-readback",
    locator: readbackLocator,
    verifierCommand: semantic.verifierAssertion?.command || proof.verifier?.command || "",
    assertedSemanticDigest: semantic.verifierAssertion?.assertedSemanticDigest || proof.sourceFlowDigest || "",
  };
  assert(expectedProductState.identity !== independentReadback.identity, `${caseId} state/readback identity self-compare`);
  assert(locatorIdentity(stateLocator) !== locatorIdentity(readbackLocator), `${caseId} state/readback locator self-compare`);
  const productAction = buildProductAction({
    canonicalCase,
    implementationItem,
    screenRoute,
    workflowClass,
    primaryControl,
    negativeRoute,
    crossRouteNegative,
  });
  const inputs = buildWorkflowInputs({
    canonicalCase,
    implementationItem,
    workflowClass,
    canonicalSelector,
    productAction,
  });
  const mutatesFixture = workflowClass === "persisted-mutation" || workflowClass === "form-submit";
  const setup = [
    {
      kind: "bind-role-session",
      setupId: `${caseId}:role-session`,
      accountRole: canonicalCase.accountRole,
      required: canonicalCase.accountRole !== "anonymous",
    },
    {
      kind: "seed-reviewed-state",
      setupId: `${caseId}:reviewed-state`,
      strategy: workflowClass,
      route: primaryControl.route || screenRoute,
      semanticCallChainSha256: semanticDigest,
      persistedMutation: mutatesFixture,
      fixtureId: workflowFixtureId(caseId),
      beforeSnapshotRef: mutatesFixture ? `${caseId}:before-product-state` : null,
    },
  ];
  if (primaryControl.route !== screenRoute || primaryControl.accountRole !== canonicalCase.accountRole) {
    setup.push({
      kind: "bind-action-role-session",
      setupId: `${caseId}:action-role-session`,
      accountRole: primaryControl.accountRole,
      route: primaryControl.route,
      required: true,
      reason: primaryControl.accountRole !== canonicalCase.accountRole
        ? "exact primary control requires a distinct product role session"
        : "exact primary control is hosted on a distinct product route",
    });
  }
  const controlSequence = [nativeAction("navigate", {
    actionId: `${caseId}:navigate`,
    route: screenRoute,
    expectedCanonicalRoute: canonicalCase.route,
  })];
  if (primaryControl.route && primaryControl.route !== screenRoute) {
    controlSequence.push(nativeAction("navigate-action-route", {
      actionId: `${caseId}:navigate-action-route`,
      route: primaryControl.route,
      reason: "exact primary control is hosted on a distinct product workflow route",
    }));
  }

  if (workflowClass === "negative-route") {
    if (crossRouteNegative) {
      controlSequence.push(nativeAction("navigate-negative", {
        actionId: `${caseId}:navigate-negative`,
        route: canonicalCase.route,
        allowedStatuses: [404],
      }));
    }
  } else if (workflowClass === "form-submit") {
    controlSequence.push(nativeAction("wait-visible", {
      actionId: `${caseId}:wait-visible`, selector: targetSelector, selectorSource: primaryControl.source,
    }));
    const form = formSubmitSpec(caseId, canonicalSelector);
    controlSequence.push(nativeAction("submit-form", {
      actionId: `${caseId}:submit-form`,
      selector: form.selector,
      submitSelector: targetSelector,
      method: productAction.endpoint.method,
      action: productAction.endpoint.path,
      fields: [...form.fields],
      inputId: `${caseId}:form-values`,
      uiLifecycle: formSubmitUiLifecycle(caseId, form),
    }));
  } else if (workflowClass === "persisted-mutation") {
    controlSequence.push(nativeAction("wait-visible", {
      actionId: `${caseId}:wait-visible`, selector: targetSelector, selectorSource: primaryControl.source,
    }));
    controlSequence.push(nativeAction("execute-persisted-action", {
      actionId: `${caseId}:execute-persisted-action`,
      selector: targetSelector,
      endpoint: productAction.endpoint || null,
      localAction: productAction.localAction || null,
      inputId: `${caseId}:mutation-fixture`,
      uiLifecycle: persistedUiLifecycle(caseId, productAction, inputs),
    }));
  } else if (workflowClass === "actionable") {
    controlSequence.push(nativeAction("wait-visible", {
      actionId: `${caseId}:wait-visible`, selector: targetSelector, selectorSource: primaryControl.source,
    }));
    appendActionableControlAction({ caseId, selector: targetSelector, inputs, controlSequence });
  } else if (workflowClass === "hidden-disabled") {
    if (primaryControl.applicability === "not-applicable") {
      controlSequence.push(nativeAction("assert-product-boundary", {
        actionId: `${caseId}:assert-product-boundary`,
        readbackIdentity: independentReadback.identity,
      }));
    } else if (primaryControl.expectedVisible === false) {
      controlSequence.push(nativeAction("assert-hidden-control", {
        actionId: `${caseId}:assert-hidden-control`, selector: targetSelector, expectedExists: true,
      }));
    } else {
      controlSequence.push(nativeAction("assert-disabled-control", {
        actionId: `${caseId}:assert-disabled-control`, selector: targetSelector,
      }));
    }
  } else if (primaryControl.applicability === "not-applicable") {
    controlSequence.push(nativeAction("assert-product-state", {
      actionId: `${caseId}:assert-product-state`,
      readbackIdentity: independentReadback.identity,
    }));
  } else {
    controlSequence.push(nativeAction("wait-visible", {
      actionId: `${caseId}:wait-visible`, selector: targetSelector, selectorSource: primaryControl.source,
    }));
    controlSequence.push(nativeAction("assert-visible-read-model", {
      actionId: `${caseId}:assert-visible-read-model`, selector: targetSelector,
    }));
  }

  if (workflowClass !== "negative-route") {
    controlSequence.push(nativeAction("verify-independent-readback", {
      actionId: `${caseId}:verify-independent-readback`,
      expectedStateIdentity: expectedProductState.identity,
      expectedBehaviorSha256: expectedProductState.expectedBehaviorSha256,
      readbackIdentity: independentReadback.identity,
      readbackLocator: compactLocator(independentReadback.locator),
      verifierCommand: independentReadback.verifierCommand,
      runtimeEvidenceRequired: true,
      staticLocatorIsNotRuntimePass: true,
    }));
  }

  const cleanup = mutatesFixture
    ? [buildMutationCleanup({
        caseId,
        workflowClass,
        semanticClassification,
        productAction,
        independentReadback,
      })]
    : [{
        kind: "no-op-cleanup",
        cleanupId: `${caseId}:no-persisted-mutation`,
        persistedMutation: false,
        assertion: "reviewed workflow does not persist product state",
        semanticCallChainSha256: semanticDigest,
      }];
  if (workflowClass === "actionable") {
    cleanup.unshift({
      kind: "restore-local-control",
      cleanupId: `${caseId}:restore-local-control`,
      selector: targetSelector,
    });
  }

  return {
    semanticClassification,
    setup,
    inputs,
    primaryControl,
    productAction,
    expectedProductState,
    independentReadback,
    controlSequence,
    cleanup,
  };
}

function buildMutationCleanup({
  caseId,
  workflowClass,
  productAction,
  independentReadback,
}) {
  const fixtureId = workflowFixtureId(caseId);
  const endpointPath = String(productAction.endpoint?.path || "");
  const sourceViewState = [
    "/ops/api/sources/",
    "/ops/api/views/",
    "/ops/api/onvif/channels/",
  ].some(prefix => endpointPath.startsWith(prefix));
  const fileBackedState = workflowClass === "form-submit" ||
    endpointPath === "/client/api/preferences/live-layout" ||
    endpointPath.startsWith("/ops/api/users") ||
    endpointPath.startsWith("/ops/api/invites") ||
    endpointPath.startsWith("/ops/api/access-requests") ||
    endpointPath.startsWith("/client/api/access-requests") ||
    endpointPath.startsWith("/ops/api/events/reviews");
  const restoreType = sourceViewState
    ? "restore-source-view-snapshot"
    : (fileBackedState
        ? (workflowClass === "form-submit" ? "restore-auth-fixture-snapshot" : "restore-file-backed-fixture-snapshot")
        : "restore-product-fixture-snapshot");
  const inverseAction = {
    endpoint: null,
    localAction: {
      type: restoreType,
      target: fixtureId,
      effect: sourceViewState
        ? "restore an existing source/view pair or disable a suite-created pair before isolated server teardown"
        : (fileBackedState
            ? "restore every owned file-backed product state byte-for-byte"
            : "restore or remove the product-memory fixture, then restore every owned state file byte-for-byte"),
    },
  };
  return {
    kind: "restore-fixture-state",
    cleanupId: `${caseId}:restore-fixture`,
    fixtureId,
    strategy: "restore-before-snapshot",
    beforeSnapshotRef: `${caseId}:before-product-state`,
    inverseAction,
    afterReadback: {
      identity: `${independentReadback.identity}:cleanup`,
      expectation: sourceViewState ? "inactive-or-equal-before" : "equal-before",
      locator: structuredClone(independentReadback.locator),
    },
    readback: structuredClone(independentReadback),
  };
}

function appendActionableControlAction({ caseId, selector, inputs, controlSequence }) {
  if (detailsControls.has(selector)) {
    controlSequence.push(nativeAction("toggle-details", { actionId: `${caseId}:toggle-details`, selector }));
    return;
  }
  if (fillControls.has(selector)) {
    const value = `${caseId.toLowerCase()}-exact`;
    inputs.push({ inputId: `${caseId}:control-value`, kind: "literal-control-value", actualValue: value, sensitive: false });
    controlSequence.push(nativeAction("fill-control", { actionId: `${caseId}:fill-control`, selector, value }));
    return;
  }
  if (checkboxControls.has(selector)) {
    inputs.push({
      inputId: `${caseId}:checked-value`, kind: "initial-state-inversion", actualValue: "logical-not-initial", sensitive: false,
    });
    controlSequence.push(nativeAction("toggle-checkbox", {
      actionId: `${caseId}:toggle-checkbox`, selector, checkedFrom: "logical-not-initial",
    }));
    return;
  }
  if (selectControls.has(selector)) {
    const value = selectControls.get(selector);
    inputs.push({ inputId: `${caseId}:select-value`, kind: "literal-select-value", actualValue: value, sensitive: false });
    controlSequence.push(nativeAction("select-control", { actionId: `${caseId}:select-control`, selector, value }));
    return;
  }
  if (seededSelectControls.has(selector)) {
    inputs.push({
      inputId: `${caseId}:seeded-option`, kind: "server-seeded-option", actualValue: "first-non-empty-option",
      minimumNonEmptyOptions: 1, sensitive: false,
    });
    controlSequence.push(nativeAction("select-control", {
      actionId: `${caseId}:select-seeded-control`, selector, value: "first-non-empty-option",
    }));
    return;
  }
  if (enabledControls.has(selector) || linkControls.has(selector)) {
    controlSequence.push(nativeAction("activate-control", {
      actionId: `${caseId}:activate-control`, selector,
    }));
    return;
  }
  throw new Error(`${caseId} canonical selector has no exact actionable workflow classification: ${selector}`);
}

function buildProductAction({
  canonicalCase,
  implementationItem,
  screenRoute,
  workflowClass,
  primaryControl,
  negativeRoute,
  crossRouteNegative,
}) {
  const caseId = canonicalCase.testId;
  if (workflowClass === "negative-route") {
    return {
      kind: "negative-route-request",
      endpoint: {
        method: "GET",
        path: negativeRoute || crossRouteNegative ? canonicalCase.route : screenRoute,
        allowedStatuses: [404],
      },
      localAction: null,
    };
  }
  if (workflowClass === "form-submit") {
    const selector = normalizeCanonicalSelector(canonicalCase.controlAction?.selector);
    const contract = formSubmitSpec(caseId, selector);
    return {
      kind: "form-submit-request",
      endpoint: {
        method: contract.method,
        path: contract.path,
        allowedStatuses: [...contract.allowedStatuses],
      },
      localAction: null,
    };
  }
  if (workflowClass === "persisted-mutation") {
    const action = mutationProductAction(caseId, implementationItem, primaryControl);
    assert(Boolean(action.endpoint) !== Boolean(action.localAction), `${caseId} mutation product action must be exclusive`);
    return action;
  }
  if (workflowClass === "actionable") {
    if (caseId === "RULE-101") {
      return {
        kind: "rejected-ui-action",
        endpoint: null,
        localAction: {
          type: "activate",
          target: primaryControl.selector,
          effect: "block the UI save before dispatch and preserve the reviewed rule registry",
          verificationEndpoint: {
            method: "PUT",
            path: "/lab/analysis/va-rules/{fixtureId}",
            allowedStatuses: [400],
          },
        },
      };
    }
    return {
      kind: "local-control-action",
      endpoint: null,
      localAction: {
        type: localActionType(primaryControl.selector),
        target: primaryControl.selector,
        effect: implementationItem.semanticEvidence?.stateOracle?.expectedBehavior || "reviewed local product state transition",
      },
    };
  }
  return {
    kind: workflowClass === "hidden-disabled" ? "product-boundary-read" : "product-state-read",
    endpoint: {
      method: "GET",
      path: canonicalCase.route || screenRoute,
      allowedStatuses: [200],
    },
    localAction: null,
  };
}

function formSubmitSpec(caseId, canonicalSelector) {
  const override = formSubmitOverrides.get(caseId);
  if (override) return override;
  const contract = formContracts.get(canonicalSelector);
  assert(contract, `${caseId} form submit contract missing`);
  const allowedStatuses = caseId === "AUTH-005"
    ? [403]
    : (caseId === "AUTH-035" ? [401] : [302]);
  return {
    selector: canonicalSelector,
    submitSelector: `${canonicalSelector} button[type="submit"]`,
    route: null,
    method: String(contract.method || "POST").toUpperCase(),
    path: contract.action,
    fields: [...contract.fields],
    allowedStatuses,
  };
}

function mutationProductAction(caseId, implementationItem, primaryControl) {
  const endpoint = (method, path, allowedStatuses = [200, 201]) => ({
    kind: "persisted-mutation-request",
    endpoint: { method, path, allowedStatuses },
    localAction: null,
  });
  const local = (type, effect) => ({
    kind: "persisted-workflow-local-action",
    endpoint: null,
    localAction: { type, target: primaryControl.selector, effect },
  });
  if (caseId === "UI-004") return endpoint("POST", "/password/change", [302, 400]);
  if (caseId === "UI-005") return endpoint("POST", "/logout", [302]);
  if (caseId === "UI-023") return endpoint("PUT", "/ops/api/vlm/profiles/{fixtureId}");
  if (caseId === "UI-029") return endpoint("DELETE", "/ops/api/vlm/profiles/{fixtureId}", [200, 404]);
  if (["UI-109", "SRC-066"].includes(caseId)) {
    return endpoint("PUT", "/ops/api/onvif/channels/{fixtureId}");
  }
  if (caseId === "AUTH-018") return endpoint("POST", "/ops/api/users", [201]);
  if (caseId === "AUTH-019") return endpoint("PUT", "/ops/api/users/{fixtureId}");
  if (["AUTH-036", "AUTH-039"].includes(caseId)) {
    return endpoint("POST", "/client/api/access-requests", [201]);
  }
  if (caseId === "AUTH-037") {
    return endpoint("POST", "/ops/api/access-requests/{fixtureId}/approve");
  }
  if (caseId === "AUTH-038") {
    return endpoint("POST", "/ops/api/access-requests/{fixtureId}/reject");
  }
  if (["SRC-001", "SRC-002", "SRC-003", "SRC-004", "SRC-005", "SRC-009"].includes(caseId)) {
    return endpoint("PUT", "/ops/api/sources/{fixtureId}");
  }
  if (["SRC-017", "SRC-018"].includes(caseId)) {
    return endpoint("PUT", "/ops/api/views/{fixtureId}");
  }
  if (["RULE-004", "RULE-005", "RULE-008"].includes(caseId)) {
    return endpoint("PUT", "/lab/analysis/va-rules/{fixtureId}");
  }
  if (["RULE-011", "RULE-012"].includes(caseId)) {
    return endpoint("PUT", "/lab/analysis/va-rules/{fixtureId}");
  }
  if (caseId === "RULE-030") return endpoint("PUT", "/lab/analysis/profiles/{fixtureId}");
  if (caseId === "RULE-016") {
    return endpoint("PUT", "/lab/analysis/va-rules/{fixtureId}", [200]);
  }
  if (caseId === "RULE-006") return endpoint("DELETE", "/lab/analysis/va-rules/{fixtureId}");
  if (["RULE-018", "RULE-019"].includes(caseId)) {
    return endpoint("PUT", "/lab/analysis/rules/{fixtureId}");
  }
  if (["RULE-073", "RULE-075"].includes(caseId)) {
    return endpoint("PUT", "/lab/analysis/rules/{fixtureId}", [200]);
  }
  if (caseId === "RULE-020") return endpoint("DELETE", "/lab/analysis/rules/{fixtureId}");
  if (["RULE-022", "RULE-023"].includes(caseId)) {
    return endpoint("PUT", "/lab/analysis/profiles/{fixtureId}");
  }
  if (caseId === "RULE-024") return endpoint("DELETE", "/lab/analysis/profiles/{fixtureId}");
  if (caseId === "EVT-021") return endpoint("PUT", "/ops/api/events/reviews/{fixtureId}");
  if (caseId === "CLIENT-009") return endpoint("PUT", "/client/api/preferences/live-layout");
  if (caseId === "RULE-102") return local("update-review-loop", "render event type/conflict/reference/preset/EventRecord review state");
  if (caseId === "CLIENT-002") return local("click", "start selected live tile and create its client session");
  if (caseId === "CLIENT-005") return local("click", "stop all live tiles and close their client sessions");
  if (caseId === "SAFE-038") return local("click", "apply draft fields without registry, event, schema, media, or viewer write");
  if (caseId === "UI-036") return local("click", "apply the selected VLM candidate to the event-template draft without persisting it");
  const proof = implementationItem.semanticEvidence?.review4Proof || {};
  return local(
    proof.requirement?.operation || "reviewed-mutation",
    implementationItem.semanticEvidence?.stateOracle?.expectedBehavior || "reviewed product mutation",
  );
}

function buildWorkflowInputs({ canonicalCase, implementationItem, workflowClass, canonicalSelector, productAction }) {
  const caseId = canonicalCase.testId;
  const inputs = [{
    inputId: `${caseId}:semantic-expectation`,
    kind: "reviewed-semantic-expectation",
    valueSha256: implementationItem.semanticEvidence?.stateOracle?.expectedBehaviorSha256 || "",
    sensitive: false,
  }];
  if (workflowClass === "form-submit") {
    const contract = formSubmitSpec(caseId, canonicalSelector);
    const values = formValues(caseId, contract.fields);
    inputs.push({
      inputId: `${caseId}:form-values`,
      kind: "form-values",
      actualValue: values,
      fields: [...contract.fields],
      submit: true,
      seedReference: {
        fixtureId: workflowFixtureId(caseId),
        accountRole: canonicalCase.accountRole,
        route: productAction.endpoint.path,
      },
      sensitive: contract.fields.some(field => /password|token|confirm/i.test(field)),
      redacted: contract.fields.some(field => /password|token|confirm/i.test(field)),
    });
    return inputs;
  }
  if (workflowClass === "persisted-mutation") {
    const exactValues = persistedMutationInputValues(caseId);
    inputs.push({
      inputId: `${caseId}:mutation-fixture`,
      kind: "reversible-fixture-record",
      actualValue: {
        id: workflowFixtureId(caseId),
        displayName: `REVIEW4 ${caseId} fixture`,
        operation: implementationItem.semanticEvidence?.review4Proof?.requirement?.operation || "write",
        ...exactValues,
      },
      seedReference: {
        fixtureId: workflowFixtureId(caseId),
        accountRole: canonicalCase.accountRole,
        route: canonicalCase.route,
      },
      sensitive: false,
    });
    return inputs;
  }
  if (workflowClass === "actionable") {
    if (caseId === "RULE-101") {
      inputs.push({
        inputId: `${caseId}:local-control-input`,
        kind: "rejected-endpoint-fixture",
        actualValue: {
          method: productAction.localAction.verificationEndpoint.method,
          path: productAction.localAction.verificationEndpoint.path,
          body: { analysisClasses: ["person"], profileClasses: ["vehicle"], templateClasses: ["person"] },
        },
        seedReference: {
          fixtureId: workflowFixtureId(caseId),
          accountRole: canonicalCase.accountRole,
          route: canonicalCase.route,
        },
        sensitive: false,
      });
      return inputs;
    }
    if (productAction.endpoint) {
      inputs.push({
        inputId: `${caseId}:local-control-input`,
        kind: "rejected-endpoint-fixture",
        actualValue: {
          method: productAction.endpoint.method,
          path: productAction.endpoint.path,
          body: caseId === "RULE-101"
            ? { analysisClasses: ["person"], profileClasses: ["vehicle"], templateClasses: ["person"] }
            : {},
        },
        seedReference: {
          fixtureId: workflowFixtureId(caseId),
          accountRole: canonicalCase.accountRole,
          route: canonicalCase.route,
        },
        sensitive: false,
      });
      return inputs;
    }
    inputs.push({
      inputId: `${caseId}:local-control-input`,
      kind: "local-control-input",
      actualValue: {
        selector: productAction.localAction.target,
        operation: productAction.localAction.type,
      },
      sensitive: false,
    });
    return inputs;
  }
  inputs.push({
    inputId: `${caseId}:product-read-input`,
    kind: workflowClass === "negative-route" ? "negative-route-request" : "product-state-request",
    actualValue: {
      method: productAction.endpoint.method,
      path: productAction.endpoint.path,
      accountRole: canonicalCase.accountRole,
    },
    sensitive: false,
  });
  return inputs;
}

function persistedMutationInputValues(caseId) {
  if (caseId === "RULE-011") {
    return { profileId: "9101", expectedProfileMapping: true };
  }
  if (caseId === "RULE-012") {
    return {
      region: { x: 0.1, y: 0.1, width: 0.6, height: 0.6 },
      polygon: [[0.1, 0.1], [0.7, 0.1], [0.7, 0.7], [0.1, 0.7]],
    };
  }
  if (caseId === "RULE-030") {
    return { minConfidence: 0.75, expectedValidation: "accepted-range" };
  }
  return {};
}

function formValues(caseId, fields) {
  const fixtureId = workflowFixtureId(caseId);
  const values = {
    username: fixtureId,
    password: { secretRef: `${caseId}:fixture-password`, redacted: true },
    confirm: { secretRef: `${caseId}:fixture-password`, redacted: true },
    confirmPassword: { secretRef: `${caseId}:fixture-password`, redacted: true },
    currentPassword: { secretRef: `${caseId}:fixture-current-password`, redacted: true },
    token: { secretRef: `${caseId}:fixture-invite-token`, redacted: true },
    displayName: `REVIEW4 ${caseId}`,
    contact: `${fixtureId}@example.invalid`,
    viewId: `${fixtureId}-view`,
    reason: `${caseId} exact workflow verification`,
    role: "viewer",
    ttlSeconds: 3600,
  };
  return Object.fromEntries(fields.map(field => [field, values[field] ?? `${fixtureId}-${field}`]));
}

function workflowFixtureId(caseId) {
  if (/^RULE-\d+$/.test(caseId)) {
    return String(3_920_000 + Number(caseId.replace(/\D/g, "")));
  }
  const channelCase = /^(?:SRC-(?:001|002|003|004|005|009|017|018|066)|UI-109)$/.exec(caseId);
  if (channelCase) {
    const digits = Number(caseId.replace(/\D/g, ""));
    return String(3_900_000 + (caseId.startsWith("UI-") ? 100_000 : 0) + digits);
  }
  return `${caseId.toLowerCase()}-review4-fixture`;
}

function persistedUiLifecycle(caseId, productAction, inputs) {
  const fixtureId = inputs.find(input => input.kind === "reversible-fixture-record")?.actualValue?.id ||
    workflowFixtureId(caseId);
  let adapter = "";
  if (caseId === "UI-023") adapter = "vlm-profile-save";
  else if (caseId === "UI-029") adapter = "vlm-profile-delete";
  else if (["UI-109", "SRC-001", "SRC-002", "SRC-003", "SRC-004", "SRC-005", "SRC-009", "SRC-017", "SRC-018", "SRC-066"].includes(caseId)) adapter = "channel-source-view-pair";
  else if (caseId === "AUTH-018") adapter = "auth-user-create";
  else if (caseId === "AUTH-019") adapter = "auth-user-update";
  else if (caseId === "AUTH-037") adapter = "auth-access-approve";
  else if (caseId === "AUTH-038") adapter = "auth-access-reject";
  else if (caseId === "AUTH-039") adapter = "auth-access-request-create";
  else if (["RULE-004", "RULE-005", "RULE-008", "RULE-011", "RULE-012", "RULE-016"].includes(caseId)) adapter = "rule-va-save";
  else if (caseId === "RULE-006") adapter = "rule-va-delete";
  else if (["RULE-018", "RULE-019", "RULE-073", "RULE-075"].includes(caseId)) adapter = "rule-event-save";
  else if (caseId === "RULE-020") adapter = "rule-event-delete";
  else if (["RULE-022", "RULE-023", "RULE-030"].includes(caseId)) adapter = "rule-profile-save";
  else if (caseId === "RULE-024") adapter = "rule-profile-delete";
  else if (caseId === "EVT-021") adapter = "event-review-save";
  else if (caseId === "CLIENT-009") adapter = "client-layout-save";
  assert(adapter, `${caseId} persisted UI lifecycle adapter is not classified`);
  let requestBinding = null;
  if (adapter === "channel-source-view-pair") {
    const atomicOnvif = ["UI-109", "SRC-066"].includes(caseId);
    requestBinding = {
      mode: atomicOnvif ? "atomic-pair" : "ordered-source-view-pair",
      expectedRequests: atomicOnvif
        ? [{ method: "PUT", pathTemplate: "/ops/api/onvif/channels/{fixtureId}" }]
        : [
            { method: "PUT", pathTemplate: "/ops/api/sources/{fixtureId}" },
            { method: "PUT", pathTemplate: "/ops/api/views/{fixtureId}" },
          ],
    };
  }
  return {
    schema: "media-server.v390-ui-persisted-lifecycle.v1",
    adapter,
    fixtureBinding: {
      fixtureId,
      requestMethod: productAction.endpoint?.method || "",
      requestPathTemplate: productAction.endpoint?.path || "",
    },
    requestBinding,
    requiredPhases: ["select-or-open", "populate-valid-product-input", "activate-primary-control", "correlated-request", "authoritative-readback"],
  };
}

function formSubmitUiLifecycle(caseId, form) {
  const entrySelector = caseId === "AUTH-014" ? "#add-user-btn" : null;
  let adapter = "auth-standard-submit";
  if (caseId === "AUTH-014") adapter = "auth-user-create";
  else if (["AUTH-015", "AUTH-033"].includes(caseId)) adapter = "auth-invite-create";
  else if (caseId === "AUTH-036") adapter = "auth-access-request-create";
  else if (caseId === "UI-005") adapter = "auth-logout";
  const fieldControls = form.fields.map(name => {
    if (name === "role") return { name, control: "select" };
    if (caseId === "AUTH-014" && name === "viewId") {
      return {
        name,
        control: "hidden-binding",
        bindingSelector: "[data-assignment-view]",
        valueSource: "runtime-default-view",
      };
    }
    return { name, control: "fill" };
  });
  return {
    schema: "media-server.v390-ui-form-lifecycle.v1",
    adapter,
    formSelector: form.selector,
    submitSelector: form.submitSelector,
    entrySelector,
    fieldControls,
    requiredPhases: [
      "enter-form-mode",
      "populate-typed-controls",
      "activate-submit-control",
      "capture-correlated-response-identity",
      "authoritative-readback",
    ],
  };
}

function localActionType(selector) {
  if (fillControls.has(selector)) return "fill";
  if (checkboxControls.has(selector)) return "toggle-checkbox";
  if (selectControls.has(selector) || seededSelectControls.has(selector)) return "select";
  if (detailsControls.has(selector)) return "toggle-details";
  if (linkControls.has(selector)) return "follow-link";
  return "activate";
}

function distinctExpectedStateLocator(proof, readbackLocator) {
  for (const candidate of [proof.roles?.state, proof.roles?.action, proof.roles?.dispatch, proof.roles?.owner]) {
    const locator = compactSourceLocator(candidate);
    if (locator?.file && locatorIdentity(locator) !== locatorIdentity(readbackLocator)) return locator;
  }
  throw new Error("no independent expected product state locator");
}

function sourceLocatorFromAnchor(caseId, source) {
  const sourceText = fs.readFileSync(path.join(rootDir, source.file), "utf8");
  assert(sourceText.includes(source.anchor), `${caseId} primary control source anchor missing from ${source.file}`);
  const sourceFileSha256 = sha256Text(sourceText);
  return {
    file: source.file,
    symbol: `review4-primary-control:${caseId}`,
    anchor: source.anchor,
    anchorSha256: sha256Text(source.anchor),
    contextSha256: sourceFileSha256,
    sourceFileSha256,
  };
}

function compactSourceLocator(value) {
  if (!value || typeof value !== "object") return null;
  return {
    file: value.file || "",
    symbol: value.symbol || "",
    anchor: value.anchor || "",
    anchorSha256: sha256Text(value.anchor || ""),
    contextSha256: value.contextSha256 || sha256Text(value.anchor || ""),
  };
}

function hasMixedSuccessAndErrorStatuses(statuses) {
  const values = Array.isArray(statuses) ? statuses : [];
  const hasSuccess = values.some(status => status >= 200 && status < 400);
  const hasError = values.some(status => status >= 400 && status < 600);
  return hasSuccess && hasError;
}

function containsLiteralAuthMaterial(value) {
  if (!value || typeof value !== "object") return false;
  for (const [key, fieldValue] of Object.entries(value)) {
    if (/^(?:password|currentPassword|confirm|confirmPassword|token)$/i.test(key)) {
      if (!fieldValue || typeof fieldValue !== "object" || Array.isArray(fieldValue) ||
          typeof fieldValue.secretRef !== "string" || fieldValue.secretRef.length === 0 ||
          fieldValue.redacted !== true) {
        return true;
      }
    }
    if (fieldValue && typeof fieldValue === "object" && containsLiteralAuthMaterial(fieldValue)) return true;
  }
  return false;
}

function sourceIdentity(prefix, locator) {
  return `${prefix}:${locatorIdentity(locator)}`;
}

function locatorIdentity(value) {
  return `${value?.file || ""}#${value?.symbol || ""}#${value?.contextSha256 || ""}`;
}

function sha256Text(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function buildActionSemanticCompletion({
  caseId,
  screenRoute,
  action,
  negativeRoute = false,
  primaryActionId,
  primaryControl,
  productAction,
  expectedProductState,
  independentReadback,
  workflowInputs,
}) {
  const primary = action.actionId === primaryActionId;
  const negative = action.kind === "navigate-negative" || (action.kind === "navigate" && negativeRoute);
  const initialNavigation = action.kind === "navigate" && !primary;
  const setupNavigation = action.kind === "navigate-action-route";
  const independent = action.kind === "verify-independent-readback";
  const phase = primary
    ? "primary-action"
    : (initialNavigation ? "initial-navigation" : (setupNavigation ? "setup-navigation" : "independent-readback"));
  const correlationId = initialNavigation
    ? `${caseId}:navigation`
    : `${action.actionId}:completion`;
  let request = null;
  let localTransition = null;
  const localCompletionContract = primary ? localCompletionContracts.get(caseId) || null : null;
  if (primary) {
    if (productAction.endpoint) {
      request = actionRequestContract(correlationId, productAction.endpoint, workflowInputs, caseId);
    } else {
      localTransition = {
        selector: primaryControl.selector,
        type: productAction.localAction.type,
        target: productAction.localAction.target,
        effect: productAction.localAction.effect,
        property: localCompletionContract ? null : localTransitionProperty(action),
        ...(localCompletionContract ? structuredClone(localCompletionContract) : {}),
      };
    }
  } else if (initialNavigation) {
    request = actionRequestContract(correlationId, {
      method: "GET",
      path: screenRoute,
      allowedStatuses: [200],
    });
  } else if (setupNavigation) {
    request = actionRequestContract(correlationId, {
      method: "GET",
      path: action.route,
      allowedStatuses: [200],
    });
  }
  const requiredSource = negative
    ? "negative-route-status"
    : (localTransition ? "local-transition-readback" : "endpoint-dom");
  return {
    schema: "media-server.v390-ui-action-completion.v2",
    required: true,
    phase,
    actionId: action.actionId,
    actionKind: action.kind,
    controlSelector: primary ? primaryControl.selector : (action.selector || null),
    linkedPrimaryActionId: independent ? primaryActionId : null,
    requiredSource,
    correlationId,
    request,
    localTransition,
    expectedBehaviorSha256: primary || independent ? expectedProductState.expectedBehaviorSha256 : "",
    readback: {
      identity: primary || independent ? independentReadback.identity : `${caseId}:navigation`,
      expectedStateIdentity: primary || independent ? expectedProductState.identity : "",
      expectedBehaviorSha256: primary || independent ? expectedProductState.expectedBehaviorSha256 : "",
      allowedObservationSources: ["browser-dom", "readback-request", "event-record", "server-log"],
      staticLocatorIsNotRuntimePass: primary || independent,
    },
    readbackIdentity: primary || independent ? independentReadback.identity : `${caseId}:navigation`,
    readbackExpectation: localCompletionContract
      ? { postconditions: structuredClone(localCompletionContract.postconditions || []) }
      : semanticReadbackExpectation(action),
    attestedAlternatives: negative ? [] : ["persisted-readback", "event-record", "server-log"],
  };
}

function actionRequestContract(correlationId, endpoint, workflowInputs = [], caseId = "") {
  const urlPathTemplate = endpoint.path;
  const pathParameters = {};
  const parameterNames = [...String(urlPathTemplate).matchAll(/\{([^/{}]+)\}/g)].map(match => match[1]);
  const fixtureId = workflowInputs
    .map(input => input?.seedReference?.fixtureId || input?.actualValue?.id || "")
    .find(Boolean) || (caseId ? workflowFixtureId(caseId) : "");
  for (const name of parameterNames) {
    assert(["fixtureId", "id"].includes(name), `${caseId} unsupported endpoint path parameter: ${name}`);
    assert(fixtureId, `${caseId} endpoint path parameter ${name} has no exact workflow fixture`);
    pathParameters[name] = fixtureId;
  }
  const urlPath = String(urlPathTemplate).replace(/\{([^/{}]+)\}/g, (_match, name) =>
    encodeURIComponent(pathParameters[name]));
  return {
    correlationHeader: "x-media-server-correlation-id",
    correlationId,
    correlationSource: "request-header",
    method: endpoint.method,
    urlPathTemplate,
    urlPath,
    pathParameters,
    allowedStatuses: [...endpoint.allowedStatuses],
  };
}

function localTransitionProperty(action) {
  if (action.kind === "toggle-details") return "open";
  if (action.kind === "fill-control") return "value";
  if (action.kind === "toggle-checkbox") return "checked";
  if (action.kind === "select-control") return "selectedValues";
  if (action.kind === "activate-control") return "url";
  return "state";
}

function primaryWorkflowAction(actions, negativeRoute) {
  if (negativeRoute) return actions[0];
  return actions.find(action =>
    !["navigate", "navigate-action-route", "wait-visible", "verify-independent-readback"].includes(action.kind),
  ) || actions[0];
}

function semanticReadbackExpectation(action) {
  if (action.kind === "navigate") return { exists: true, visible: true };
  if (action.kind === "navigate-action-route") return { route: action.route, exists: true, visible: true };
  if (action.kind === "navigate-negative") return { navigationStatus: action.allowedStatuses[0] };
  if (["assert-product-state", "assert-product-boundary", "assert-visible-read-model"].includes(action.kind)) {
    return { exists: true, visible: true };
  }
  if (action.kind === "assert-hidden-control") return { exists: true, visible: false };
  if (action.kind === "assert-disabled-control") return { exists: true, disabled: true };
  if (action.kind === "assert-enabled-control") return { exists: true, visible: true, disabled: false };
  if (action.kind === "assert-link-target") return { tag: "a", hrefKind: "same-origin-path" };
  if (action.kind === "assert-seeded-select") {
    return { tag: "select", minimumNonEmptyOptions: action.minimumNonEmptyOptions };
  }
  if (action.kind === "submit-form") {
    return { submitted: true, method: action.method, action: action.action, fields: [...action.fields] };
  }
  if (action.kind === "execute-persisted-action") return { persistedMutationObserved: true };
  if (action.kind === "verify-independent-readback") {
    return {
      readbackIdentity: action.readbackIdentity,
      expectedStateIdentity: action.expectedStateIdentity,
      expectedBehaviorSha256: action.expectedBehaviorSha256,
      runtimeEvidenceRequired: true,
    };
  }
  if (action.kind === "activate-control") return { activated: true };
  if (action.kind === "toggle-details") return { changedProperty: "open", changed: true };
  if (action.kind === "fill-control") return { property: "value", value: action.value };
  if (action.kind === "toggle-checkbox") return { changedProperty: "checked", changed: true };
  if (action.kind === "select-control") return { property: "selectedValues", value: [action.value] };
  throw new Error(`semantic completion expectation missing for ${action.kind}`);
}

function primarySemanticCompletion(actions) {
  const primary = actions.find(action =>
    !["navigate", "navigate-action-route", "wait-visible", "navigate-negative"].includes(action.kind),
  ) || actions.find(action => action.kind === "navigate-negative") || actions[0];
  return structuredClone(primary.semanticCompletion);
}

function compactLocator(value) {
  if (!value || typeof value !== "object") return null;
  return {
    file: value.file || "",
    symbol: value.symbol || "",
    contextSha256: value.contextSha256 || "",
  };
}

function isRouteRootSelector(value) {
  return value === "body" || /^body\.(?:ops|client|auth|product)-shell$/.test(value || "");
}

function normalizeCanonicalSelector(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  if (value === '[data-testid="${escapeHtml(testId)}"]') {
    return '[data-testid="client-dashboard-safe-summary"]';
  }
  if (new RegExp(dynamicSelectorPattern).test(value)) return null;
  return value;
}

function inferNetworkUrlIncludes(canonicalCase) {
  const candidates = [canonicalCase.route, canonicalCase.controlAction?.actionAnchor]
    .filter(value => typeof value === "string" && value.includes("/api/"))
    .map(value => value.includes("{") ? value.slice(0, value.indexOf("{")) : value);
  return [...new Set(candidates)];
}

function nativeAction(kind, fields) {
  return { kind, dispatch: "playwright-native", ...fields };
}

function sha256Json(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function assertExact(actual, expected, label) {
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${label} mismatch`);
}

function assertUnique(values, label) {
  assert(new Set(values).size === values.length, `${label} contain duplicates`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
