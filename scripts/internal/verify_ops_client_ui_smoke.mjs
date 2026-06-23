#!/usr/bin/env node
// 파일 용도: /ops와 /client 제품 shell의 안정 selector와 client 노출 금지 항목을 빠르게 검증한다.

import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import {
  browserFallbackUnavailableMessage,
  findChrome,
  isCodexInAppBrowserEnvironment,
  isTruthy,
  openBrowserPage,
  parseWidthList,
  runVisualSmoke,
  writeVisualArtifactIndex,
} from "./ui_visual_smoke_lib.mjs";

const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Ops/Client UI smoke

Usage:
  ./server.sh verify-ops-client-ui [options]

Options:
  --http-base <url>         실행 중인 서버 HTTP base입니다. 기본 http://127.0.0.1:8081.
  --timeout-ms <ms>         HTTP/브라우저 대기 시간입니다. 기본 30000.
  --browser-mode <mode>     auto, in-app, chrome, static 중 하나입니다. 기본 auto.
  --in-app-evidence <path>  Codex 인앱 브라우저 직접 확인 evidence JSON입니다.
  --screenshots[=1]         대표 화면 screenshot smoke를 함께 수행합니다.
  --allow-chrome-fallback[=1]
                            인앱 브라우저가 없는 외부 환경에서 Chrome fallback을 허용합니다.
                            Codex 세션에서는 --browser-mode chrome과 함께 지정한 명시
                            예외일 때만 Chrome fallback을 허용합니다.
  --chrome-path <path>      fallback용 Chrome/Chromium 실행 파일 경로입니다.
  --visual-widths <csv>     screenshot 검증 viewport 폭 목록입니다. 기본 320,390,760,1180.
  --visual-height <px>      screenshot 검증 viewport 높이입니다. 기본 900.
  --debug-port-base <port>  fallback용 Chrome CDP port 시작값입니다. 기본 9700.
  --output-dir <path>       screenshot/log 출력 디렉터리입니다.
  -h, --help                도움말 출력
