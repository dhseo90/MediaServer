#!/usr/bin/env node
// 파일 용도: 현재 v1.8 기준 기능/UI/검증 inventory 문서가 실제 command/route 범위를 덮는지 점검한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Project feature/test inventory verification

Usage:
  ./server.sh verify-project-inventory

Checks:
  - docs/project-feature-test-inventory.md exists and is linked from docs/README.md
  - inventory lists required current sections, UI routes, closed routes, and comparison/gap states
  - inventory classifies every tracked include/src C++ source module
  - inventory classifies tracked support artifacts in root/config/.github/video
  - inventory lists every tracked test fixture and docs asset used by verifiers
  - inventory covers current v1.8 route/API surface families from the HTTP server and product UI scripts
  - every current server.sh command appears in the inventory
  - current-facing docs outside backlog/history do not mention pre-v1.8 baselines
  - current command set has no version-specific verify-v*/verify_v* release verifier
`);
}

assertKnownOptions(rawArgs, ["help"]);

const checks = [];

const inventoryPath = path.join(rootDir, "docs/project-feature-test-inventory.md");
const inventory = readText(inventoryPath);
const docsIndex = readText(path.join(rootDir, "docs/README.md"));
const server = readText(path.join(rootDir, "server.sh"));
const cmake = readText(path.join(rootDir, "CMakeLists.txt"));
const gitignore = readText(path.join(rootDir, ".gitignore"));
const routeSource = [
  readText(path.join(rootDir, "src/ingress/webrtc_http_server.cpp")),
  readText(path.join(rootDir, "src/ingress/product_ui_js.cpp")),
  readText(path.join(rootDir, "src/ingress/product_ui_page_scripts.cpp")),
].join("\n");

check("inventory document is indexed and scoped to current v1.8.0", () => {
  assert(docsIndex.includes("project-feature-test-inventory.md"), "docs index does not link project inventory");
  requireText(inventory, "현재 release 목표 `v1.8.0`", "inventory does not pin v1.8.0 release target");
  requireText(inventory, "인앱 브라우저에서 모든 기능을 직접 클릭하고", "inventory does not separate manual UI full-test evidence");
  requireText(inventory, "이 문서는 현재 제품 기준만 다룹니다", "inventory does not separate archive history");
});

check("inventory has required feature/UI/test/comparison sections", () => {
  for (const heading of [
    "## Code Feature Inventory",
    "## Source Module Inventory Audit",
    "## Support Artifact Inventory Audit",
    "## UI-Accessible Feature Inventory",
    "## UI Action Inventory Audit",
    "## Route/API Surface Audit",
    "## Current Verification Inventory",
    "## Fixture And Test Artifact Inventory Audit",
    "## Script Inventory Audit",
    "### Tracked Script File Detail",
    "## Comparison Result",
    "## Current Gaps",
    "## Maintenance Rules",
  ]) {
    requireText(inventory, heading, `inventory missing section ${heading}`);
  }
});

check("inventory lists every tracked support artifact", () => {
  for (const heading of [
    "### Root Governance And Release Metadata",
    "### GitHub Policy, Templates, And Workflows",
    "### Config And Policy Inputs",
    "### Tracked Sample Media",
  ]) {
    requireText(inventory, heading, `inventory missing support artifact group ${heading}`);
  }

  const supportFiles = trackedSupportFiles();
  const missing = supportFiles.filter(file => !inventory.includes(`\`${file}\``));
  assert(missing.length === 0, `support artifact inventory missing file(s):\n${missing.join("\n")}`);

  for (const phrase of [
    "source release, public repo, config, CI, sample media 검증 범위",
    "verify-actions-security",
    "verify-bundle-policy",
    "verify-docs-ui-assets",
    "모든 sample video의 모든 이벤트를 브라우저에서 전수 확인했다는 evidence는 아직 없습니다",
  ]) {
    requireText(inventory, phrase, `support artifact inventory missing phrase: ${phrase}`);
  }
});

check("inventory lists every tracked script file", () => {
  const missing = [];
  for (const file of gitLsFiles(["scripts"])) {
    if (!inventory.includes(`\`${file}\``)) {
      missing.push(file);
    }
  }
  assert(missing.length === 0, `script inventory missing file(s):\n${missing.join("\n")}`);
  for (const phrase of [
    "ignored runtime 생성물",
    "`scripts/.media_server.env`",
    "`scripts/**/__pycache__/`",
    "`*.pyc`",
    "#### server-command",
    "#### sub-verifier",
    "#### test-entry",
  ]) {
    requireText(inventory, phrase, `script inventory missing phrase: ${phrase}`);
  }
});

check("inventory classifies every current include/src C++ module", () => {
  for (const heading of [
    "### Entry, Config, Shared Types",
    "### Core Stream And Source Runtime",
    "### Core Helpers And Lab-Only Resolver",
    "### Ingress HTTP, Auth, Product UI, Source View",
    "### Ingress Media, RTSP, WebRTC, GStreamer",
    "### Ingress ONVIF",
    "### Analysis Runtime, Detectors, Frame IO",
    "### Analysis Tracking And Metadata",
    "### Analysis Events And Scenarios",
    "### Build Target Wiring",
  ]) {
    requireText(inventory, heading, `inventory missing source module group ${heading}`);
  }

  const sourceFiles = [
    ...walk(path.join(rootDir, "include")),
    ...walk(path.join(rootDir, "src")),
  ]
    .map(file => path.relative(rootDir, file))
    .filter(file => file.endsWith(".cpp") || file.endsWith(".h"))
    .sort();
  const missing = sourceFiles.filter(file => !inventory.includes(`\`${file}\``));
  assert(missing.length === 0, `source module inventory missing file(s):\n${missing.join("\n")}`);
});

check("all current src C++ modules are wired into the media_server build target", () => {
  const cppFiles = walk(path.join(rootDir, "src"))
    .map(file => path.relative(rootDir, file))
    .filter(file => file.endsWith(".cpp"))
    .sort();
  const missing = cppFiles.filter(file => !cmake.includes(file));
  assert(missing.length === 0, `src C++ file(s) not wired in CMakeLists.txt:\n${missing.join("\n")}`);
  requireText(
    cmake,
    "target_sources(media_server PRIVATE src/core/youtube_resolver.cpp)",
    "YouTube resolver optional source is no longer explicitly wired"
  );
  requireText(
    inventory,
    "`src/core/youtube_resolver.cpp`는 `MEDIA_SERVER_ENABLE_YOUTUBE_SOURCE=ON`일 때만",
    "inventory does not document YouTube resolver optional build boundary"
  );
});

check("inventory lists every current test fixture and docs asset", () => {
  for (const heading of [
    "### UI And Docs Visual Assets",
    "### UI Copy Snapshot Fixtures",
    "### Integrator Contract Artifact Fixtures",
    "### ONVIF Fixture Matrix",
    "### ONVIF Field Smoke Sample Bundle",
    "### Runtime, UI Baseline, And Research Boundary Fixtures",
    "### VA Metadata And Scenario Replay Fixtures",
  ]) {
    requireText(inventory, heading, `inventory missing fixture group ${heading}`);
  }

  const fixtureFiles = [
    ...walk(path.join(rootDir, "test/fixtures")),
    ...walk(path.join(rootDir, "docs/assets")),
  ]
    .map(file => path.relative(rootDir, file))
    .sort();
  const missing = fixtureFiles.filter(file => !inventory.includes(`\`${file}\``));
  assert(missing.length === 0, `fixture/artifact inventory missing file(s):\n${missing.join("\n")}`);
  requireText(gitignore, "/models/", "models/ is no longer ignored by source release policy");
  requireText(
    inventory,
    "로컬 `models/`는 `.gitignore` 대상",
    "inventory does not separate local ignored models from tracked fixture inventory"
  );
});

check("inventory covers required product UI and closed routes", () => {
  for (const route of [
    "/",
    "/setup",
    "/login",
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
    "/client",
    "/client/live",
    "/client/dashboard",
    "/client/events",
    "/lab",
    "/lab/rules",
    "/lab/import",
    "/webrtc/test",
  ]) {
    requireText(inventory, `\`${route}\``, `inventory missing route ${route}`);
  }

  for (const boundary of [
    "열리면 실패",
    "직접 제품 UI 없음",
    "제품 UI 없음",
    "UI 풀테스트 evidence는 별도 수행 필요",
    "이 문서 기준 미수행",
  ]) {
    requireText(inventory, boundary, `inventory missing boundary phrase: ${boundary}`);
  }
});