`);
}
assertKnownOptions(rawArgs, [
  "http-base",
  "timeout-ms",
  "browser-mode",
  "in-app-evidence",
  "screenshots",
  "allow-chrome-fallback",
  "chrome-path",
  "visual-widths",
  "visual-height",
  "debug-port-base",
  "output-dir",
  "h",
  "help",
]);
const args = parseArgs(rawArgs);
const httpBase = (args.httpBase || "http://127.0.0.1:8081").replace(/\/+$/, "");
const timeoutMs = Number(args.timeoutMs || 30000);
const browserMode = normalizeBrowserMode(args.browserMode || process.env.MEDIA_SERVER_UI_BROWSER_MODE || "auto");
if (browserMode === "chrome" && isTruthy(args.allowChromeFallback)) {
  process.env.MEDIA_SERVER_UI_BROWSER_MODE = "chrome";
  process.env.MEDIA_SERVER_ALLOW_CHROME_FALLBACK = "1";
}
const inAppEvidencePath = args.inAppEvidence || process.env.MEDIA_SERVER_IN_APP_BROWSER_EVIDENCE || "";
const inAppEvidence = loadInAppEvidence(inAppEvidencePath);
const codexInAppBrowserAvailable = isCodexInAppBrowserAvailable();
const chromeFallbackAllowed = shouldAllowChromeFallback();
const screenshotEnabled = isTruthy(args.screenshots);
const chromePath = chromeFallbackAllowed ? (args.chromePath || findChrome()) : "";
const visualWidths = parseWidthList(args.visualWidths || "320,390,760,1180");
const visualHeight = Number(args.visualHeight || 900);
const debugPortBase = Number(args.debugPortBase || 9700);
const runId = `ops-client-ui-${Date.now()}-${process.pid}`;
const outputDir = args.outputDir || path.join(os.tmpdir(), `media_server_${runId}`);
const clientLiveA11ySnapshot = JSON.parse(fs.readFileSync(path.join(process.cwd(), "test/fixtures/client_live_tile_a11y_i18n_snapshot.json"), "utf8"));

if (codexInAppBrowserAvailable && chromeFallbackAllowed && !(browserMode === "chrome" && isTruthy(process.env.MEDIA_SERVER_ALLOW_CHROME_FALLBACK))) {
  throw new Error(browserFallbackUnavailableMessage());
}

const productShellMust = [
  'class="product-shell',
  'class="brand-mark"',
  'id="themeToggleBtn"',
  'class="account-menu"',
  "window.MediaServerUi",
];

const opsShellMust = [
  'aria-label="운영 메뉴"',
  'href="/ops/home"',
  'href="/client/live"',
  '클라이언트',
];

const clientShellMust = [
  'aria-label="클라이언트 메뉴"',
  'id="views-data"',
  '<script type="application/json" id="views-data">',
  'client-safe-event-digest',
  'eventDigest',
  'viewer-safe event digest',
  'media-server.client.event-digest.v1',
  'client-safe-resolution-digest',
  'resolutionDigest',
  'viewer-safe resolution digest',
  'media-server.client.resolution-digest.v1',
];

const pageChecks = [
  {
    name: "ops-home",
    path: "/ops/home",
    visualSelector: '[data-testid="ops-home-page"]',
    must: ['data-testid="ops-home-page"', 'data-ops-panel="home"', 'id="homeChannelCount"'],
    mustNot: ['class="debug-drawer"', '운영 raw JSON', 'raw JSON'],
  },
  {
    name: "ops-dashboard",
    path: "/ops/dashboard",
    visualSelector: '[data-testid="ops-dashboard-page"]',
    must: ['data-testid="ops-dashboard-page"', 'data-testid="ops-root-cause-panel"', 'data-testid="ops-incident-timeline-panel"', 'data-testid="ops-runtime-operations-console"', 'data-testid="ops-runtime-trend-card"', 'data-testid="ops-va-quality-panel"', 'id="dashActiveSessions"', 'id="dashHealthBadges"', 'id="dashRuntimeTrendSparkline"', 'id="dashRuntimeTrendBaseline"', 'id="dashRootCauseList"', 'id="dashIncidentTimelineSearch"', 'id="dashIncidentTimelineSource"', 'id="dashIncidentTimeline"', 'option value="rule-warning"', 'option value="runtime-status"', 'dashboardRuleWarningItems', 'dashboardRuntimeStatusIncidentItems', 'runtimeTrendSparklineHtml', 'data-incident-workflow', 'id="dashRuntimeOpsBadges"', 'id="dashRuntimeOpsList"', 'id="dashVaQualityFilterInput"', 'id="dashScenarioTimeline"', 'id="dashTrackingIssueGroups"', '/ops/api/runtime/status', '/ops/api/source-health', '/ops/api/rules/catalog', '라이브 소스 상태', '런타임 추세', '최근 인시던트 흐름', '런타임 운영 판독', '라이브 VA 이벤트 품질'],
    mustNot: ['/lab/runtime/status'],
  },
  {
    name: "ops-events",
    path: "/ops/events",
    visualSelector: '[data-testid="ops-v300-event-evidence-search-ui"]',
    must: ['data-testid="ops-events-page"', 'data-route-scope="operator-event-review"', 'data-event-review-workflow="operator-inbox"', 'Operator Event Review Inbox', 'id="opsEventsRefresh"', '/ops/api/events/status', 'data-testid="ops-events-semantic-search"', 'id="opsIncidentSearchInput"', 'id="opsIncidentSearchRows"', 'memorySearch', 'data-testid="ops-v300-event-evidence-search-ui"', 'id="opsV300EventEvidenceSearchInput"', 'id="opsV300EventEvidenceRows"', 'eventEvidenceSearch', 'media-server.ops.v300-event-evidence-search-ui.v1', 'data-testid="ops-vlm-summary-candidate-review"', 'id="opsVlmSummaryCandidateRows"', 'vlmSummaryCandidateReview', 'data-testid="ops-incident-triage-board"', 'id="opsIncidentTriageBoardRows"', 'incidentTriageBoard', 'opsIncidentTriageLaneFilter', 'opsIncidentTriageSort', 'data-testid="ops-incident-decision-scorecard"', 'id="opsIncidentDecisionScorecardRows"', 'incidentDecisionScorecard', 'priorityReasonChips', 'data-testid="ops-operational-action-pack"', 'id="opsOperationalActionPackRows"', 'operationalActionPack', 'releaseSafeEvidenceBundle', 'alertDryRunRoute', 'sourceHealthRecheck', 'data-testid="ops-incident-action-readiness-queue"', 'id="opsIncidentActionReadinessQueueRows"', 'incidentActionReadinessQueue', 'readinessStatus', 'fieldSmokeRequired', 'autoActionWritePerformed', 'externalDeliveryPerformed', 'data-testid="ops-evidence-intake-field-readiness"', 'id="opsEvidenceIntakeFieldReadinessRows"', 'evidenceIntakeFieldReadiness', 'evidenceIntakeStatus', 'sourceHealthReadiness', 'fieldSmokeStatus', 'endpointCredentialRequired', 'credentialMaterialExposed', 'rawEvidenceMaterialExposed', 'data-testid="ops-runtime-evidence-window"', 'id="opsRuntimeEvidenceWindowRows"', 'runtimeEvidenceWindow', 'runtimeEvidencePacket', 'boundedLocalBuffer', 'pageSessionOnly', 'longrunSubstitute', 'persistentArchiveCreated', 'data-testid="ops-rule-what-if-preview"', 'id="opsRuleWhatIfPreviewRows"', 'ruleWhatIfPreview', 'draftComparison', 'conditionPreview', 'manualDraftRoute', 'data-testid="ops-approval-gated-rule-draft-readiness-events"', 'id="opsApprovalGatedRuleDraftReadinessRows"', 'approvalGatedRuleDraftReadiness', 'approvalState', 'validationSummary', 'stagedDraft', 'noAutoSave', 'noAutoApply', 'data-testid="ops-operator-outcome-memory"', 'id="opsOperatorOutcomeMemoryRows"', 'operatorOutcomeMemory', 'deterministicHistoryHint', 'reviewStateBasis', 'auditActionRefs', 'data-testid="ops-similar-incident-lookup"', 'id="opsSimilarIncidentRows"', 'similarIncidents', 'data-testid="ops-incident-timeline-graph"', 'id="opsIncidentTimelineGraphRows"', 'timelineGraph', 'data-testid="ops-explainable-incident-brief"', 'id="opsIncidentBriefRows"', 'incidentBrief', 'data-testid="ops-v310-operator-feature-correction"', 'id="opsV310OperatorFeatureCorrectionRows"', 'operatorFeatureCorrection', 'media-server.ops.operator-feature-correction.v1', 'correctedFeatureLabel', 'featureAliases', 'reanalysisRequested', 'data-release-safe-evidence-bundle', 'release-safe bundle', 'redacted incident evidence bundle', 'data-testid="ops-alert-delivery-integrations"', 'data-alert-contract="separate-from-event-post-payload"', 'data-alert-dry-run="ops-only-no-external-delivery"', 'data-delivery-attempt-log="ops-local-attempt-log"', 'id="alertDeliverySave"', 'id="alertDeliveryDryRun"', 'id="alertDeliveryTest"', 'id="alertDeliveryPayloadPreview"', 'id="alertDeliveryDryRunResult"', '/ops/api/alerts/deliveries', '/ops/api/alerts/deliveries/dry-run', '/ops/api/alerts/deliveries/test', 'data-testid="ops-event-review-inbox"', 'data-review-state="separate-from-event-post-payload"', 'data-vlm-review-state="ops-only-event-record-evidence"', 'data-vlm-review-action-workflow="ops-only-review-state"', 'data-testid="ops-incident-rule-suggestion-review"', 'incidentRuleSuggestionReview', 'data-incident-rule-draft-route', 'data-incident-action-workflow="ops-only-incident-state"', 'data-testid="ops-event-incident-workflow"', 'id="eventReviewStatusFilter"', 'id="eventReviewIncidentStatusFilter"', 'id="event-review-audit-list"', '/ops/api/events/reviews'],
    mustNot: ['href="/ops/events"'],
  },
  {
    name: "ops-events-replay-timeline",
    path: "/ops/events",
    visualSelector: '[data-testid="ops-v310-replay-timeline-ui"]',
    must: ['data-testid="ops-events-page"', 'data-testid="ops-v310-replay-timeline-ui"', 'data-v310-replay-timeline-ui="event-frame-frame-bundle-encoded-clip"', 'id="opsV310ReplayTimelineSummary"', 'id="opsV310ReplayTimelineBadges"', 'id="opsV310ReplayTimelineRows"', 'replayTimeline', 'media-server.ops.v310-replay-timeline-ui.v1', 'event frame', 'representative image', 'frame bundle', 'encoded clip timeline', '/ops/api/events/reviews'],
    mustNot: ['href="/ops/events"'],
  },
  {
    name: "ops-events-unified-resolution-workspace",
    path: "/ops/events",
    visualSelector: '[data-testid="ops-v320-unified-events-workspace"]',
    must: ['data-testid="ops-events-page"', 'data-testid="ops-v320-unified-events-workspace"', 'data-v320-unified-events-workspace="resolution-queue-detail-timeline"', 'id="opsV320UnifiedWorkspaceSummary"', 'id="opsV320UnifiedWorkspaceBadges"', 'id="opsV320ResolutionQueue"', 'id="opsV320ResolutionDetail"', 'id="opsV320ResolutionTimeline"', 'unifiedResolutionWorkspace', 'media-server.ops.v320-unified-events-workspace.v1', 'resolution queue', 'resolution detail', 'resolution timeline', '/ops/api/events/reviews'],
    mustNot: ['href="/ops/events"'],
  },
  {
    name: "ops-events-evidence-quality-layer",
    path: "/ops/events",
    visualSelector: '[data-testid="ops-v320-unified-events-workspace"]',
    must: ['data-testid="ops-events-page"', 'data-testid="ops-v320-unified-events-workspace"', 'id="v320EvidenceQualityGrid"', 'data-v320-evidence-quality', 'data-v320-evidence-quality-ref', 'evidenceQualitySummary', 'evidenceQuality', 'media-server.ops.v320-evidence-quality.v1', 'evidence completeness', 'evidence confidence', 'replay coverage', 'fullReplayEngineExecuted', 'rawEvidenceMaterialExposed', '/ops/api/events/reviews'],
    mustNot: ['href="/ops/events"'],
  },
  {
    name: "ops-events-source-reliability-context",
    path: "/ops/events",
    visualSelector: '[data-testid="ops-v320-unified-events-workspace"]',
    must: ['data-testid="ops-events-page"', 'data-testid="ops-v320-unified-events-workspace"', 'id="v320SourceReliabilityGrid"', 'data-v320-source-reliability', 'data-v320-source-reliability-warning', 'sourceReliabilitySummary', 'sourceReliability', 'media-server.ops.v320-source-reliability-context.v1', 'source health', 'recent failure', 'operator recheck', 'sourceRegistryWritePerformed', 'operatorRecheckRoute', '/ops/api/events/reviews'],
    mustNot: ['href="/ops/events"'],
  },
  {
    name: "ops-events-ai-review-quality-context",
    path: "/ops/events",
    visualSelector: '[data-testid="ops-v320-unified-events-workspace"]',
    must: ['data-testid="ops-events-page"', 'data-testid="ops-v320-unified-events-workspace"', 'id="v320AiReviewQualityGrid"', 'data-v320-ai-review-quality', 'data-v320-ai-review-signal', 'aiReviewQualitySummary', 'aiReviewQuality', 'media-server.ops.v320-ai-review-quality-context.v1', 'correction review', 'uncertainty reason', 'quality badge', 'runtimeProviderCallPerformed', 'rawProviderMaterialExposed', '/ops/api/events/reviews'],
    mustNot: ['href="/ops/events"'],
  },
  {
    name: "ops-events-operator-resolution-flow",
    path: "/ops/events",
    visualSelector: '[data-testid="ops-v320-unified-events-workspace"]',
    must: ['data-testid="ops-events-page"', 'data-testid="ops-v320-unified-events-workspace"', 'id="v320OperatorResolutionFlowGrid"', 'data-v320-operator-resolution-flow', 'data-v320-operator-resolution-audit', 'operatorResolutionFlowSummary', 'operatorResolutionFlow', 'media-server.ops.v320-operator-resolution-flow.v1', 'assignment target', 'operator note', 'close / reopen', 'audit trail', 'operatorResolutionFlowWritePath', '/ops/api/events/reviews'],
    mustNot: ['href="/ops/events"'],
  },
  {
    name: "ops-events-action-readiness-checklist",
    path: "/ops/events",
    visualSelector: '[data-testid="ops-v320-unified-events-workspace"]',
    must: ['data-testid="ops-events-page"', 'data-testid="ops-v320-unified-events-workspace"', 'id="v320ActionReadinessChecklistGrid"', 'data-v320-action-readiness-checklist', 'data-v320-action-readiness-blocker', 'data-v320-action-readiness-item', 'actionReadinessChecklistSummary', 'actionReadinessChecklist', 'media-server.ops.v320-action-readiness-checklist.v1', 'readiness status', 'rule draft', 'evidence bundle', 'notification readiness', 'manualApprovalRequired', 'autoActionWritePerformed', 'externalDeliveryPerformed', '/ops/api/events/reviews'],
    mustNot: ['href="/ops/events"'],
  },
  {
    name: "ops-rules",
    path: "/ops/rules",
    visualSelector: '[data-testid="ops-rules-page"]',
    must: ['data-testid="ops-rules-page"', 'data-testid="ops-approval-gated-rule-draft-readiness"', 'data-approval-gated-rule-draft="manual-approval-staged-only"', 'id="opsApprovalGatedRuleDraftContext"', 'id="opsApprovalGatedRuleDraftRows"', 'approvalDraft=1', 'approvalState', 'staged draft', 'no-auto-save', 'no-auto-apply', 'data-testid="ops-scenario-builder"', 'data-scenario-builder-contract="ui-only-no-engine-change"', 'id="opsScenarioBuilderApply"', 'opsContextActionsHtml', 'data-testid="ops-context-actions"', 'data-action-density="primary-context"', 'id="opsRulesFilterInput"', 'id="opsVaRuleRows"', 'id="opsEventRuleRows"', 'id="opsProfileRows"', 'id="opsAddVaRuleBtn"', 'id="opsAddEventRuleBtn"', 'id="opsAddProfileBtn"', 'id="opsRulesDetailPanel"', 'id="opsVaRuleForm"', 'id="opsEventRuleForm"', 'id="opsProfileForm"', 'id="opsVaRulePreviewVideo"', 'id="opsVaRuleGeometryPreview"', 'id="opsVaRuleTemplateSeedSelect"', 'id="opsVaRuleProfileSelect"', 'id="opsVaRuleChannelSelect"', 'id="opsEventRuleLoiteringGroundPlaneField"', 'id="opsEventRuleLoiteringGroundPlaneToggle"', 'id="opsVaRuleIdDisplay"', 'id="opsEventRuleIdDisplay"', 'id="opsProfileIdDisplay"', 'data-generated-id="va-rule"', 'data-generated-id="event-rule"', 'data-generated-id="profile"', '/ops/api/rules/catalog'],
    mustNot: ['id="opsRulesEditorComponent"', 'id="opsVaRuleIdInput" type="text"', 'id="opsEventRuleIdInput" type="text"', 'id="opsProfileIdInput" type="text"'],
  },
  {
    name: "ops-sources",
    path: "/ops/sources",
    visualSelector: '[data-testid="ops-sources-page"]',
    must: ['data-testid="ops-sources-page"', 'id="channels-body"', 'id="channel-detail-panel"', 'id="channel-id-display"', 'data-generated-id="channel"', 'name="channelId" type="hidden"', 'name="kind"', 'value="onvif"', 'data-source-kind="onvif"', 'data-testid="source-group-site-management"', 'data-scope-contract="view-read-scopes-unchanged"', 'name="site"', 'name="group"', 'name="floor"', 'name="zone"', 'data-testid="onvif-probe-draft-tool"', 'data-testid="onvif-credential-gate"', 'data-credential-store="deferred-product-store"', 'data-redaction="credential-reference-only"', 'id="onvifCredentialGateStatus"', 'id="onvifProbeDraftInput"', 'id="onvifProbeProfileSelect"', 'id="onvifProbeDraftApply"', 'name="onvifStreamUrl"', 'name="whepUrl"', "ONVIF 카메라", "ONVIF 스트림 URI", "ONVIF probe fixture", "ONVIF profile", "Probe draft 적용", "primaryStoreProvider: none", "외부 WHEP URL", "Published WebRTC 소스", "발행 sourceId", "라이브 URL", "VA URL"],
    mustNot: ['AppendTableHead(', 'R"OPS(', 'WHIP Published Source ID', "Registry raw JSON", 'sources-json', 'views-json', 'client-views-json', 'data-testid="onvif-import-panel"', 'id="onvif-import-stub"', 'id="onvifImportSummary"', "ONVIF Live Source import", 'data-testid="channel-bulk-panel"', 'id="channel-bulk-select-all"', 'id="channelBulkDiagnostics"', 'data-testid="source-health-panel"', 'id="channelHealthSummary"', 'id="channelHealthDiagnostics"', 'id="channel-detail-health"', 'name="channelId" type="number"', 'inputmode="numeric" placeholder="1" required'],
  },
  {
    name: "ops-users",
    path: "/ops/users",
    visualSelector: '[data-testid="ops-users-page"]',
    must: ['data-testid="ops-users-page"', 'data-testid="user-lifecycle-policy"', 'id="users-body"', 'id="access-requests-body"', 'id="request-invite-output"', 'data-testid="ops-invites-panel"', 'id="invite-create-form"', 'id="invite-list-body"', 'id="invite-create-output"', 'id="invite-status"', '/ops/api/invites', '토큰/토큰 해시를 노출하지 않습니다', 'id="user-detail-panel"', 'id="user-edit-selected"', 'id="user-save-selected"', 'id="user-close"', 'id="view-assignment"', 'id="view-assignment-options"', 'data-testid="user-channel-assignment-list"', 'data-assignment-view', 'selectedAssignmentViewIds', 'viewId: selectedViewIds[0] ||', 'scopeTemplateForRole(role, selectedViewIds)', 'clientViewLocationLabel', '사이트/그룹', 'id="user-lifecycle-summary"', 'id="user-reset-password-panel"', 'id="user-reset-password-button"', 'data-user-reset-password', 'data-user-set-enabled', '초대 링크는 기본 24시간 동안만 유효', '사용자 감사 JSON/CSV/Diff JSON export', '승인 전: 로그인/세션/채널 권한 없음', '초대 링크 만료', '/ops/api/access-requests'],
  },
  {
    name: "ops-vlm",
    path: "/ops/vlm",
    visualSelector: '[data-testid="ops-vlm-page"]',
    must: ['data-testid="ops-vlm-page"', 'data-testid="ops-vlm-controls"', 'data-testid="ops-vlm-runtime-status-panel"', 'data-testid="ops-vlm-evaluation-result-workflow"', 'data-testid="ops-vlm-options-panel"', 'data-testid="ops-vlm-privacy-transfer-guard-panel"', 'data-testid="ops-vlm-profile-panel"', 'data-testid="ops-vlm-boundary-panel"', 'id="opsVlmProviderStatus"', 'id="opsVlmRuntimeConnectionStatus"', 'id="opsVlmLastEvaluationStatus"', 'id="opsVlmFailureReason"', 'id="opsVlmDefaultOffStatus"', 'id="opsVlmEvaluationRows"', 'id="opsVlmEvaluationSelectionSummary"', 'id="opsVlmExternalTransferWarningAck"', 'id="opsVlmProviderLoggingReviewed"', 'id="opsVlmPrivacyGuardList"', 'id="opsVlmSaveProfile"', '/ops/api/runtime/status', '/ops/api/vlm/install-connection/dry-run', '/ops/api/vlm/evaluation-results', '/ops/api/vlm/profiles', 'media-server.vlm-privacy-transfer-guard.v1', 'credential, prompt, raw response, source URL, raw frame bytes'],
    mustNot: ['cloudProviderApiCalled":true', 'viewerClientExposureAdded":true', 'runtimeVlmCallPerformed":true'],
  },
  {
    name: "client-live",
    path: "/client/live",
    visualSelector: '[data-testid="client-shell-page"]',
    must: ['data-testid="client-shell-page"', 'data-client-active="live"', 'id="views"', 'id="detail"', '/webrtc/config', 'peerConnectionConfig', 'viewMaxTiles', 'maxTiles', 'id="liveDensity"', 'id="liveSummary"', 'data-testid="client-live-action-reduction"', 'data-action-model="source-drag,tile-selection,icon-actions,keyboard-shortcuts"', 'data-disconnect-contract="tile-disconnect-clears-slot,workspace-disconnect-keeps-layout"', 'data-disconnect-scope="tile"', 'disconnectLiveTile', 'clearLiveTileSlot', '전체 연결 해제', 'data-testid="client-live-workspace"', 'data-workspace-model="source-tree,drag-drop-grid,multi-source"', 'data-testid="client-live-source-tree"', 'data-tree-model="group/site/floor/source"', 'data-tree-level="site"', 'data-tree-level="floor"', 'data-testid="client-live-dock-event-feed"', 'data-redaction="viewer-safe-events"', 'client-safe-resolution-digest', 'resolutionDigest', 'viewer-safe resolution digest', 'client-safe-incident-digest', 'incidentDigest', 'viewer-safe incident digest', 'client-safe-followup-digest', 'followUpDigest', 'viewer-safe follow-up digest', 'id="liveDockSide"', 'mediaServerClientLiveDockSide', 'id="liveInfoOverlayToggle"', 'mediaServerClientLiveInfoOverlay', 'data-testid="client-live-tile-info-overlay"', 'data-overlay-trigger="info-toggle"', 'data-testid="client-live-va-overlay-toggle"', 'data-role="mode-buttons"', 'data-mode-action="raw"', 'data-mode-action="va-overlay"', 'setTileOverlayMode', 'toggleLiveTilePlayback', 'data-action="toggle-playback"', 'data-role="tile-playback-icon"', 'data-role="status"', 'data-testid="client-live-layout-presets"', 'data-preset-contract="user-preference,role-preset"', 'liveLayoutPreferenceEndpoint', '/client/api/preferences/live-layout', 'liveCurrentLayoutSnapshot', 'applyLiveLayoutPreference', 'selectedSources', 'overlayDefaults', 'refreshTilePlaybackStats', 'framesPerSecond', 'bytesReceived', 'framesDropped', 'refreshLiveDockEventFeed', '/events?limit=6', 'data-source-view="${escapeHtml(view.viewId)}"', 'draggable="true"', 'assignViewToTile', 'assignSourceToSelectedTile', 'data-drop-state="idle"', 'dataTransfer.setData', "root.addEventListener('drop'", "root.addEventListener('dragover'", 'class="workspace-actions"', 'class="icon-button tile-action-primary"', 'data-action="restart"', 'data-action="stop"', 'restartLiveTile', "event.key === 's'", "event.key === 'Delete'", 'tabindex="0"', 'focusLiveTile', 'ArrowRight', 'aria-describedby="liveTileStatus${tile.index}"', 'data-role="a11y-status"', 'aria-live="polite"', 'aria-atomic="true"', 'liveTileA11yStatus', 'liveTileConnectionLabel', 'clientDynamicText', 'data-client-copy="status"', 'data-client-copy="events"', '타일 ${tile.index + 1} 재생', '타일 ${tile.index + 1} 연결 해제'],
    shellMust: clientShellMust,
    mustNot: [...clientForbiddenText(), 'new RTCPeerConnection({ iceServers: [] })', 'id="liveAllStart"', 'id="liveAllRestart"'],
  },
  {
    name: "client-dashboard",
    path: "/client/dashboard",
    visualSelector: '[data-testid="client-shell-page"]',
    must: ['data-testid="client-shell-page"', 'data-client-active="dashboard"', 'id="views"', 'id="detail"', 'data-testid="client-dashboard-compare"', 'loadClientDashboardCompare', 'client-safe-resolution-digest', 'resolutionDigest', 'viewer-safe resolution digest', 'client-safe-incident-digest', 'incidentDigest', 'viewer-safe incident digest', 'client-safe-followup-digest', 'followUpDigest', 'viewer-safe follow-up digest', 'data-client-copy="status"', 'data-client-copy="events"'],
    shellMust: clientShellMust,
    mustNot: clientForbiddenText(),
  },
  {
    name: "client-events",
    path: "/client/events",
    must: ['data-testid="client-shell-page"', 'data-client-active="events"', 'id="views"', 'id="detail"', 'client-viewer-events', 'data-viewer-flow="events-first"', 'client-safe-resolution-digest', 'resolutionDigest', 'viewer-safe resolution digest', 'client-safe-incident-digest', 'incidentDigest', 'viewer-safe incident digest', 'client-safe-followup-digest', 'followUpDigest', 'viewer-safe follow-up digest'],
    shellMust: clientShellMust,
    mustNot: clientForbiddenText(),
  },
];

let passCount = 0;
let failCount = 0;
const failures = [];

for (const check of pageChecks) {
  try {
    const html = await requestText(check.path);
    const shellMust = check.shellMust || opsShellMust;
    assertContains(check.name, html, [...productShellMust, ...shellMust, ...(check.must || [])]);
    assertOmits(check.name, html, check.mustNot || []);
    if (check.path === "/ops" || check.path.startsWith("/ops/")) {
      assertOpsPrimaryNavContract(check.name, html);
    }
    passCount += 1;
    console.log(`[pass] ${check.name}: ${check.path}`);
  } catch (error) {
    failCount += 1;
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`[${check.name}] ${message}`);
    console.log(`[fail] ${check.name}: ${message}`);
  }
}

try {
  await assertOpsApiContract("ops-api-runtime-status", "/ops/api/runtime/status");
  passCount += 1;
  console.log("[pass] ops-api-runtime-status product endpoint available");
  await assertOpsApiContract("ops-api-rules-catalog", "/ops/api/rules/catalog");
  passCount += 1;
  console.log("[pass] ops-api-rules-catalog product endpoint available");
  await assertOpsApiContract("ops-api-events-status", "/ops/api/events/status?limit=5");
  passCount += 1;
  console.log("[pass] ops-api-events-status product endpoint available");
} catch (error) {
  failCount += 1;
  const message = error instanceof Error ? error.message : String(error);
  failures.push(`[ops-api-contract] ${message}`);
  console.log(`[fail] ops-api-contract: ${message}`);
}

try {
  const payload = await assertClientApiContract("client-api-views", "/client/api/views");
  passCount += 4;
  console.log("[pass] client-api-views source locator fields omitted");
  console.log("[pass] client-api-views debug fields omitted");
  console.log("[pass] client-api-views model provenance fields omitted");
  console.log("[pass] client-api-views auth material fields omitted");
  const views = Array.isArray(payload.views) ? payload.views : [];
  if (views.length === 0) {
    passCount += 1;
    console.log("[pass] client-api-scoped-details: no assigned views to inspect");
  } else {
    let inspected = 0;
    for (const view of views.slice(0, 3)) {
      const viewId = String(view.viewId || "");
      if (!viewId) continue;
      await assertClientApiContract(`client-api-view-${viewId}`, `/client/api/views/${encodeURIComponent(viewId)}`);
      if (view.showDashboard !== false) {
        await assertClientApiContract(`client-api-dashboard-${viewId}`, `/client/api/views/${encodeURIComponent(viewId)}/dashboard`);
      }
      if (view.showEvents !== false) {
        await assertClientApiContract(`client-api-events-${viewId}`, `/client/api/views/${encodeURIComponent(viewId)}/events?limit=5`);
      }
      if (view.showMetadataSummary !== false) {
        await assertClientApiContract(`client-api-metadata-${viewId}`, `/client/api/views/${encodeURIComponent(viewId)}/metadata`);
      }
      inspected += 1;
    }
    passCount += 1;
    console.log(`[pass] client-api-scoped-details: inspected=${inspected}`);
  }
} catch (error) {
  failCount += 1;
  const message = error instanceof Error ? error.message : String(error);
  failures.push(`[client-api-contract] ${message}`);
  console.log(`[fail] client-api-contract: ${message}`);
}

try {
  const renderedLeakResult = await runClientRenderedLeakSmoke();
  passCount += renderedLeakResult.passCount;
  failCount += renderedLeakResult.failCount;
  failures.push(...renderedLeakResult.failures);
} catch (error) {
  failCount += 1;
  const message = error instanceof Error ? error.message : String(error);
  failures.push(`[client-rendered-leak] ${message}`);
  console.log(`[fail] client-rendered-leak: ${message}`);
}

try {
  const opsFormResult = await runOpsAdminFormRegressionSmoke();
  passCount += opsFormResult.passCount;
  failCount += opsFormResult.failCount;
  failures.push(...opsFormResult.failures);
} catch (error) {
  failCount += 1;
  const message = error instanceof Error ? error.message : String(error);
  failures.push(`[ops-admin-form-regression] ${message}`);
  console.log(`[fail] ops-admin-form-regression: ${message}`);
}

console.log("");
console.log("== Ops/Client UI smoke 요약 ==");
console.log(`- 통과: ${passCount}`);
console.log(`- 실패: ${failCount}`);

if (failures.length > 0) {
  console.log("- 실패 상세:");
  for (const failure of failures) {
    console.log(`  - ${failure}`);
  }
  process.exit(1);
}

if (screenshotEnabled && browserMode === "static") {
  console.log("[skip] screenshots: static mode는 브라우저 렌더링을 수행하지 않습니다.");
} else if (screenshotEnabled && inAppEvidence) {
  const evidenceResult = assertInAppScreenshotEvidence();
  if (evidenceResult.failCount > 0) process.exit(1);
} else if (screenshotEnabled && !chromeFallbackAllowed) {
  console.log("[fail] screenshots: Codex 환경에서는 --in-app-evidence로 인앱 브라우저 evidence를 전달해야 합니다.");
  process.exit(1);
} else if (screenshotEnabled) {
  const result = await runVisualSmoke({
    checks: pageChecks
      .filter((check) => check.visualSelector)
      .map((check) => ({
        ...check,
        requiredSelectors: [
          "body.product-shell",
          "#themeToggleBtn",
          ".account-menu",
          check.visualSelector,
        ],
      })),
    httpBase,
    timeoutMs,
    chromePath,
    visualWidths,
    visualHeight,
    debugPortBase,
    outputDir,
    summaryTitle: "Ops/Client screenshot smoke 요약",
  });
  if (result.failCount > 0) process.exit(1);
  const shellHeaderResult = await runShellHeaderAccountSmoke();
  if (shellHeaderResult.failCount > 0) process.exit(1);
  const clientHeaderResult = await runClientHeaderResponsiveSmoke();
  if (clientHeaderResult.failCount > 0) process.exit(1);
  const clientLiveKeyboardResult = await runClientLiveTileKeyboardSmoke();
  if (clientLiveKeyboardResult.failCount > 0) process.exit(1);
  const auditResponsiveResult = await runOpsAuditResponsiveSmoke();
  if (auditResponsiveResult.failCount > 0) process.exit(1);
  const onvifUnsupportedHintResult = await runOpsSourcesOnvifUnsupportedHintSmoke();
  if (onvifUnsupportedHintResult.failCount > 0) process.exit(1);
  const onvifPreviewToolResult = await runOpsSourcesOnvifPreviewToolSmoke();
  if (onvifPreviewToolResult.failCount > 0) process.exit(1);
  writeVisualArtifactIndex({
    outputDir,
    title: "Ops/Client Visual Regression Artifacts",
    command: "./server.sh verify-ops-client-ui --screenshots",
    httpBase,
    visualWidths,
    visualHeight,
    checks: pageChecks.filter((check) => check.visualSelector),
  });
}

function normalizeBrowserMode(value) {
  const mode = String(value || "auto").trim().toLowerCase();
  if (["auto", "in-app", "chrome", "static"].includes(mode)) {
    return mode;
  }
  throw new Error(`invalid browser mode: ${value}`);
}

function isCodexInAppBrowserAvailable() {
  return isCodexInAppBrowserEnvironment();
}

function shouldAllowChromeFallback() {
  if (browserMode === "chrome") {
    if (codexInAppBrowserAvailable) {
      return isTruthy(args.allowChromeFallback) || isTruthy(process.env.MEDIA_SERVER_ALLOW_CHROME_FALLBACK);
    }
    return true;
  }
  if (browserMode === "in-app" || browserMode === "static" || inAppEvidence) {
    return false;
  }
  if (codexInAppBrowserAvailable) {
    return false;
  }
  if (args.allowChromeFallback != null) {
    return isTruthy(args.allowChromeFallback);
  }
  if (process.env.MEDIA_SERVER_ALLOW_CHROME_FALLBACK != null) {
    return isTruthy(process.env.MEDIA_SERVER_ALLOW_CHROME_FALLBACK);
  }
  return true;
}

function loadInAppEvidence(evidencePath) {
  if (!evidencePath) {
    return null;
  }
  const resolved = path.resolve(evidencePath);
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(resolved, "utf8"));
  } catch (error) {
    throw new Error(`invalid in-app browser evidence ${resolved}: ${error.message}`);
  }
  if (parsed?.schema !== "media-server.in-app-browser-ui-evidence.v1") {
    throw new Error(`invalid in-app browser evidence schema: ${parsed?.schema || "(missing)"}`);
  }
  const browserName = String(parsed.browser || parsed.browserId || parsed.source || "");
  if (!/in-app|iab|codex/i.test(browserName)) {
    throw new Error("in-app browser evidence must identify Codex in-app browser/iab as the browser source");
  }
  return { ...parsed, path: resolved };
}

function skippedBrowserResult(label, reason) {
  console.log(`[skip] ${label}: ${reason}`);
  return { passCount: 0, failCount: 0, failures: [] };
}

function failedBrowserResult(label, reason) {
  console.log(`[fail] ${label}: ${reason}`);
  return { passCount: 0, failCount: 1, failures: [`[${label}] ${reason}`] };
}

function missingInAppEvidenceResult(label) {
  return failedBrowserResult(label, "Codex 환경에서는 --in-app-evidence로 인앱 브라우저 직접 확인 결과를 전달해야 합니다.");
}

function evidenceRoutes() {
  return Array.isArray(inAppEvidence?.routes) ? inAppEvidence.routes : [];
}

function evidenceInteractions() {
  return Array.isArray(inAppEvidence?.interactions) ? inAppEvidence.interactions : [];
}

function findEvidenceRoute(routePath) {
  return evidenceRoutes().find((route) => route?.path === routePath || route?.url?.endsWith(routePath));
}

function assertInAppRenderedLeakEvidence() {
  const result = { passCount: 0, failCount: 0, failures: [] };
  for (const routePath of ["/client/live", "/client/dashboard", "/client/events"]) {
    const route = findEvidenceRoute(routePath);
    if (!route) {
      result.failCount += 1;
      result.failures.push(`[in-app-rendered-leak] missing route evidence: ${routePath}`);
      console.log(`[fail] in-app-rendered-leak ${routePath}: route evidence missing`);
      continue;
    }
    const hits = route.forbiddenTextHits || route.clientForbiddenTextHits || [];
    const explicitPass = route.checks?.noClientForbiddenText === true || route.noClientForbiddenText === true;
    if (Array.isArray(hits) && hits.length === 0 && explicitPass) {
      result.passCount += 1;
      console.log(`[pass] in-app-rendered-leak ${routePath}: forbidden text count 0`);
      continue;
    }
    const details = Array.isArray(hits) && hits.length > 0 ? hits.join(", ") : "noClientForbiddenText check missing";
    result.failCount += 1;
    result.failures.push(`[in-app-rendered-leak ${routePath}] ${details}`);
    console.log(`[fail] in-app-rendered-leak ${routePath}: ${details}`);
  }
  return result;
}

function assertInAppInteractionEvidence(label, requiredIds) {
  const interactions = evidenceInteractions();
  let localPass = 0;
  let localFail = 0;
  const localFailures = [];
  for (const id of requiredIds) {
    const item = interactions.find((entry) => entry?.id === id);
    if (item?.pass === true) {
      localPass += 1;
      console.log(`[pass] in-app ${id}`);
      continue;
    }
    const reason = item ? (item.reason || "pass is not true") : "interaction evidence missing";
    localFail += 1;
    localFailures.push(`[${id}] ${reason}`);
    console.log(`[fail] in-app ${id}: ${reason}`);
  }
  return { passCount: localPass, failCount: localFail, failures: localFailures.map((failure) => `[${label}] ${failure}`) };
}

function assertInAppScreenshotEvidence() {
  const visualRoutes = pageChecks.filter((check) => check.visualSelector).map((check) => check.path);
  const result = { passCount: 0, failCount: 0, failures: [] };
  for (const routePath of visualRoutes) {
    const route = findEvidenceRoute(routePath);
    const screenshots = Array.isArray(route?.screenshots) ? route.screenshots : [];
    if (route?.checks?.visualLayoutPass === true && screenshots.length > 0) {
      result.passCount += 1;
      console.log(`[pass] in-app screenshot evidence ${routePath}: screenshots=${screenshots.length}`);
      continue;
    }
    const reason = route ? "visualLayoutPass/screenshot evidence missing" : "route evidence missing";
    result.failCount += 1;
    result.failures.push(`[in-app-screenshots ${routePath}] ${reason}`);
    console.log(`[fail] in-app screenshot evidence ${routePath}: ${reason}`);
  }
  console.log("");
  console.log("== In-app browser screenshot evidence 요약 ==");
  console.log(`- 통과: ${result.passCount}`);
  console.log(`- 실패: ${result.failCount}`);
  if (result.failures.length > 0) {
    console.log("- 실패 상세:");
    for (const failure of result.failures) {
      console.log(`  - ${failure}`);
    }
  }
  return result;
}

function clientForbiddenText() {
  return [
    "Registry raw JSON",
    "raw JSON",
    "raw diagnostic",
    "debugCounters",
    "debugSummary",
    "Developer URL",
    "BBox diagnostics",
    "bboxDiagnostics",
    "analysisTapId",
    "developer-url-details",
    "opsEventsRaw",
    "sources-json",
    "views-json",
    "client-views-json",
    "sourceUrl",
    "sourceUri",
    "rtspUrl",
    "httpUrl",
    "whepUrl",
    "storagePath",
    "modelPath",
    "modelSha256",
    "modelChecksum",
    "modelProvenance",
    "modelUrl",
    "appearanceCrop",
    "appearanceEmbedding",
    "credentialRef",
    "passwordHash",
    "passwordHistory",
    "tokenHash",
    "rtsp://",
    "rtsps://",
    "file://",
    "WHIP sourceId",
    "Event POST",
    "/lab/runtime/status",
    "/lab/analysis/event-post",
    "/lab/analysis/taps",
    "/ops/api/sources",
    "/ops/api/views",
    "opsVaRuleForm",
    "opsEventRuleForm",
    "opsProfileForm",
    'href="/webrtc/session',
    "/webrtc/session?file",
    "sessionToken",
  ];
}

function assertOpsPrimaryNavContract(name, html) {
  const match = html.match(/<nav class="image-nav-tabs"[^>]*aria-label="운영 메뉴"[\s\S]*?<\/nav>/);
  if (!match) {
    throw new Error(`${name}: ops primary nav block not found`);
  }
  const nav = match[0];
  for (const href of ['href="/ops/home"', 'href="/ops/dashboard"', 'href="/ops/sources"', 'href="/ops/rules"', 'href="/client/live"']) {
    if (!nav.includes(href)) {
      throw new Error(`${name}: primary nav missing ${href}`);
    }
  }
  if (nav.includes('href="/ops/events"')) {
    throw new Error(`${name}: /ops/events must remain a direct route, not primary nav`);
  }
}

async function runClientRenderedLeakSmoke() {
  if (browserMode === "static") {
    return skippedBrowserResult("client-rendered-leak", "static mode는 렌더링 검사를 수행하지 않습니다.");
  }
  if (inAppEvidence) {
    return assertInAppRenderedLeakEvidence();
  }
  if (!chromeFallbackAllowed) {
    return missingInAppEvidenceResult("client-rendered-leak");
  }
  const result = { passCount: 0, failCount: 0, failures: [] };
  if (!chromePath) {
    return failedBrowserResult("client-rendered-leak", "Chrome fallback requested but executable was not found");
  }
  const clientPaths = [
    { name: "client-live-rendered-leak", path: "/client/live" },
    { name: "client-dashboard-rendered-leak", path: "/client/dashboard" },
    { name: "client-events-rendered-leak", path: "/client/events" },
  ];
  let checkIndex = 0;
  for (const check of clientPaths) {
    const browser = await openBrowserPage({
      httpBase,
      pagePath: check.path,
      timeoutMs,
      chromePath,
      debugPort: debugPortBase + 120 + checkIndex,
      width: 390,
      height: visualHeight,
      outputDir,
    });
    checkIndex += 1;
    try {
      const leakResult = await browser.evaluate(clientRenderedLeakExpression(), 10000);
      if (!leakResult?.ok) {
        const details = Array.isArray(leakResult?.issues) ? leakResult.issues.join("; ") : JSON.stringify(leakResult);
        throw new Error(`${check.name}: ${details}`);
      }
      result.passCount += 1;
      console.log(`[pass] ${check.name} rendered forbidden text count 0`);
      console.log(`[pass] ${check.name} rendered text length ${leakResult.textLength}`);
    } catch (error) {
      result.failCount += 1;
      const message = error instanceof Error ? error.message : String(error);
      result.failures.push(`[${check.name}] ${message}`);
      console.log(`[fail] ${check.name}: ${message}`);
    } finally {
      await browser.close();
    }
  }
  return result;
}

function clientRenderedLeakExpression() {
  return `
    (() => {
      const forbidden = ${JSON.stringify(clientForbiddenText())};
      const forbiddenSelectors = [
        '#opsRulesDetailPanel',
        '#opsVaRuleForm',
        '#opsEventRuleForm',
        '#opsProfileForm',
        '[data-testid="ops-rules-page"]',
        '[data-testid="ops-sources-page"]',
        '[data-testid="source-health-panel"]',
        '.debug-drawer',
        '[data-debug-counter]',
        '[data-source-url]',
      ];
      const issues = [];
      const visibleText = document.body ? document.body.innerText || '' : '';
      const html = document.documentElement ? document.documentElement.outerHTML || '' : '';
      const dataScripts = Array.from(document.querySelectorAll('script[type="application/json"]'))
        .map((node) => node.textContent || '')
        .join('\\n');
      for (const needle of forbidden) {
        if (!needle) continue;
        if (visibleText.includes(needle)) {
          issues.push('visible forbidden text: ' + needle);
        } else if (dataScripts.includes(needle)) {
          issues.push('JSON script forbidden text: ' + needle);
        } else if (html.includes(needle) && !needle.startsWith('/ops/api/')) {
          issues.push('DOM forbidden text: ' + needle);
        }
      }
      for (const selector of forbiddenSelectors) {
        if (document.querySelector(selector)) {
          issues.push('forbidden selector present: ' + selector);
        }
      }
      return {
        ok: issues.length === 0,
        issues,
        textLength: visibleText.length,
      };
    })()
  `;
}

async function runShellHeaderAccountSmoke() {
  let passCount = 0;
  let failCount = 0;
  const failures = [];
  const checks = [
    { name: "ops-home-account-header", path: "/ops/home" },
    { name: "ops-dashboard-account-header", path: "/ops/dashboard" },
    { name: "client-live-account-header", path: "/client/live" },
  ];
  let checkIndex = 0;
  for (const check of checks) {
    for (const width of visualWidths) {
      const browser = await openBrowserPage({
        httpBase,
        pagePath: check.path,
        timeoutMs,
        chromePath,
        debugPort: debugPortBase + 160 + checkIndex,
        width,
        height: visualHeight,
        outputDir,
      });
      checkIndex += 1;
      try {
        const result = await browser.evaluate(shellHeaderAccountExpression(), 10000);
        const label = `${check.name}-${width}`;
        if (!result?.ok) {
          const details = Array.isArray(result?.issues) ? result.issues.join("; ") : JSON.stringify(result);
          throw new Error(`${label}: ${details}`);
        }
        passCount += 1;
        console.log(`[pass] ${label} account item count ${result.accountItemCount}`);
        console.log(`[pass] ${label} brand width ${Math.round(result.brandWidth)}`);
        console.log(`[pass] ${label} brand height ${Math.round(result.brandHeight)}`);
      } catch (error) {
        failCount += 1;
        const message = error instanceof Error ? error.message : String(error);
        failures.push(`[${check.name}] ${message}`);
        console.log(`[fail] ${check.name}: ${message}`);
      } finally {
        await browser.close();
      }
    }
  }
  console.log("");
  console.log("== Shell account header smoke 요약 ==");
  console.log(`- 통과: ${passCount}`);
  console.log(`- 실패: ${failCount}`);
  if (failures.length > 0) {
    console.log("- 실패 상세:");
    for (const failure of failures) {
      console.log(`  - ${failure}`);
    }
  }
  return { passCount, failCount };
}

function shellHeaderAccountExpression() {
  return `
    (() => {
      const issues = [];
      const account = document.querySelector('body.product-shell header.app-chrome .account-menu');
      const brand = document.querySelector('body.product-shell header.app-chrome .brand-mark');
      if (!account) issues.push('account menu missing');
      if (!brand) issues.push('formal brand mark missing');
      if (!account || !brand) return { ok: false, issues };
      const visibleRect = element => {
        if (!element) return null;
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        if (style.display === 'none' || style.visibility === 'hidden' || rect.width <= 0 || rect.height <= 0) return null;
        return rect;
      };
      const accountRect = account.getBoundingClientRect();
      const brandRect = brand.getBoundingClientRect();
      if (brandRect.width < 30 || brandRect.height < 30) {
        issues.push('brand mark too small: ' + Math.round(brandRect.width) + 'x' + Math.round(brandRect.height));
      }
      const accountItems = [
        ['status', visibleRect(account.querySelector('.sketch-status-chip'))],
        ['avatar', visibleRect(account.querySelector('.account-avatar'))],
        ['theme', visibleRect(account.querySelector('#themeToggleBtn'))],
        ['language', visibleRect(account.querySelector('.language-select'))],
        ['shortcut', visibleRect(account.querySelector('.account-shortcut'))],
        ['logout', visibleRect(account.querySelector('form button'))],
      ].filter(([, rect]) => rect);
      for (let index = 0; index < accountItems.length; index += 1) {
        const [name, rect] = accountItems[index];
        if (rect.left < accountRect.left - 1 || rect.right > accountRect.right + 1) {
          issues.push('account item outside menu: ' + name);
        }
        for (let next = index + 1; next < accountItems.length; next += 1) {
          const [otherName, otherRect] = accountItems[next];
          const overlaps = rect.left < otherRect.right &&
            rect.right > otherRect.left &&
            rect.top < otherRect.bottom &&
            rect.bottom > otherRect.top;
          if (overlaps) issues.push('account controls overlap: ' + name + '/' + otherName);
        }
      }
      const doc = document.documentElement;
      const body = document.body;
      const overflowX = Math.max(0, Math.max(doc.scrollWidth, body.scrollWidth) - window.innerWidth);
      if (overflowX > 2) issues.push('document horizontal overflow ' + overflowX + 'px');
      return {
        ok: issues.length === 0,
        issues,
        accountItemCount: accountItems.length,
        brandWidth: brandRect.width,
        brandHeight: brandRect.height,
        overflowX,
      };
    })()
  `;
}

async function runClientHeaderResponsiveSmoke() {
  let headerPassCount = 0;
  let headerFailCount = 0;
  const headerFailures = [];
  const clientPaths = [
    { name: "client-live-header", path: "/client/live" },
    { name: "client-dashboard-header", path: "/client/dashboard" },
  ];
  let checkIndex = 0;
  for (const check of clientPaths) {
    for (const width of visualWidths) {
      const browser = await openBrowserPage({
        httpBase,
        pagePath: check.path,
        timeoutMs,
        chromePath,
        debugPort: debugPortBase + 200 + checkIndex,
        width,
        height: visualHeight,
        outputDir,
      });
      checkIndex += 1;
      try {
        const result = await browser.evaluate(clientHeaderResponsiveExpression(), 10000);
        const label = `${check.name}-${width}`;
        if (!result?.ok) {
          const details = Array.isArray(result?.issues) ? result.issues.join("; ") : JSON.stringify(result);
          throw new Error(`${label}: ${details}`);
        }
        headerPassCount += 1;
        console.log(`[pass] ${label} nav width ${Math.round(result.navWidth)}`);
        console.log(`[pass] ${label} account top ${Math.round(result.accountTop)}`);
      } catch (error) {
        headerFailCount += 1;
        const message = error instanceof Error ? error.message : String(error);
        headerFailures.push(`[${check.name}] ${message}`);
        console.log(`[fail] ${check.name}: ${message}`);
      } finally {
        await browser.close();
      }
    }
  }
  console.log("");
  console.log("== Client header smoke 요약 ==");
  console.log(`- 통과: ${headerPassCount}`);
  console.log(`- 실패: ${headerFailCount}`);
  if (headerFailures.length > 0) {
    console.log("- 실패 상세:");
    for (const failure of headerFailures) {
      console.log(`  - ${failure}`);
    }
  }
  return { passCount: headerPassCount, failCount: headerFailCount };
}

function clientHeaderResponsiveExpression() {
  return `
    (() => {
      const issues = [];
      const nav = document.querySelector('body.client-shell header.app-chrome .client-image-nav-tabs');
      const account = document.querySelector('body.client-shell header.app-chrome .account-menu');
      const headerTop = document.querySelector('body.client-shell header.app-chrome .app-header-top');
      const navItems = Array.from(document.querySelectorAll('body.client-shell header.app-chrome .client-image-nav-tabs .image-nav'));
      if (!nav) issues.push('client nav missing');
      if (!account) issues.push('client account menu missing');
      if (!headerTop) issues.push('client header grid missing');
      if (navItems.length < 2) issues.push('client nav items missing');
      if (!nav || !account || !headerTop || navItems.length < 2) {
        return { ok: false, issues };
      }
      const navRect = nav.getBoundingClientRect();
      const accountRect = account.getBoundingClientRect();
      const headerRect = headerTop.getBoundingClientRect();
      const intersects = navRect.left < accountRect.right &&
        navRect.right > accountRect.left &&
        navRect.top < accountRect.bottom &&
        navRect.bottom > accountRect.top;
      if (intersects) {
        issues.push('client nav/account boxes overlap');
      }
      if (window.innerWidth <= 860) {
        if (navRect.width < headerRect.width - 2) {
          issues.push('client nav does not fill the mobile header row');
        }
        if (accountRect.top < navRect.bottom + 8) {
          issues.push('client account menu is not stacked below nav');
        }
      }
      const visibleRect = element => {
        if (!element) return null;
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        if (style.display === 'none' || style.visibility === 'hidden' || rect.width <= 0 || rect.height <= 0) return null;
        return rect;
      };
      const accountItems = [
        ['status', visibleRect(account.querySelector('.sketch-status-chip'))],
        ['avatar', visibleRect(account.querySelector('.account-avatar'))],
        ['theme', visibleRect(account.querySelector('#themeToggleBtn'))],
        ['language', visibleRect(account.querySelector('.language-select'))],
        ['logout', visibleRect(account.querySelector('form button'))],
      ].filter(([, rect]) => rect);
      for (let index = 0; index < accountItems.length; index += 1) {
        const [name, rect] = accountItems[index];
        if (rect.left < accountRect.left - 1 || rect.right > accountRect.right + 1) {
          issues.push('client account item outside menu: ' + name);
        }
        for (let next = index + 1; next < accountItems.length; next += 1) {
          const [otherName, otherRect] = accountItems[next];
          const overlaps = rect.left < otherRect.right &&
            rect.right > otherRect.left &&
            rect.top < otherRect.bottom &&
            rect.bottom > otherRect.top;
          if (overlaps) {
            issues.push('client account controls overlap: ' + name + '/' + otherName);
          }
        }
      }
      for (const item of navItems) {
        const rect = item.getBoundingClientRect();
        if (rect.width < 120 || rect.height < 44) {
          issues.push('client nav item too small: ' + Math.round(rect.width) + 'x' + Math.round(rect.height));
        }
      }
      const doc = document.documentElement;
      const body = document.body;
      const overflowX = Math.max(0, Math.max(doc.scrollWidth, body.scrollWidth) - window.innerWidth);
      if (overflowX > 2) {
        issues.push('document horizontal overflow ' + overflowX + 'px');
      }
      const header = headerTop.closest('header.app-chrome');
      const originalScrollY = window.scrollY;
      window.scrollTo(0, 220);
      const scrolledHeaderRect = header?.getBoundingClientRect();
      if (!scrolledHeaderRect || Math.abs(scrolledHeaderRect.top) > 1) {
        issues.push('client header is not stable while scrolling');
      }
      window.scrollTo(0, originalScrollY);
      return {
        ok: issues.length === 0,
        issues,
        navWidth: navRect.width,
        headerWidth: headerRect.width,
        accountTop: accountRect.top,
        navBottom: navRect.bottom,
        accountItemCount: accountItems.length,
        scrolledHeaderTop: scrolledHeaderRect?.top ?? null,
        overflowX,
      };
    })()
  `;
}

async function runClientLiveTileKeyboardSmoke() {
  let keyboardPassCount = 0;
  let keyboardFailCount = 0;
  const keyboardFailures = [];
  const widths = [...new Set([390, 1180].filter((width) => visualWidths.includes(width)))];
  const languageChecks = [
    { language: "ko", pagePath: "/client/live?lang=ko" },
    { language: "en", pagePath: "/client/live?lang=en" },
  ];
  let checkIndex = 0;
  for (const check of languageChecks) {
    for (const width of widths.length ? widths : [390]) {
      const label = `client-live-keyboard-${check.language}-${width}`;
      const browser = await openBrowserPage({
        httpBase,
        pagePath: check.pagePath,
        timeoutMs,
        chromePath,
        debugPort: debugPortBase + 260 + checkIndex,
        width,
        height: visualHeight,
        outputDir,
      });
      checkIndex += 1;
      try {
        const result = await browser.evaluate(clientLiveTileKeyboardExpression(clientLiveA11ySnapshot), 10000);
        if (!result?.ok) {
          const details = Array.isArray(result?.issues) ? result.issues.join("; ") : JSON.stringify(result);
          throw new Error(`${label}: ${details}`);
        }
        keyboardPassCount += 1;
        console.log(`[pass] ${label} tile count ${result.tileCount}`);
        console.log(`[pass] ${label} selected tile ${result.selectedTile}`);
        console.log(`[pass] ${label} active tile ${result.activeTile}`);
      } catch (error) {
        keyboardFailCount += 1;
        const message = error instanceof Error ? error.message : String(error);
        keyboardFailures.push(`[${label}] ${message}`);
        console.log(`[fail] ${label}: ${message}`);
      } finally {
        await browser.close();
      }
    }
  }
  console.log("");
  console.log("== Client live tile keyboard smoke 요약 ==");
  console.log(`- 통과: ${keyboardPassCount}`);
  console.log(`- 실패: ${keyboardFailCount}`);
  if (keyboardFailures.length > 0) {
    console.log("- 실패 상세:");
    for (const failure of keyboardFailures) {
      console.log(`  - ${failure}`);
    }
  }
  return { passCount: keyboardPassCount, failCount: keyboardFailCount };
}

async function runOpsAdminFormRegressionSmoke() {
  if (browserMode === "static") {
    return skippedBrowserResult("ops-admin-form-regression", "static mode는 브라우저 조작 검사를 수행하지 않습니다.");
  }
  if (inAppEvidence) {
    return assertInAppInteractionEvidence("ops-admin-form-regression", [
      "ops-sources-generated-channel-id",
      "ops-rules-generated-id-displays",
      "ops-users-multi-channel-assignment",
    ]);
  }
  if (!chromeFallbackAllowed) {
    return missingInAppEvidenceResult("ops-admin-form-regression");
  }
  if (!chromePath) {
    return failedBrowserResult("ops-admin-form-regression", "Chrome fallback requested but executable was not found");
  }
  const cases = [
    {
      name: "ops-sources-generated-channel-id",
      pagePath: "/ops/sources",
      expression: opsSourcesGeneratedIdExpression(),
    },
    {
      name: "ops-rules-generated-id-displays",
      pagePath: "/ops/rules",
      expression: opsRulesGeneratedIdExpression(),
    },
    {
      name: "ops-users-multi-channel-assignment",
      pagePath: "/ops/users",
      expression: opsUsersMultiChannelAssignmentExpression(),
    },
  ];
  let localPass = 0;
  let localFail = 0;
  const localFailures = [];
  let index = 0;
  for (const item of cases) {
    const browser = await openBrowserPage({
      httpBase,
      pagePath: item.pagePath,
      timeoutMs,
      chromePath,
      debugPort: debugPortBase + 420 + index,
      width: 1180,
      height: 900,
      outputDir,
    });
    index += 1;
    try {
      const result = await browser.evaluate(item.expression, 10000);
      if (!result?.ok) {
        const details = Array.isArray(result?.issues) ? result.issues.join("; ") : JSON.stringify(result);
        throw new Error(details);
      }
      localPass += 1;
      console.log(`[pass] ${item.name}`);
    } catch (error) {
      localFail += 1;
      const message = error instanceof Error ? error.message : String(error);
      localFailures.push(`[${item.name}] ${message}`);
      console.log(`[fail] ${item.name}: ${message}`);
    } finally {
      await browser.close();
    }
  }
  return { passCount: localPass, failCount: localFail, failures: localFailures };
}

function opsSourcesGeneratedIdExpression() {
  return `
    (async () => {
      const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      const issues = [];
      const issue = message => { if (issues.length < 12) issues.push(message); };
      await wait(500);
      document.querySelector('#add-channel')?.click();
      await wait(250);
      const form = document.querySelector('#channel-form');
      const hiddenId = form?.elements?.channelId;
      const display = document.querySelector('#channel-id-display');
      if (!form) issue('channel form missing');
      if (!hiddenId) issue('channel hidden id missing');
      if (hiddenId && hiddenId.type !== 'hidden') issue('channel id is not hidden: ' + hiddenId.type);
      if (document.querySelector('#channel-form input[name="channelId"][type="number"]')) issue('editable channel numeric id input remains');
      if (!display) issue('channel generated id display missing');
      const idText = String(display?.textContent || '').trim();
      if (!/^\\d+$/.test(idText)) issue('generated channel id is not numeric: ' + idText);
      if (String(hiddenId?.value || '') !== idText) issue('hidden channel id does not match display');
      const active = document.activeElement;
      if (active?.name === 'channelId') issue('channel id can receive edit focus');
      document.querySelector('#channel-save-selected')?.click();
      await wait(250);
      const validation = String(document.querySelector('#channel-validation')?.textContent || '').trim();
      if (!validation.includes('채널 이름이 필요합니다.')) {
        issue('empty channel name validation missing: ' + validation);
      }
      const rows = Array.from(document.querySelectorAll('#channels-body tr'));
      const emptyNameRow = rows.some(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        const id = String(cells[0]?.textContent || '').trim();
        const name = String(cells[1]?.textContent || '').trim();
        return id === idText && !name;
      });
      if (emptyNameRow) issue('empty channel name row was saved');
      return { ok: issues.length === 0, issues, idText };
    })()
  `;
}

function opsRulesGeneratedIdExpression() {
  return `
    (async () => {
      const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      const issues = [];
      const issue = message => { if (issues.length < 16) issues.push(message); };
      await wait(600);
      for (const [inputId, displayId] of [
        ['opsVaRuleIdInput', 'opsVaRuleIdDisplay'],
        ['opsEventRuleIdInput', 'opsEventRuleIdDisplay'],
        ['opsProfileIdInput', 'opsProfileIdDisplay']
      ]) {
        const input = document.getElementById(inputId);
        const display = document.getElementById(displayId);
        if (!input) issue(inputId + ' missing');
        if (input && input.type !== 'hidden') issue(inputId + ' is not hidden: ' + input.type);
        if (!display) issue(displayId + ' missing');
        if (display && display.matches('input, textarea, select')) issue(displayId + ' is editable control');
      }
      if (document.querySelector('#opsVaRuleIdInput[type="text"], #opsEventRuleIdInput[type="text"], #opsProfileIdInput[type="text"]')) {
        issue('editable rule/profile id input remains');
      }
      document.querySelector('#opsAddEventRuleBtn')?.click();
      await wait(120);
      document.querySelector('#opsCreateEventRuleBtn')?.click();
      await wait(250);
      const eventDisplay = document.getElementById('opsEventRuleIdDisplay');
      const eventHidden = document.getElementById('opsEventRuleIdInput');
      const eventText = String(eventDisplay?.textContent || '').trim();
      if (!/^\\d+$/.test(eventText)) issue('event rule generated id display is not numeric: ' + eventText);
      if (String(eventHidden?.value || '') !== eventText) issue('event rule hidden id does not match display');
      return { ok: issues.length === 0, issues, eventText };
    })()
  `;
}

function opsUsersMultiChannelAssignmentExpression() {
  return `
    (async () => {
      const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      const issues = [];
      const issue = message => { if (issues.length < 16) issues.push(message); };
      await wait(600);
      document.querySelector('#add-user-btn')?.click();
      await wait(250);
      const list = document.querySelector('[data-testid="user-channel-assignment-list"]');
      const hidden = document.querySelector('#user-form input[name="viewId"][type="hidden"]');
      const options = Array.from(list?.querySelectorAll('[data-assignment-view]') || []);
      if (!list) issue('multi-channel assignment list missing');
      if (!hidden) issue('hidden viewId field missing');
      if (document.querySelector('#user-form input[name="viewId"][list]')) issue('single datalist channel input remains');
      if (document.querySelector('#view-assignment-options option')) issue('datalist option UI remains');
      if (options.length < 2) issue('expected multiple selectable channel checkboxes, got ' + options.length);
      for (const option of options.slice(0, 3)) {
        if (!option.checked) option.click();
      }
      await wait(120);
      document.querySelector('#apply-view-scope-template')?.click();
      await wait(120);
      const selected = options.slice(0, 3).map(input => String(input.value || '').trim()).filter(Boolean);
      const scopes = String(document.querySelector('#user-scopes-input')?.value || '');
      for (const viewId of selected) {
        if (!scopes.includes('view:read:' + viewId)) issue('missing view scope for ' + viewId);
        if (!scopes.includes('dashboard:read:' + viewId)) issue('missing dashboard scope for ' + viewId);
        if (!scopes.includes('event:read:' + viewId)) issue('missing event scope for ' + viewId);
        if (!scopes.includes('metadata:read:' + viewId)) issue('missing metadata scope for ' + viewId);
      }
      const hiddenValue = String(hidden?.value || '');
      for (const viewId of selected) {
        if (!hiddenValue.split(',').includes(viewId)) issue('hidden assignment missing ' + viewId);
      }
      return { ok: issues.length === 0, issues, optionCount: options.length, selected, hiddenValue };
    })()
  `;
}

function clientLiveTileKeyboardExpression(a11ySnapshot) {
  return `
    (async () => {
      const a11ySnapshot = ${JSON.stringify(a11ySnapshot)};
      const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      const issues = [];
      const issue = message => { if (issues.length < 16) issues.push(message); };
      const domExtraction = a11ySnapshot.domExtraction || {};
      const language = String(document.documentElement.dataset.lang || document.documentElement.lang || 'ko').toLowerCase().startsWith('en')
        ? 'english'
        : 'korean';
      const expectedOfflineStatus = (a11ySnapshot.scenarios || []).find(item => item.id === 'offline-empty')?.[language] || a11ySnapshot[language] || '';
      const requiredStatusParts = language === 'english'
        ? ['Tile 1:', 'Status', 'Connection', 'Tracks', 'Events', 'Metadata', 'Retry']
        : (Array.isArray(domExtraction.requiredKoreanParts) && domExtraction.requiredKoreanParts.length
          ? domExtraction.requiredKoreanParts
          : ['타일 1:', '상태', '연결', '트랙', '이벤트', '메타데이터', '재시도']);
      await wait(350);
      const tiles = Array.from(document.querySelectorAll('.tile'));
      if (tiles.length < 2) issue('expected at least two live tiles, got ' + tiles.length);
      const first = tiles[0];
      const second = tiles[1];
      if (first) {
        if (first.getAttribute('tabindex') !== '0') issue('first tile is not tabbable');
        if (first.getAttribute('role') !== 'group') issue('first tile role is not group');
        const expectedTileName = language === 'english' ? 'Tile 1' : '타일 1';
        if (!String(first.getAttribute('aria-label') || '').includes(expectedTileName)) issue('first tile aria-label missing tile number');
        const viewSelect = first.querySelector('[data-role="view"]');
        if (viewSelect && viewSelect.value !== '' && !viewSelect.disabled) {
          viewSelect.value = '';
          viewSelect.dispatchEvent(new Event('change', { bubbles: true }));
          await wait(180);
        }
        if (!first.querySelector('[data-role="assignment"]')) issue('first tile assignment summary missing');
        if (!document.querySelector('[data-testid="client-live-source-tree"] [data-source-view]')) issue('client live source tree node missing');
        if (!document.querySelector('[data-testid="client-live-source-tree"] [data-tree-level="site"]')) issue('client live source site group missing');
        if (!document.querySelector('[data-testid="client-live-source-tree"] [data-tree-level="floor"]')) issue('client live source floor group missing');
        if (!document.querySelector('[data-testid="client-live-dock-event-feed"][data-redaction="viewer-safe-events"]')) issue('client live dock event feed missing');
        const modeToggle = first.querySelector('[data-testid="client-live-va-overlay-toggle"]');
        if (!modeToggle) issue('first tile VA overlay toggle missing');
        const rawModeButton = modeToggle?.querySelector('[data-mode-action="raw"]');
        const vaModeButton = modeToggle?.querySelector('[data-mode-action="va-overlay"]');
        if (modeToggle && modeToggle.hidden) issue('first tile VA overlay toggle is hidden');
        if (modeToggle && !rawModeButton) issue('first tile raw mode action missing');
        if (modeToggle && !vaModeButton) issue('first tile VA overlay mode action missing');
        if (vaModeButton && vaModeButton.getAttribute('aria-pressed') !== 'true') {
          issue('first tile default VA overlay mode is not active');
        }
        if (rawModeButton && vaModeButton) {
          vaModeButton.click();
          await wait(180);
          if (vaModeButton.getAttribute('aria-pressed') !== 'true') issue('VA overlay mode did not become active after click');
          rawModeButton.click();
          await wait(180);
          if (rawModeButton.getAttribute('aria-pressed') !== 'true') issue('raw mode did not become active after click');
        }
        const describedBy = String(first.getAttribute('aria-describedby') || '');
        if (!describedBy) issue('first tile aria-describedby missing');
        const describedNode = describedBy ? document.getElementById(describedBy) : null;
        if (!describedNode) issue('first tile described status node missing');
        if (describedNode) {
          const statusText = String(describedNode.textContent || '');
          if (describedNode.dataset.role !== 'a11y-status') issue('first tile described node role mismatch');
          if (describedNode.getAttribute('aria-live') !== 'polite') issue('first tile status aria-live missing');
          if (describedNode.getAttribute('aria-atomic') !== 'true') issue('first tile status aria-atomic missing');
          if (!describedNode.classList.contains('sr-only')) issue('first tile status is not visually hidden');
          for (const expected of requiredStatusParts) {
            if (!statusText.includes(expected)) issue('first tile a11y status missing text: ' + expected);
          }
          if (viewSelect && expectedOfflineStatus && statusText !== expectedOfflineStatus) {
            issue('first tile a11y status mismatch: ' + statusText);
          }
          const style = window.getComputedStyle(describedNode);
          if (style.position !== 'absolute' || Number.parseFloat(style.width || '0') > 2 || Number.parseFloat(style.height || '0') > 2) {
            issue('first tile sr-only style is not constrained');
          }
        }
        const labels = Array.from(first.querySelectorAll('button, select')).map(node => node.getAttribute('aria-label') || '');
        const expectedLabels = language === 'english'
          ? ['Tile 1 Play', 'Tile 1 Refresh']
          : ['타일 1 재생', '타일 1 새로고침'];
        for (const expected of expectedLabels) {
          if (!labels.some(label => label.includes(expected))) issue('missing control aria-label: ' + expected);
        }
        const tileRect = first.getBoundingClientRect();
        const tileRatio = tileRect.width / Math.max(1, tileRect.height);
        if (tileRatio < 1.72 || tileRatio > 1.84) {
          issue('first tile video frame is not 16:9: ' + tileRect.width.toFixed(1) + 'x' + tileRect.height.toFixed(1));
        }
        for (const control of first.querySelectorAll('button, select')) {
          const rect = control.getBoundingClientRect();
          if (control.closest('[hidden]') || rect.width <= 0 || rect.height <= 0) continue;
          if (rect.left < tileRect.left - 1 || rect.right > tileRect.right + 1) {
            issue('first tile control overflows tile bounds');
            break;
          }
          if (window.innerWidth <= 560 && control.matches('button') && rect.height < 44) {
            issue('first tile mobile button target too small: ' + Math.round(rect.height) + 'px');
          }
        }
        first.focus();
        await wait(80);
        if (document.activeElement !== first) issue('first tile did not receive focus');
        first.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
        await wait(160);
        if (second && document.activeElement !== second) issue('ArrowRight did not move focus to second tile');
        if (second && !second.classList.contains('selected')) issue('ArrowRight did not select second tile');
        second?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }));
        await wait(160);
        if (document.activeElement !== first) issue('Home did not move focus back to first tile');
        first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
        await wait(120);
        if (!first.classList.contains('selected')) issue('Enter did not select focused tile');
      }
      const doc = document.documentElement;
      const body = document.body;
      const overflowX = Math.max(0, Math.max(doc.scrollWidth, body.scrollWidth) - window.innerWidth);
      if (overflowX > 2) issue('document horizontal overflow ' + overflowX + 'px');
      const selected = document.querySelector('.tile.selected');
      return {
        ok: issues.length === 0,
        issues,
        tileCount: tiles.length,
        selectedTile: selected?.dataset?.tile || '',
        activeTile: document.activeElement?.dataset?.tile || '',
        overflowX,
      };
    })()
  `;
}

async function runOpsAuditResponsiveSmoke() {
  let auditPassCount = 0;
  let auditFailCount = 0;
  const auditFailures = [];
  const auditPaths = [
    { name: "ops-sources-audit", path: "/ops/sources", selector: "#channel-audit-list" },
    { name: "ops-users-audit", path: "/ops/users", selector: "#user-audit-list" },
  ];
  let checkIndex = 0;
  for (const check of auditPaths) {
    for (const width of visualWidths) {
      if (width > 560) continue;
      const label = `${check.name}-${width}`;
      const browser = await openBrowserPage({
        httpBase,
        pagePath: check.path,
        timeoutMs,
        chromePath,
        debugPort: debugPortBase + 320 + checkIndex,
        width,
        height: visualHeight,
        outputDir,
      });
      checkIndex += 1;
      try {
        await browser.evaluate(`document.querySelector(${JSON.stringify(check.selector)})?.scrollIntoView({ block: 'center' }); true`, 10000);
        await browser.screenshot(path.join(outputDir, `${label}.png`));
        const result = await browser.evaluate(opsAuditResponsiveExpression(check.selector), 10000);
        if (!result?.ok) {
          const details = Array.isArray(result?.issues) ? result.issues.join("; ") : JSON.stringify(result);
          throw new Error(`${label}: ${details}`);
        }
        auditPassCount += 1;
        console.log(`[pass] ${label} overflowX ${result.overflowX}`);
        console.log(`[pass] ${label} control count ${result.controlCount}`);
      } catch (error) {
        auditFailCount += 1;
        const message = error instanceof Error ? error.message : String(error);
        auditFailures.push(`[${check.name}] ${message}`);
        console.log(`[fail] ${check.name}: ${message}`);
      } finally {
        await browser.close();
      }
    }
  }
  console.log("");
  console.log("== Ops audit mobile smoke 요약 ==");
  console.log(`- 통과: ${auditPassCount}`);
  console.log(`- 실패: ${auditFailCount}`);
  if (auditFailures.length > 0) {
    console.log("- 실패 상세:");
    for (const failure of auditFailures) {
      console.log(`  - ${failure}`);
    }
  }
  return { passCount: auditPassCount, failCount: auditFailCount };
}

async function runOpsSourcesOnvifUnsupportedHintSmoke() {
  let hintPassCount = 0;
  let hintFailCount = 0;
  const hintFailures = [];
  const hintWidths = onvifUnsupportedHintWidths();
  let checkIndex = 0;
  for (const width of hintWidths) {
    const label = `ops-sources-onvif-unsupported-hint-${width}`;
    const browser = await openBrowserPage({
      httpBase,
      pagePath: "/ops/sources",
      timeoutMs,
      chromePath,
      debugPort: debugPortBase + 440 + checkIndex,
      width,
      height: visualHeight,
      outputDir,
    });
    checkIndex += 1;
    try {
      await browser.evaluate(prepareOnvifUnsupportedHintExpression(), 10000);
      await browser.screenshot(path.join(outputDir, `${label}.png`));
      const result = await browser.evaluate(onvifUnsupportedHintVisibleExpression(), 10000);
      if (!result?.ok) {
        const details = Array.isArray(result?.issues) ? result.issues.join("; ") : JSON.stringify(result);
        throw new Error(`${label}: ${details}`);
      }
      hintPassCount += 1;
      console.log(`[pass] ${label} hint height ${Math.round(result.hintHeight)}`);
      console.log(`[pass] ${label} overflowX ${result.overflowX}`);
    } catch (error) {
      hintFailCount += 1;
      const message = error instanceof Error ? error.message : String(error);
      hintFailures.push(`[${label}] ${message}`);
      console.log(`[fail] ${label}: ${message}`);
    } finally {
      await browser.close();
    }
  }
  console.log("");
  console.log("== Ops ONVIF unsupported hint screenshot smoke 요약 ==");
  console.log(`- 통과: ${hintPassCount}`);
  console.log(`- 실패: ${hintFailCount}`);
  console.log(`- screenshots: ${outputDir}`);
  if (hintFailures.length > 0) {
    console.log("- 실패 상세:");
    for (const failure of hintFailures) {
      console.log(`  - ${failure}`);
    }
  }
  return { passCount: hintPassCount, failCount: hintFailCount };
}

async function runOpsSourcesOnvifPreviewToolSmoke() {
  let previewPassCount = 0;
  let previewFailCount = 0;
  const previewFailures = [];
  const previewWidths = onvifPreviewToolWidths();
  const fixtureText = fs.readFileSync(path.resolve("test/fixtures/onvif_probe_result_stub.json"), "utf8");
  let checkIndex = 0;
  for (const width of previewWidths) {
    const label = `ops-sources-onvif-preview-tool-${width}`;
    const browser = await openBrowserPage({
      httpBase,
      pagePath: "/ops/sources",
      timeoutMs,
      chromePath,
      debugPort: debugPortBase + 520 + checkIndex,
      width,
      height: visualHeight,
      outputDir,
    });
    checkIndex += 1;
    try {
      await browser.evaluate(prepareOnvifPreviewToolExpression(fixtureText), 10000);
      await browser.screenshot(path.join(outputDir, `${label}.png`));
      const result = await browser.evaluate(onvifPreviewToolVisibleExpression(), 10000);
      if (!result?.ok) {
        const details = Array.isArray(result?.issues) ? result.issues.join("; ") : JSON.stringify(result);
        throw new Error(`${label}: ${details}`);
      }
      previewPassCount += 1;
      console.log(`[pass] ${label} tool height ${Math.round(result.toolHeight)}`);
      console.log(`[pass] ${label} overflowX ${result.overflowX}`);
    } catch (error) {
      previewFailCount += 1;
      const message = error instanceof Error ? error.message : String(error);
      previewFailures.push(`[${label}] ${message}`);
      console.log(`[fail] ${label}: ${message}`);
    } finally {
      await browser.close();
    }
  }
  console.log("");
  console.log("== Ops ONVIF preview tool screenshot smoke 요약 ==");
  console.log(`- 통과: ${previewPassCount}`);
  console.log(`- 실패: ${previewFailCount}`);
  console.log(`- screenshots: ${outputDir}`);
  if (previewFailures.length > 0) {
    console.log("- 실패 상세:");
    for (const failure of previewFailures) {
      console.log(`  - ${failure}`);
    }
  }
  return { passCount: previewPassCount, failCount: previewFailCount };
}

function onvifUnsupportedHintWidths() {
  return [320, ...visualWidths.filter(width => width !== 320)];
}

function onvifPreviewToolWidths() {
  const widths = [390, 1180].filter(width => visualWidths.includes(width));
  return widths.length > 0 ? widths : [visualWidths[0]];
}

function prepareOnvifUnsupportedHintExpression() {
  return `
    (async () => {
      const addButton = document.querySelector('#add-channel');
      if (!addButton) throw new Error('add channel button missing');
      addButton.click();
      for (let attempt = 0; attempt < 30; attempt += 1) {
        const panel = document.querySelector('#channel-detail-panel');
        const kind = document.querySelector('#channel-form [name="kind"]');
        if (panel && !panel.hidden && kind) {
          kind.value = 'onvif';
          kind.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      const hint = document.querySelector('p[data-source-kind="onvif"].hint');
      if (!hint) throw new Error('ONVIF unsupported hint missing');
      hint.scrollIntoView({ block: 'center', inline: 'nearest' });
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const rect = hint.getBoundingClientRect();
      const targetTop = Math.max(24, Math.round((window.innerHeight - rect.height) / 2));
      window.scrollBy({ top: rect.top - targetTop, left: 0, behavior: 'instant' });
      await new Promise(resolve => setTimeout(resolve, 120));
      return true;
    })()
  `;
}

function prepareOnvifPreviewToolExpression(fixtureText) {
  return `
    (async () => {
      const addButton = document.querySelector('#add-channel');
      if (!addButton) throw new Error('add channel button missing');
      addButton.click();
      let kind = null;
      for (let attempt = 0; attempt < 30; attempt += 1) {
        const panel = document.querySelector('#channel-detail-panel');
        kind = document.querySelector('#channel-form [name="kind"]');
        if (panel && !panel.hidden && kind) break;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (!kind) throw new Error('channel kind select missing');
      kind.value = 'onvif';
      kind.dispatchEvent(new Event('input', { bubbles: true }));
      kind.dispatchEvent(new Event('change', { bubbles: true }));
      const input = document.querySelector('#onvifProbeDraftInput');
      if (!input) throw new Error('ONVIF probe fixture input missing');
      input.value = ${JSON.stringify(fixtureText)};
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      const select = document.querySelector('#onvifProbeProfileSelect');
      for (let attempt = 0; attempt < 30; attempt += 1) {
        if (select && !select.disabled && select.options.length > 1) break;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      if (!select || select.disabled) throw new Error('ONVIF profile select did not enable');
      select.value = 'field-sub-h264';
      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
      const apply = document.querySelector('#onvifProbeDraftApply');
      if (!apply) throw new Error('ONVIF probe draft apply missing');
      apply.click();
      const status = document.querySelector('#onvifProbeDraftStatus');
      for (let attempt = 0; attempt < 50; attempt += 1) {
        if ((status?.textContent || '').includes('Probe draft 적용')) break;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      const tool = document.querySelector('[data-testid="onvif-probe-draft-tool"]');
      if (!tool) throw new Error('ONVIF probe draft tool missing');
      tool.scrollIntoView({ block: 'center', inline: 'nearest' });
      await new Promise(resolve => setTimeout(resolve, 160));
      return true;
    })()
  `;
}

function onvifUnsupportedHintVisibleExpression() {
  return `
    (() => {
      const issues = [];
      const hint = document.querySelector('p[data-source-kind="onvif"].hint');
      const input = document.querySelector('[name="onvifStreamUrl"]');
      const tool = document.querySelector('[data-testid="onvif-probe-draft-tool"]');
      const requiredText = [
        'WS-Discovery 자동 검색',
        'PTZ 제어',
        'ONVIF Events/PullPoint',
        'Profile G/Recording/Replay는 제공하지 않습니다',
        '운영자가 확인한 live URI 또는 probe fixture를 사용합니다',
      ];
      if (!hint) issues.push('ONVIF unsupported hint missing');
      if (!input) issues.push('ONVIF stream URI input missing');
      if (!tool) issues.push('ONVIF probe draft tool missing');
      if (!hint || !input || !tool) {
        return { ok: false, issues, overflowX: 0, hintHeight: 0 };
      }
      for (const item of requiredText) {
        if (!hint.textContent.includes(item)) {
          issues.push('ONVIF unsupported hint text missing: ' + item);
        }
      }
      for (const [name, element] of [['hint', hint], ['input', input], ['tool', tool]]) {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        if (element.hidden || style.display === 'none' || style.visibility === 'hidden') {
          issues.push(name + ' is hidden');
        }
        if (rect.width <= 0 || rect.height <= 0) {
          issues.push(name + ' has empty rect');
        }
        if (rect.left < -1 || rect.right > window.innerWidth + 1) {
          issues.push(name + ' outside viewport horizontally: ' + Math.round(rect.left) + '..' + Math.round(rect.right));
        }
      }
      const hintRect = hint.getBoundingClientRect();
      if (hintRect.top < 0 || hintRect.bottom > window.innerHeight) {
        issues.push('hint not fully visible in screenshot viewport: ' + Math.round(hintRect.top) + '..' + Math.round(hintRect.bottom));
      }
      const doc = document.documentElement;
      const body = document.body;
      const overflowX = Math.max(0, Math.max(doc.scrollWidth, body.scrollWidth) - window.innerWidth);
      if (overflowX > 2) {
        issues.push('document horizontal overflow ' + overflowX + 'px');
      }
      return {
        ok: issues.length === 0,
        issues,
        overflowX,
        hintHeight: hintRect.height,
      };
    })()
  `;
}

function onvifPreviewToolVisibleExpression() {
  return `
    (() => {
      const issues = [];
      const tool = document.querySelector('[data-testid="onvif-probe-draft-tool"]');
      const fixtureInput = document.querySelector('#onvifProbeDraftInput');
      const profileSelect = document.querySelector('#onvifProbeProfileSelect');
      const applyButton = document.querySelector('#onvifProbeDraftApply');
      const clearButton = document.querySelector('#onvifProbeDraftClear');
      const status = document.querySelector('#onvifProbeDraftStatus');
      const credentialGate = document.querySelector('[data-testid="onvif-credential-gate"]');
      const credentialGateStatus = document.querySelector('#onvifCredentialGateStatus');
      const streamInput = document.querySelector('[name="onvifStreamUrl"]');
      if (!tool) issues.push('ONVIF preview tool missing');
      if (!fixtureInput) issues.push('fixture textarea missing');
      if (!profileSelect) issues.push('profile select missing');
      if (!applyButton) issues.push('apply button missing');
      if (!clearButton) issues.push('clear button missing');
      if (!status) issues.push('status node missing');
      if (!credentialGate) issues.push('credential gate missing');
      if (!credentialGateStatus) issues.push('credential gate status missing');
      if (!streamInput) issues.push('ONVIF stream URI input missing');
      if (!tool || !fixtureInput || !profileSelect || !applyButton || !clearButton || !status || !credentialGate || !credentialGateStatus || !streamInput) {
        return { ok: false, issues, overflowX: 0, toolHeight: 0 };
      }
      if (profileSelect.disabled) issues.push('profile select is disabled after fixture input');
      if (profileSelect.value !== 'field-sub-h264') issues.push('selected profile mismatch: ' + profileSelect.value);
      if (!status.textContent.includes('Probe draft 적용')) issues.push('draft apply status missing');
      if (credentialGate.dataset.credentialStore !== 'deferred-product-store') issues.push('credential gate store marker mismatch');
      if (credentialGate.dataset.redaction !== 'credential-reference-only') issues.push('credential gate redaction marker mismatch');
      if (!credentialGateStatus.textContent.includes('reference-present-redacted')) {
        issues.push('credential gate status missing redacted reference state');
      }
      if (String(streamInput.value || '').trim() !== 'rtsp://192.0.2.20/live/sub') {
        issues.push('drafted ONVIF stream URI mismatch: ' + streamInput.value);
      }
      const expectedOptions = ['field-main-h264', 'field-sub-h264'];
      const optionValues = Array.from(profileSelect.options).map(option => option.value);
      for (const option of expectedOptions) {
        if (!optionValues.includes(option)) issues.push('profile option missing: ' + option);
      }
      for (const [name, element] of [
        ['tool', tool],
        ['fixtureInput', fixtureInput],
        ['profileSelect', profileSelect],
        ['applyButton', applyButton],
        ['clearButton', clearButton],
        ['status', status],
        ['credentialGate', credentialGate],
        ['credentialGateStatus', credentialGateStatus],
        ['streamInput', streamInput],
      ]) {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        if (element.hidden || style.display === 'none' || style.visibility === 'hidden') {
          issues.push(name + ' is hidden');
        }
        if (rect.width <= 0 || rect.height <= 0) {
          issues.push(name + ' has empty rect');
        }
        if (rect.left < -1 || rect.right > window.innerWidth + 1) {
          issues.push(name + ' outside viewport horizontally: ' + Math.round(rect.left) + '..' + Math.round(rect.right));
        }
      }
      const toolRect = tool.getBoundingClientRect();
      if (toolRect.top < 0 || toolRect.bottom > window.innerHeight) {
        issues.push('preview tool not fully visible in screenshot viewport: ' + Math.round(toolRect.top) + '..' + Math.round(toolRect.bottom));
      }
      const doc = document.documentElement;
      const body = document.body;
      const overflowX = Math.max(0, Math.max(doc.scrollWidth, body.scrollWidth) - window.innerWidth);
      if (overflowX > 2) {
        issues.push('document horizontal overflow ' + overflowX + 'px');
      }
      return {
        ok: issues.length === 0,
        issues,
        overflowX,
        toolHeight: toolRect.height,
      };
    })()
  `;
}

function opsAuditResponsiveExpression(selector) {
  return `
    (() => {
      const issues = [];
      const section = document.querySelector(${JSON.stringify(selector)});
      const doc = document.documentElement;
      const body = document.body;
      const overflowX = Math.max(0, Math.max(doc.scrollWidth, body.scrollWidth) - window.innerWidth);
      if (!section) {
        return { ok: false, issues: ['audit section missing'], overflowX, controlCount: 0 };
      }
      const controls = Array.from(section.querySelectorAll('.audit-date-input'));
      if (controls.length !== 2) {
        issues.push('expected two audit date inputs, got ' + controls.length);
      }
      for (const control of controls) {
        const rect = control.getBoundingClientRect();
        if (control.type !== 'text') {
          issues.push('audit date input uses native type=' + control.type);
        }
        if (control.placeholder !== 'YYYY-MM-DD HH:mm') {
          issues.push('audit date placeholder mismatch');
        }
        if (rect.left < -1 || rect.right > window.innerWidth + 1) {
          issues.push('audit date input outside viewport: ' + Math.round(rect.left) + '..' + Math.round(rect.right));
        }
        if (rect.width < 120) {
          issues.push('audit date input too narrow: ' + Math.round(rect.width));
        }
      }
      const action = section.querySelector('select[id$="-audit-action"]');
      const limit = section.querySelector('select[id$="-audit-limit"]');
      for (const control of [action, limit].filter(Boolean)) {
        const rect = control.getBoundingClientRect();
        if (rect.left < -1 || rect.right > window.innerWidth + 1) {
          issues.push('audit select outside viewport: ' + Math.round(rect.left) + '..' + Math.round(rect.right));
        }
      }
      if (overflowX > 2) {
        issues.push('document horizontal overflow ' + overflowX + 'px');
      }
      return {
        ok: issues.length === 0,
        issues,
        overflowX,
        controlCount: controls.length,
      };
    })()
  `;
}

function clientForbiddenJsonKeys() {
  return [
    "rtspUrl",
    "httpUrl",
    "file",
    "webrtcSourceId",
    "whepUrl",
    "storagePath",
    "sourceUrl",
    "sourceUri",
    "debugCounters",
    "debugSummary",
    "analysisTapId",
    "modelPath",
    "modelSha256",
    "modelChecksum",
    "modelProvenance",
    "modelUrl",
    "crop",
    "embedding",
    "appearanceCrop",
    "appearanceEmbedding",
    "passwordHash",
    "passwordHistory",
    "tokenHash",
    "sessionToken",
    "credentialRef",
    "capability",
  ];
}

async function assertClientApiContract(label, path) {
  const payload = await requestText(path);
  assertJsonKeysOmitted(label, payload, clientForbiddenJsonKeys());
  assertOmits(label, payload, [
    '"rtspUrl"',
    '"httpUrl"',
    '"file":',
    '"webrtcSourceId"',
    '"whepUrl"',
    '"storagePath"',
    '"sourceUrl"',
    '"sourceUri"',
    '"debugCounters"',
    '"debugSummary"',
    '"analysisTapId"',
    '"modelPath"',
    '"modelSha256"',
    '"modelChecksum"',
    '"modelProvenance"',
    '"modelUrl"',
    '"crop"',
    '"embedding"',
    '"appearanceCrop"',
    '"appearanceEmbedding"',
    '"passwordHash"',
    '"passwordHistory"',
    '"tokenHash"',
    "Developer URL",
    "BBox diagnostics",
    "data-copy-stream-channel",
    "channel-stream-actions",
    "SourceRegistry",
  ]);
  return parseJson(label, payload);
}

async function assertOpsApiContract(label, path) {
  const payload = await requestText(path);
  return parseJson(label, payload);
}

function assertContains(name, text, needles) {
  for (const needle of needles) {
    if (!text.includes(needle)) {
      throw new Error(`missing selector/text: ${needle}`);
    }
  }
}

function assertOmits(name, text, needles) {
  for (const needle of needles) {
    if (text.includes(needle)) {
      throw new Error(`forbidden client/debug text leaked: ${needle}`);
    }
  }
}

function assertJsonKeysOmitted(name, text, keys) {
  const forbidden = new Set(keys);
  const payload = parseJson(name, text);
  const visit = (value, path = "$") => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${path}[${index}]`));
      return;
    }
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      const childPath = `${path}.${key}`;
      if (forbidden.has(key)) {
        throw new Error(`${name}: forbidden JSON key leaked at ${childPath}`);
      }
      visit(child, childPath);
    }
  };
  visit(payload);
}

function parseJson(name, text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`${name}: invalid JSON: ${error.message}`);
  }
}

async function requestText(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const url = new URL(path, `${httpBase}/`);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "text/html,application/json" },
      credentials: "same-origin",
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`${path} HTTP ${response.status}: ${text.slice(0, 180)}`);
    }
    return text;
  } finally {
    clearTimeout(timer);
  }
}

async function assertHttpStatus(label, path, expectedStatus) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const url = new URL(path, `${httpBase}/`);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "text/html,application/json" },
      credentials: "same-origin",
    });
    await response.text();
    if (response.status !== expectedStatus) {
      throw new Error(`${label}: expected HTTP ${expectedStatus}, got ${response.status}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }
    const raw = token.slice(2);
    const eq = raw.indexOf("=");
    if (eq >= 0) {
      result[toCamel(raw.slice(0, eq))] = raw.slice(eq + 1);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      result[toCamel(raw)] = next;
      index += 1;
    } else {
      result[toCamel(raw)] = "1";
    }
  }
  return result;
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_match, chr) => chr.toUpperCase());
}