check("inventory covers current product UI action surfaces", () => {
  const actionGroups = [
    {
      name: "Auth shell",
      sourceNeedles: [
        'action="/setup"',
        'action="/login"',
        'action="/password/change"',
        'action="/invite/setup"',
        'id="request-form"',
        'request.path == "/client/api/access-requests"',
      ],
      inventoryNeedles: [
        "Auth shell",
        "`/setup` 관리자 비밀번호 설정",
        "`/client/request-access` 계정/표시명/연락처/채널/사유 입력 후 요청 제출",
        "`id=\"request-form\"`",
      ],
    },
    {
      name: "Ops Home",
      sourceNeedles: [
        'data-testid="ops-home-page"',
        "opsHomeRefresh",
      ],
      inventoryNeedles: [
        "Ops Home",
        "`data-testid=\"ops-home-page\"`",
        "`id=\"opsHomeRefresh\"`",
      ],
    },
    {
      name: "Ops Dashboard",
      sourceNeedles: [
        'data-testid="ops-dashboard-page"',
        "opsDashboardRefresh",
        "dashIncidentTimelineSearch",
        "dashIncidentTimelineSource",
        "dashIncidentTimelineShare",
        "dashVaQualityFilterInput",
      ],
      inventoryNeedles: [
        "Ops Dashboard",
        "incident 검색/출처 필터/링크 복사",
        "`id=\"dashIncidentTimelineSearch\"`",
        "`id=\"dashVaQualityFilterInput\"`",
      ],
    },
    {
      name: "Ops Channels/Sources",
      sourceNeedles: [
        'data-testid="ops-sources-page"',
        'id="add-channel"',
        'id="channel-save-selected"',
        'data-testid="source-group-site-management"',
        'name="rtspUrl"',
        'name="whepUrl"',
        'name="webrtcSourceId"',
        'data-testid="onvif-probe-draft-tool"',
        "onvifProbeDraftApply",
        "channel-audit-refresh",
      ],
      inventoryNeedles: [
        "Ops Channels/Sources",
        "ONVIF probe draft 적용/초기화/profile 선택",
        "`data-testid=\"source-group-site-management\"`",
        "`id=\"onvifProbeDraftApply\"`",
      ],
    },
    {
      name: "Ops Rules",
      sourceNeedles: [
        'data-testid="ops-rules-page"',
        'data-testid="ops-rules-validation-panel"',
        'data-testid="ops-scenario-builder"',
        "opsScenarioBuilderApply",
        "opsRulesFilterInput",
        "opsAddVaRuleBtn",
        "opsCreateVaRuleBtn",
        "opsRulesComposerSave",
        "opsVaRulePreviewStartBtn",
        "opsVaRuleGeometryPreview",
        "opsEventRuleClassesAllBtn",
        "opsProfileAdaptiveToggle",
        "opsRulesAuditRefresh",
      ],
      inventoryNeedles: [
        "Ops Rules",
        "scenario builder preset/type/classes 입력 후 템플릿 적용",
        "preview 재생/재연결/정지",
        "geometry 기본/되돌리기/마지막 점 삭제/비우기/포인터 편집",
        "모든 VA scenario가 실제 영상에서 실제 이벤트 발생까지 확인됐다는 evidence는 없음",
      ],
    },
    {
      name: "Ops Users",
      sourceNeedles: [
        'data-testid="ops-users-page"',
        'id="add-user-btn"',
        'id="user-save-selected"',
        'data-testid="user-channel-assignment-list"',
        "apply-view-scope-template",
        "clear-custom-scopes",
        "user-reset-password-button",
        'href="/client/request-access"',
        "user-audit-refresh",
      ],
      inventoryNeedles: [
        "Ops Users",
        "역할 선택, 채널 assignment 선택",
        "`data-testid=\"user-channel-assignment-list\"`",
        "`id=\"user-reset-password-button\"`",
        "role별 전수 수동 evidence는 없음",
      ],
    },
    {
      name: "Ops Events",
      sourceNeedles: [
        'data-testid="ops-events-page"',
        "opsEventsRefresh",
        'data-testid="ops-alert-delivery-integrations"',
        "alertDeliverySave",
        "alertDeliveryTest",
        'data-testid="ops-event-review-inbox"',
        "eventReviewStatusFilter",
        "eventRecordsEvidenceSelect",
        "eventRecordsIncludeArchives",
        "eventRecordsPrev",
        "eventRecordsNext",
        "data-event-review-save",
        "data-evidence-bundle",
      ],
      inventoryNeedles: [
        "Ops Events",
        "alert delivery ID/kind/label/endpoint/retry/enabled 입력 후 저장/fixture 전송",
        "review status/class/note 저장",
        "`data-evidence-bundle`",
        "실제 이벤트 발생부터 review/export까지 수동 evidence는 없음",
      ],
    },
    {
      name: "Client Live",
      sourceNeedles: [
        'data-testid="client-live-workspace"',
        'data-testid="client-live-drop-grid"',
        "data-source-view",
        'data-role="view"',
        'data-role="mode"',
        'data-mode-action="va-overlay"',
        'data-action="toggle-playback"',
        'data-action="restart"',
        'data-action="stop"',
        "liveGridSize",
        "liveInfoOverlayToggle",
        "liveSaveLayoutPreference",
        "liveApplyRoleLayoutPreset",
      ],
      inventoryNeedles: [
        "Client Live",
        "source tree 클릭/drag/drop",
        "타일 재생/재시작/연결 해제",
        "`id=\"liveSaveLayoutPreference\"`",
        "실제 다중 권한/다중 채널 영상 전수 evidence는 없음",
      ],
    },
    {
      name: "Client Dashboard",
      sourceNeedles: [
        'data-testid="client-dashboard-shell"',
        'data-client-copy="status"',
        'data-client-copy="events"',
        'data-testid="client-dashboard-compare"',
        "clientDashboardCompareFilter",
        "clientDashboardCompareSort",
        'data-testid="client-dashboard-preset-config"',
        "clientDashboardPresetApply",
        "clientDashboardPresetReset",
      ],
      inventoryNeedles: [
        "Client Dashboard",
        "상태 복사, 이벤트 복사",
        "compare filter/sort 선택",
        "`id=\"clientDashboardPresetApply\"`",
      ],
    },
    {
      name: "Closed product UI routes",
      sourceNeedles: [
        'request.path == "/lab"',
        'request.path == "/lab/rules"',
        'request.path == "/lab/import"',
        'request.path == "/webrtc/test"',
      ],
      inventoryNeedles: [
        "Closed product UI routes",
        "`/lab`, `/lab/rules`, `/lab/import`, `/webrtc/test`는 제품 화면 action target이 아니며 열리면 실패",
      ],
    },
  ];

  const missing = [];
  for (const group of actionGroups) {
    for (const needle of group.sourceNeedles) {
      if (!routeSource.includes(needle)) {
        missing.push(`${group.name}: source missing ${needle}`);
      }
    }
    for (const needle of group.inventoryNeedles) {
      if (!inventory.includes(needle)) {
        missing.push(`${group.name}: inventory missing ${needle}`);
      }
    }
  }
  assert(missing.length === 0, `UI action inventory mismatch:\n${missing.join("\n")}`);
});

check("inventory covers current v1.8 route/API surface families", () => {
  const routeFamilies = [
    {
      name: "Auth/session",
      sourceNeedles: [
        'request.path == "/setup"',
        'request.path == "/login"',
        'request.path == "/logout"',
        'request.path == "/password/change"',
        'request.path == "/invite/setup"',
        'request.path == "/auth/whoami"',
        'request.path == "/client/request-access"',
        'request.path == "/client/api/access-requests"',
      ],
      inventoryNeedles: [
        "Auth/session",
        "/logout",
        "/auth/whoami",
        "/client/api/access-requests",
      ],
    },
    {
      name: "Ops shell",
      sourceNeedles: [
        'path == "/ops"',
        '"/ops/home"',
        '"/ops/dashboard"',
        '"/ops/events"',
        'request.path == "/ops/sources"',
        'request.path == "/ops/users"',
        'request.path == "/ops/rules"',
      ],
      inventoryNeedles: [
        "Ops shell",
        "/ops",
        "/ops/home",
        "/ops/events",
        "primary nav 기준은 Home/Dashboard/Channels/Rules/Users/Client Preview",
      ],
    },
    {
      name: "Client shell",
      sourceNeedles: [
        'path == "/client"',
        '"/client/live"',
        '"/client/dashboard"',
        '"/client/events"',
      ],
      inventoryNeedles: [
        "Client shell",
        "/client",
        "/client/events",
        "primary nav 기준은 Live/Dashboard",
      ],
    },
    {
      name: "Ops source/view/channel APIs",
      sourceNeedles: [
        'request.path == "/ops/api/sources"',
        'request.path == "/ops/api/views"',
        'request.path == "/ops/api/channels/bulk"',
        'request.path == "/ops/api/onvif/import-draft"',
      ],
      inventoryNeedles: [
        "Ops source/view/channel APIs",
        "/ops/api/sources/{sourceId}",
        "/ops/api/views/{viewId}",
        "/ops/api/onvif/import-draft",
      ],
    },
    {
      name: "Ops rule/config APIs",
      sourceNeedles: [
        'request.path == "/ops/api/rules/catalog"',
        'request.path == "/lab/analysis/profiles"',
        'request.path == "/lab/analysis/rules"',
        'request.path == "/lab/analysis/va-rules"',
        'std::string("/lab/analysis/profiles/")',
        'std::string("/lab/analysis/rules/")',
        'std::string("/lab/analysis/va-rules/")',
      ],
      inventoryNeedles: [
        "Ops rule/config APIs",
        "/lab/analysis/profiles/{profileId}",
        "/lab/analysis/rules/{ruleId}",
        "/lab/analysis/va-rules/{ruleId}",
      ],
    },
    {
      name: "Ops runtime/diagnostics APIs",
      sourceNeedles: [
        'request.path == "/ops/api/runtime/status"',
        'request.path == "/ops/api/source-health"',
        'request.path == "/ops/api/source-health/bulk"',
        'request.path == "/ops/api/diagnostics/log-tail"',
      ],
      inventoryNeedles: [
        "Ops runtime/diagnostics APIs",
        "/ops/api/runtime/status",
        "/ops/api/source-health/bulk",
        "/ops/api/diagnostics/log-tail",
      ],
    },
    {
      name: "Ops events/reviews/alerts/audit APIs",
      sourceNeedles: [
        'request.path == "/ops/api/events/status"',
        'request.path == "/ops/api/events/reviews"',
        'request.path.rfind("/ops/api/events/reviews/", 0) == 0',
        'request.path == "/ops/api/alerts/deliveries"',
        'request.path == "/ops/api/alerts/deliveries/test"',
        'request.path == "/ops/api/audit"',
      ],
      inventoryNeedles: [
        "Ops events/reviews/alerts/audit APIs",
        "/ops/api/events/reviews/{eventId}",
        "/ops/api/alerts/deliveries/test",
        "/ops/api/audit",
      ],
    },
    {
      name: "Ops users/access/invites APIs",
      sourceNeedles: [
        'request.path == "/ops/api/users"',
        'request.path.rfind("/ops/api/users/", 0) == 0',
        'request.path == "/ops/api/access-requests"',
        'request.path.rfind("/ops/api/access-requests/", 0) == 0',
        'request.path == "/ops/api/invites"',
      ],
      inventoryNeedles: [
        "Ops users/access/invites APIs",
        "/ops/api/users/{username}",
        "/ops/api/users/{username}/enable",
        "/ops/api/users/{username}/disable",
        "/ops/api/users/{username}/reset-password",
        "/ops/api/access-requests/{requestId}/approve",
        "/ops/api/access-requests/{requestId}/reject",
      ],
    },
    {
      name: "Lab utility/report APIs",
      sourceNeedles: [
        'request.path == "/lab/files"',
        'request.path == "/lab/reports"',
        'request.path == "/lab/reports/content"',
        "requestJson('/lab/files')",
      ],
      inventoryNeedles: [
        "Lab utility/report APIs",
        "/lab/files",
        "/lab/reports",
        "/lab/reports/content",
        "`/ops/sources` file selector가 `/lab/files`를 소비",
      ],
    },
    {
      name: "Client scoped APIs",
      sourceNeedles: [
        'request.path == "/client/api/views"',
        'request.path.rfind("/client/api/views/", 0) == 0',
        'request.path == "/client/api/preferences/live-layout"',
        'subresource == "dashboard"',
        'subresource == "events"',
        'subresource == "metadata"',
      ],
      inventoryNeedles: [
        "Client scoped APIs",
        "/client/api/views/{viewId}/dashboard",
        "/client/api/views/{viewId}/events",
        "/client/api/views/{viewId}/metadata",
        "/client/api/preferences/live-layout",
      ],
    },
    {
      name: "Client WebRTC proxy APIs",
      sourceNeedles: [
        'subresource == "webrtc/session"',
        'client_session_prefix = "webrtc/session/"',
        'session_suffix == "/answer"',
        'session_suffix == "/ice"',
      ],
      inventoryNeedles: [
        "Client WebRTC proxy APIs",
        "/client/api/views/{viewId}/webrtc/session",
        "/client/api/views/{viewId}/webrtc/session/{sessionId}/answer",
        "/client/api/views/{viewId}/webrtc/session/{sessionId}/ice",
      ],
    },
    {
      name: "Lab analysis runtime APIs",
      sourceNeedles: [
        'request.path == "/lab/analysis/capabilities"',
        'std::string("/lab/analysis/image")',
        'request.path == "/lab/analysis/metadata/stream"',
        'request.path == "/lab/analysis/taps"',
        'std::string("/lab/analysis/taps/")',
        'request.path == "/ws/va-metadata"',
        'suffix == "/bbox-diagnostics"',
        'suffix == "/events"',
      ],
      inventoryNeedles: [
        "Lab analysis runtime APIs",
        "/lab/analysis/image/metadata",
        "/lab/analysis/image/snapshot",
        "/lab/analysis/image/overlay.jpg",
        "/lab/analysis/taps/{tapId}/bbox-diagnostics",
        "/lab/analysis/taps/{tapId}/state-dump",
        "/lab/analysis/taps/{tapId}/metrics-dump",
        "/lab/analysis/taps/{tapId}/snapshot",
        "/lab/analysis/taps/{tapId}/overlay",
        "/ws/va-metadata",
      ],
    },
    {
      name: "Event storage/evidence APIs",
      sourceNeedles: [
        'request.path == "/lab/analysis/event-post/status"',
        'request.path == "/lab/analysis/event-storage/status"',
        'request.path == "/lab/analysis/events/records"',
        'request.path == "/lab/analysis/events/records/compact"',
        'request.path == "/lab/analysis/events/records/compactions"',
        'request.path == "/lab/analysis/events/records/compactions/cleanup"',
        'std::string("/lab/analysis/events/records/compactions/")',
        'request.path == "/lab/analysis/events/evidence"',
        'request.path == "/lab/analysis/events/evidence/bundle-token"',
        'request.path == "/lab/analysis/events/evidence/bundle"',
      ],
      inventoryNeedles: [
        "Event storage/evidence APIs",
        "/lab/analysis/events/records/compactions/{file}",
        "/lab/analysis/events/evidence/bundle-token",
        "/lab/analysis/events/evidence/bundle",
      ],
    },
    {
      name: "Generic WebRTC/WHEP/WHIP signaling",
      sourceNeedles: [
        'request.path == "/webrtc/config"',
        'request.path == "/webrtc/session"',
        'request.path == "/whep"',
        'request.path == "/whip/publish"',
        'std::string("/webrtc/session/")',
        'std::string("/whep/session/")',
        'std::string("/whip/publish/session/")',
      ],
      inventoryNeedles: [
        "Generic WebRTC/WHEP/WHIP signaling",
        "/webrtc/session/{sessionId}/answer",
        "/webrtc/session/{sessionId}/ice",
        "/whep/session/{sessionId}",
        "/whep/session/{sessionId}/answer",
        "/whep/session/{sessionId}/ice",
        "/whip/publish/session/{sessionId}",
        "/whip/publish/session/{sessionId}/ice",
      ],
    },
    {
      name: "Runtime utility and closed UI boundaries",
      sourceNeedles: [
        'request.path == "/health"',
        'request.path == "/favicon.ico"',
        'request.path == "/lab/runtime/status"',
        'request.path == "/webrtc/test"',
        'request.path == "/lab"',
        'request.path == "/lab/rules"',
        'request.path == "/lab/import"',
      ],
      inventoryNeedles: [
        "Runtime utility and closed UI boundaries",
        "/lab/runtime/status",
        "closed `/lab`, `/lab/rules`, `/lab/import`, `/webrtc/test`",
      ],
    },
  ];

  const missing = [];
  for (const family of routeFamilies) {
    for (const needle of family.sourceNeedles) {
      if (!routeSource.includes(needle)) {
        missing.push(`${family.name}: source missing ${needle}`);
      }
    }
    for (const needle of family.inventoryNeedles) {
      if (!inventory.includes(needle)) {
        missing.push(`${family.name}: inventory missing ${needle}`);
      }
    }
  }
  assert(missing.length === 0, `route/API surface audit mismatch:\n${missing.join("\n")}`);
});

check("inventory covers current server.sh command set", () => {
  const commands = parseServerCommands();
  const inventoryCommandDetails = parseInventoryCommandDetails();
  const detailMissing = [];
  const missing = [];
  for (const command of commands) {
    if (!inventory.includes(`\`${command}\``)) {
      missing.push(command);
    }
    if (!inventoryCommandDetails.has(command)) {
      detailMissing.push(command);
    }
  }
  assert(missing.length === 0, `inventory missing server.sh command(s):\n${missing.join("\n")}`);
  assert(
    detailMissing.length === 0,
    `tracked script command detail missing server.sh command(s):\n${detailMissing.join("\n")}`
  );
  requireText(
    inventory,
    "command-to-script dispatch matrix",
    "inventory does not define server-command detail as the command-to-script dispatch matrix"
  );
});

check("inventory documents non-server CMake and test-entry boundaries", () => {
  const cmakeTestMatches = [...cmake.matchAll(/\b(enable_testing|add_test|CTest)\b/g)].map(match => match[0]);
  assert(
    cmakeTestMatches.length === 0,
    `CMake test registry exists but inventory does not enumerate it:\n${[...new Set(cmakeTestMatches)].join("\n")}`
  );
  const testAll = readText(path.join(rootDir, "scripts/internal/test_all.sh"));
  for (const entry of [
    "scripts/internal/test_external_access.sh",
    "scripts/internal/test_external_source_reachability.sh",
    "scripts/internal/test_rule_registry.sh",
  ]) {
    requireText(testAll, entry, `test_all.sh does not reference ${entry}`);
    requireText(inventory, `\`${entry}\``, `inventory missing test-entry ${entry}`);
  }
  for (const phrase of [
    "CMakeLists.txt에는 `enable_testing`, `add_test`, `CTest` 기반 별도 test registry가",
    "현재 테스트 source-of-truth는 `server.sh` dispatch와",
    "`test-entry` script는 `scripts/internal/test_all.sh`에서 호출되는 하위 entry",
  ]) {
    requireText(inventory, phrase, `inventory missing non-server test boundary phrase: ${phrase}`);
  }
});

check("inventory comparison reports code/UI/test mismatch classes", () => {
  for (const phrase of [
    "Code + UI + automated tests 있음",
    "Code + tests 있음, 제품 UI 없음",
    "Code + tests 있음, UI 노출 제한",
    "UI + tests 있음, 실제 full manual evidence 없음",
    "Tests 있음, 현재 제품 기능 아님",
    "Tests 있음, 환경/field gate",
  ]) {
    requireText(inventory, phrase, `inventory missing comparison class: ${phrase}`);
  }

  for (const gap of [
    "Manual UI full test evidence는 아직 없음",
    "모든 VA scenario가 실제 브라우저 UI에서 실제 이벤트 발생까지 확인됐다는 증거는",
    "실장비 ONVIF, 외부 WHEP/TURN, 장시간 soak",
    "Integrator role은 API/scope 중심",
  ]) {
    requireText(inventory, gap, `inventory missing explicit gap: ${gap}`);
  }
});

check("current command set excludes version-specific release verifiers", () => {
  const commands = parseServerCommands().filter(command => /^verify-v[0-9]/.test(command));
  assert(commands.length === 0, `version-specific verify-v command(s) remain:\n${commands.join("\n")}`);

  const versionScripts = fs
    .readdirSync(path.join(rootDir, "scripts/internal"))
    .filter(name => /^verify_v[0-9]/.test(name));
  assert(versionScripts.length === 0, `version-specific verify_v script(s) remain:\n${versionScripts.join("\n")}`);

  assert(!/verify-v[0-9]/.test(server), "server.sh still documents version-specific verify-v command");
  assert(!/verify_v[0-9]/.test(server), "server.sh still references version-specific verify_v script");
});

check("current-facing markdown outside the backlog archive does not carry pre-v1.8 baselines", () => {
  const offenders = [];
  const markdownFiles = [
    ...rootMarkdownFiles(),
    ...walkIfExists(path.join(rootDir, ".github")).filter(file => file.endsWith(".md")),
    ...walk(path.join(rootDir, "docs")).filter(file => file.endsWith(".md")),
    ...walk(path.join(rootDir, "test/fixtures")).filter(file => file.endsWith(".md")),
  ];
  for (const file of markdownFiles) {
    const relative = path.relative(rootDir, file);
    if (relative === "docs/development-backlog.md") continue;
    const text = readText(file);
    const matches = oldVersionBaselineMentions(text);
    if (matches.length > 0) {
      offenders.push(`${relative}: ${[...new Set(matches)].join(", ")}`);
    }
  }
  assert(offenders.length === 0, `old version baseline mention(s) remain outside archive:\n${offenders.join("\n")}`);
  const remainingHistoryDocs = walkIfExists(path.join(rootDir, "docs/history")).filter(file => file.endsWith(".md"));
  assert(remainingHistoryDocs.length === 0, `standalone history markdown remains:\n${remainingHistoryDocs.join("\n")}`);
  requireText(
    inventory,
    "standalone close-out/history 문서는 제거",
    "inventory does not state standalone history docs were removed"
  );
  requireText(
    inventory,
    "`v1.x`/`v1.x.y`처럼 `v`가 붙은 표기, `1.x.y`처럼 `v`가 없는 bare semantic",
    "inventory does not state v-prefixed, bare semantic, and context bare old versions are blocked"
  );
});

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
console.log("== Project feature/test inventory verification summary ==");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function requireText(text, needle, message) {
  assert(text.includes(needle), message);
}

function oldVersionBaselineMentions(text) {
  const matches = [
    ...text.matchAll(/\bv1\.(?:1|2|3|4|5|6|7)(?:\.(?:0|1))?\b/g),
    ...text.matchAll(/\b1\.(?:1|2|3|4|5|6|7)\.(?:0|1)\b/g),
    ...text.matchAll(/(?:release|version|baseline|current|기준|버전|릴리즈|현재)[^\n]{0,40}\b1\.(?:1|2|3|4|5|6|7)\b/g),
    ...text.matchAll(/\b1\.(?:1|2|3|4|5|6|7)\b[^\n]{0,40}(?:release|version|baseline|current|기준|버전|릴리즈|현재)/g),
  ];
  return matches.map(match => match[0]);
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function gitLsFiles(args) {
  return execFileSync("git", ["ls-files", ...args], {
    cwd: rootDir,
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .filter(Boolean);
}

function trackedSupportFiles() {
  const rootSupport = new Set([
    ".gitignore",
    "AGENTS.md",
    "CMakeLists.txt",
    "CONTRIBUTING.md",
    "DEPENDENCY_SNAPSHOT.md",
    "LICENSE",
    "NOTICE",
    "README.en.md",
    "README.md",
    "SECURITY.md",
    "THIRD_PARTY_NOTICES.md",
    "VERSION",
    "server.sh",
  ]);
  return gitLsFiles([]).filter(file =>
    rootSupport.has(file) ||
    file.startsWith(".github/") ||
    file.startsWith("config/") ||
    file.startsWith("video/")
  );
}

function parseServerCommands() {
  const commands = [];
  const regex = /^\s{2}([a-zA-Z0-9_.|-]+)\)/gm;
  let match;
  while ((match = regex.exec(server)) !== null) {
    for (const command of match[1].split("|")) {
      if (!commands.includes(command)) commands.push(command);
    }
  }
  return commands.filter(command => command !== "*");
}

function parseInventoryCommandDetails() {
  const commands = new Set();
  const regex = /^- `scripts\/internal\/[^`]+` - commands: (.+)$/gm;
  let match;
  while ((match = regex.exec(inventory)) !== null) {
    for (const commandMatch of match[1].matchAll(/`([^`]+)`/g)) {
      commands.add(commandMatch[1]);
    }
  }
  return commands;
}

function walk(dir) {
  const result = [];
  for (const name of fs.readdirSync(dir)) {
    const current = path.join(dir, name);
    const stat = fs.statSync(current);
    if (stat.isDirectory()) result.push(...walk(current));
    else result.push(current);
  }
  return result;
}

function walkIfExists(dir) {
  if (!fs.existsSync(dir)) return [];
  return walk(dir);
}

function rootMarkdownFiles() {
  return fs
    .readdirSync(rootDir)
    .filter(name => name.endsWith(".md"))
    .map(name => path.join(rootDir, name));
}
