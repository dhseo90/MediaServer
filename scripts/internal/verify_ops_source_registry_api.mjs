#!/usr/bin/env node
// 파일 용도: 격리 서버에서 SourceRegistry/PublishedView API의 CRUD, soft-disable, projection을 직접 검증한다.

import { randomUUID } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Ops source registry API direct verification

Usage:
  ./server.sh verify-ops-source-registry-api [--timeout-ms <ms>]

The verifier owns an isolated server, token credentials, registry files, random ports, and cleanup.
It exercises product HTTP/storage flows without running the UI full suite or a long-run test.
`);
}
assertKnownOptions(rawArgs, ["timeout-ms", "h", "help"]);

const timeoutMs = numberOption(rawArgs, "timeout-ms", 20000);
const runId = `ops-source-registry-api-${Date.now()}-${process.pid}`;
const stateDir = path.join("/private/tmp", `media_server_${runId}`);
const sourceFile = path.join(stateDir, "sources.json");
const viewFile = path.join(stateDir, "views.json");
const analysisFile = path.join(stateDir, "analysis.json");
const usersFile = path.join(stateDir, "users.json");
const eventFile = path.join(stateDir, "events.jsonl");
const managedSourceIds = new Set(["1", "2", "3", "4", "5"]);
const managedViewIds = new Set(["1", "2"]);
const adminToken = `admin-${randomUUID()}`;
const operatorToken = `operator-${randomUUID()}`;
let httpPort = 0;
let rtspPort = 0;
let httpBase = "";
let server = null;
const serverLogs = [];

try {
  fs.mkdirSync(stateDir, { recursive: true });
  // 제품은 registry가 완전히 비면 demo row를 seed한다. Disabled sentinel은 이 verifier의
  // throwaway registry를 bootstrap 경로와 격리하며, 아래 assertion은 현재 run 소유 row만
  // 집계한다.
  fs.writeFileSync(sourceFile, `${JSON.stringify({ sources: [{
    sourceId: "900000",
    displayName: "REVIEW4 Managed Sentinel",
    kind: "file",
    file: "__review4_managed_sentinel__.mp4",
    enabled: false,
  }] })}\n`);
  fs.writeFileSync(viewFile, `${JSON.stringify({ views: [{
    viewId: "900000",
    sourceId: "900000",
    displayName: "REVIEW4 Managed Sentinel",
    defaultRuleId: "",
    allowedRuleIds: [],
    allowedOverlayModes: ["raw"],
    showDashboard: false,
    showEvents: false,
    showMetadataSummary: false,
    clientGroups: [],
    maxTiles: 1,
    enabled: false,
  }] })}\n`);
  httpPort = await freePort();
  rtspPort = await freePort();
  while (rtspPort === httpPort) rtspPort = await freePort();
  httpBase = `http://127.0.0.1:${httpPort}`;
  server = startServer();
  await waitForServer();
  await runSourceRegistryContract();
  console.log("[summary] ops-source-registry-api complete");
} finally {
  await stopServer();
  fs.rmSync(stateDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  assert(!fs.existsSync(stateDir), "managed source registry state directory cleanup failed");
  console.log("[pass] managed source registry server/port/temp cleanup");
}

async function runSourceRegistryContract() {
  const sources = sourceFixtures();
  const created = [];
  for (const source of sources) {
    const response = await requestJson("/ops/api/sources", {
      method: "POST",
      headers: opsJsonHeaders(),
      body: JSON.stringify(source),
    }, 201);
    created.push({ ...response.source, mutationStatus: response.status });
  }
  const sourceList = await opsJson("/ops/api/sources");
  const storedSources = readJson(sourceFile).sources || [];
  assertSourceKindCreateReadback(created, sourceList.sources || [], storedSources);
  assertSourceListReadback(sourceList, storedSources);
  assertSourceDetailProjectionReadback(sourceList.sources || []);

  const invalidResponse = await requestJsonWithStatus("/ops/api/sources", {
    method: "POST",
    headers: opsJsonHeaders(),
    body: JSON.stringify({ sourceId: "", displayName: "" }),
  }, 400);
  assertSourceCreateValidationReadback(invalidResponse.status, invalidResponse.payload, sourceList.sources || []);

  const updatedPayload = { ...sources[0], displayName: "File Source Updated", zone: "South" };
  const updated = await requestJson("/ops/api/sources/1", {
    method: "PUT",
    headers: opsJsonHeaders(),
    body: JSON.stringify(updatedPayload),
  }, 200);
  const updatedList = await opsJson("/ops/api/sources");
  assertSourceUpdateReadback(updated, updatedList, readJson(sourceFile));

  const viewOne = viewFixture("1", "1", { displayName: "View One", allowedRuleIds: ["12", "13"], defaultRuleId: "12" });
  const viewTwo = viewFixture("2", "2", { displayName: "View Two" });
  const createdViewOne = await requestJson("/ops/api/views", {
    method: "POST", headers: opsJsonHeaders(), body: JSON.stringify(viewOne),
  }, 201);
  const createdViewTwo = await requestJson("/ops/api/views", {
    method: "POST", headers: opsJsonHeaders(), body: JSON.stringify(viewTwo),
  }, 201);
  const viewList = await opsJson("/ops/api/views");
  const clientList = await clientJson("/client/api/views");
  assertPublishedViewListReadback(viewList, readJson(viewFile));
  assertPublishedViewCreateReadback(createdViewOne, createdViewTwo, clientList);

  const changedView = viewFixture("1", "2", {
    displayName: "View One Updated",
    allowedRuleIds: ["13", "14"],
    defaultRuleId: "13",
    showDashboard: true,
  });
  const updatedView = await requestJson("/ops/api/views/1", {
    method: "PUT", headers: opsJsonHeaders(), body: JSON.stringify(changedView),
  }, 200);
  const changedClientDetail = await clientJson("/client/api/views/1");
  assertPublishedViewUpdateReadback(updatedView, changedClientDetail, readJson(viewFile));
  assertViewSourceMappingReadback(changedClientDetail, "2");
  assertAllowedRuleListReadback(changedClientDetail, ["13", "14"]);

  await requestJson("/ops/api/views/1", {
    method: "PUT", headers: opsJsonHeaders(), body: JSON.stringify(viewOne),
  }, 200);
  const disabledSource = await requestJson("/ops/api/sources/1", {
    method: "DELETE", headers: opsHeaders(),
  }, 200);
  const disabledSourceList = await opsJson("/ops/api/sources");
  const disabledSourceClient = await requestText("/client/api/views/1", { headers: clientHeaders() }, 404);
  const disabledSourceSession = await requestText("/client/api/views/1/webrtc/session", {
    method: "POST", headers: clientJsonHeaders(), body: '{"overlayMode":"raw"}',
  }, 404);
  assertSourceSoftDisableReadback(disabledSource, disabledSourceList, readJson(sourceFile), disabledSourceClient, disabledSourceSession);
  assertSourceEnabledBoundaryReadback(disabledSourceList, disabledSourceClient);
  await requestJson("/ops/api/sources/1", {
    method: "PUT", headers: opsJsonHeaders(), body: JSON.stringify(updatedPayload),
  }, 200);
  const enabledClient = await clientJson("/client/api/views/1");
  assertSourceReenableReadback(enabledClient, readJson(sourceFile));

  const disabledView = await requestJson("/ops/api/views/1", {
    method: "DELETE", headers: opsHeaders(),
  }, 200);
  const disabledViewList = await opsJson("/ops/api/views");
  const disabledViewClient = await requestText("/client/api/views/1", { headers: clientHeaders() }, 404);
  const disabledViewSession = await requestText("/client/api/views/1/webrtc/session", {
    method: "POST", headers: clientJsonHeaders(), body: '{"overlayMode":"raw"}',
  }, 404);
  assertPublishedViewSoftDisableReadback(disabledView, disabledViewList, readJson(viewFile), disabledViewClient, disabledViewSession);
  assertPublishedViewEnabledBoundaryReadback(disabledViewList, disabledViewClient);
  await requestJson("/ops/api/views/1", {
    method: "PUT", headers: opsJsonHeaders(), body: JSON.stringify(viewOne),
  }, 200);

  const projectionList = await clientJson("/client/api/views");
  const projectionDetail = await clientJson("/client/api/views/1");
  assertClientViewScopeProjectionReadback(projectionList, projectionDetail);
  assertViewDashboardReadback(await clientJson("/client/api/views/1/dashboard"), projectionDetail);

  let clientSessionId = "";
  try {
    const session = await requestJson("/client/api/views/1/webrtc/session", {
      method: "POST", headers: clientJsonHeaders(), body: '{"overlayMode":"raw"}',
    }, 200);
    clientSessionId = String(session.sessionId || "");
    assertWebRtcWrapperCreateReadback(session);
  } finally {
    if (clientSessionId) {
      const closed = await requestJson(`/client/api/views/1/webrtc/session/${encodeURIComponent(clientSessionId)}`, {
        method: "DELETE", headers: clientHeaders(),
      }, 200);
      assertWebRtcWrapperDeleteReadback(closed, clientSessionId);
    }
  }
  await assertWebRtcSignalingDeleteRaceReadback();

  const sourceHealth = await opsJson("/ops/api/source-health");
  assertSourceHealthReadback(sourceHealth);
  const healthBulk = await requestJson("/ops/api/source-health/bulk", {
    method: "POST", headers: opsJsonHeaders(), body: '{"operation":"check","sourceIds":["1","999999"]}',
  }, 200);
  assertSourceHealthBulkReadback(healthBulk);

  const sourceCountBeforeDraft = (await opsJson("/ops/api/sources")).sources.length;
  const onvifFixture = fs.readFileSync(path.join(rootDir, "test/fixtures/onvif_live_import_stub.json"), "utf8");
  const onvifDraftText = await requestText("/ops/api/onvif/import-draft", {
    method: "POST", headers: opsJsonHeaders(), body: onvifFixture,
  }, 200);
  const onvifDraft = JSON.parse(onvifDraftText);
  const sourceCountAfterDraft = (await opsJson("/ops/api/sources")).sources.length;
  assertOnvifDraftReadback(onvifDraft, onvifDraftText, sourceCountBeforeDraft, sourceCountAfterDraft);

  const bulk = await requestJson("/ops/api/channels/bulk", {
    method: "POST",
    headers: opsJsonHeaders(),
    body: JSON.stringify({
      operation: "validate",
      dryRun: true,
      items: [
        { sourceId: "1", source: updatedPayload, view: viewOne },
        { sourceId: "", source: {}, view: {} },
      ],
    }),
  }, 200);
  const bulkContractCommand = "verify-ops-channel-bulk";
  const bulkContractResult = spawnSync("./server.sh", [bulkContractCommand], { cwd: rootDir, encoding: "utf8" });
  const bulkContract = { command: bulkContractCommand, status: bulkContractResult.status };
  assertChannelBulkReadback(bulk, await opsJson("/ops/api/sources"), await opsJson("/ops/api/views"), bulkContract);
  await assertRemainingSourceReadModels(onvifDraft, sourceCountBeforeDraft, sourceCountAfterDraft);
}

function assertSourceKindCreateReadback(created, listed, stored) {
  const byId = new Map(created.map(item => [String(item.sourceId), item]));
  const listedIds = new Set(listed.map(item => String(item.sourceId)));
  const storedIds = new Set(stored.map(item => String(item.sourceId)));
  assert(byId.get("1")?.mutationStatus === "created" && byId.get("1")?.kind === "file" && byId.get("1")?.file === "sample_h264.mp4" && listedIds.has("1") && storedIds.has("1"), "SRC-001 file source API/list/storage readback failed");
  assert(byId.get("2")?.kind?.toUpperCase() === "RTSP" && byId.get("2")?.rtspUrl?.startsWith("rtsp://") && listedIds.has("2") && storedIds.has("2"), "SRC-002 rtsp source API/list/storage readback failed");
  assert(byId.get("3")?.kind === "hls" && byId.get("3")?.httpUrl?.endsWith(".m3u8") && listedIds.has("3") && storedIds.has("3"), "SRC-003 hls source API/list/storage readback failed");
  assert(byId.get("4")?.kind === "whep" && byId.get("4")?.whepUrl?.includes("/whep") && listedIds.has("4") && storedIds.has("4"), "SRC-004 whep source API/list/storage readback failed");
  assert(byId.get("5")?.kind === "webrtc" && byId.get("5")?.webrtcSourceId === "whip-published-5" && listedIds.has("5") && storedIds.has("5"), "SRC-005 webrtc WHIP-published source API/list/storage readback failed");
}

function assertSourceListReadback(payload, stored) {
  const listedManaged = (payload.sources || []).filter(item => managedSourceIds.has(String(item.sourceId)));
  const storedManaged = stored.filter(item => managedSourceIds.has(String(item.sourceId)));
  assert(payload.status === "registry" && Array.isArray(payload.sources) && listedManaged.length === storedManaged.length && listedManaged.length === 5, "SRC-006 source list count/status API-storage readback failed");
}

function assertSourceDetailProjectionReadback(sources) {
  const source = sources.find(item => String(item.sourceId) === "1");
  assert(source?.displayName === "File Source" && source?.kind === "file" && source?.enabled === true && source?.zone === "North", "SRC-007 source field projection readback failed");
}

function assertSourceCreateValidationReadback(invalidStatus, invalid, sources) {
  assert(invalidStatus === 400 && Boolean(invalid.error) && !sources.some(item => String(item.sourceId) === ""), "SRC-008 invalid source create rejection and successful row preservation failed");
}

function assertSourceUpdateReadback(response, listed, stored) {
  const api = (listed.sources || []).find(item => String(item.sourceId) === "1");
  const disk = (stored.sources || []).find(item => String(item.sourceId) === "1");
  const sourcePayloadReadback = api;
  assert(response.status === "updated" && sourcePayloadReadback?.displayName === "File Source Updated" && sourcePayloadReadback?.zone === "South" && disk?.displayName === sourcePayloadReadback.displayName && disk?.zone === sourcePayloadReadback.zone, "SRC-009 source PUT/list/storage update readback failed");
}

function assertSourceSoftDisableReadback(response, listed, stored, clientBody, sessionBody) {
  const api = (listed.sources || []).find(item => String(item.sourceId) === "1");
  const disk = (stored.sources || []).find(item => String(item.sourceId) === "1");
  assert(response.status === "disabled" && api?.enabled === false && disk?.enabled === false && clientBody.includes("not available") && sessionBody.includes("not available"), "SRC-010 source DELETE soft-disable and client/session blocked readback failed");
}

function assertSourceEnabledBoundaryReadback(listed, clientBody) {
  const api = (listed.sources || []).find(item => String(item.sourceId) === "1");
  assert(api?.enabled === false && clientBody.includes("PublishedView source is not available"), "SRC-011 disabled source client forbidden boundary readback failed");
}

function assertSourceReenableReadback(clientDetail, stored) {
  const disk = (stored.sources || []).find(item => String(item.sourceId) === "1");
  assert(clientDetail.ok === true && clientDetail.view?.sourceId === "1" && disk?.enabled === true, "SRC-011 source re-enable API/storage/client readback failed");
}

function assertSourceHealthReadback(payload) {
  assert(payload.ok === true && payload.schema === "media-server.ops.source-health.v1" && Array.isArray(payload.sourceHealth) && typeof payload.summary === "object", "SRC-012 source health API schema/status readback failed");
}

function assertSourceHealthBulkReadback(payload) {
  assert(payload.ok === true && payload.schema === "media-server.ops.source-health.bulk.v1" && payload.requestedCount === 2 && Array.isArray(payload.results) && payload.results.some(item => item.sourceId === "999999" && item.reason === "not-found"), "SRC-013 source health bulk schema/count/status readback failed");
}

function assertOnvifDraftReadback(payload, raw, beforeCount, afterCount) {
  const forbidden = ["\"credentialRef\":", "operator-entered-secret", "/onvif/device_service"];
  assert(payload.ok === true && payload.status === "onvifImportDraft" && payload.notSaved === true && beforeCount === afterCount && forbidden.every(token => !raw.includes(token)), "SRC-014 ONVIF draft no-save/redaction readback failed");
}

function assertChannelBulkReadback(payload, sources, views, bulkContract) {
  const managedSources = (sources.sources || []).filter(item => managedSourceIds.has(String(item.sourceId)));
  const managedViews = (views.views || []).filter(item => managedViewIds.has(String(item.viewId)));
  assert(bulkContract.command === "verify-ops-channel-bulk" && bulkContract.status === 0 && payload.status === "ops-channel-bulk" && payload.dryRun === true && payload.partialFailure === true && payload.okCount === 1 && payload.failCount === 1 && Array.isArray(payload.results) && managedSources.length === 5 && managedViews.length === 2, "SRC-015 channel bulk dry-run partial-failure/no-mutation readback failed");
}

function assertPublishedViewListReadback(payload, stored) {
  const listedManaged = (payload.views || []).filter(item => managedViewIds.has(String(item.viewId)));
  const storedManaged = (stored.views || []).filter(item => managedViewIds.has(String(item.viewId)));
  assert(payload.status === "registry" && Array.isArray(payload.views) && listedManaged.length === 2 && listedManaged.length === storedManaged.length, "SRC-016 PublishedView list count/storage readback failed");
}

function assertPublishedViewCreateReadback(first, second, clientList) {
  const ids = new Set((clientList.views || []).map(item => String(item.viewId)));
  assert(first.status === "created" && second.status === "created" && ids.has("1") && ids.has("2"), "SRC-017 PublishedView create/client selection readback failed");
}

function assertPublishedViewUpdateReadback(response, clientDetail, stored) {
  const disk = (stored.views || []).find(item => String(item.viewId) === "1");
  assert(response.status === "updated" && clientDetail.view?.displayName === "View One Updated" && clientDetail.view?.sourceId === "2" && disk?.sourceId === "2" && disk?.defaultRuleId === "13", "SRC-018 PublishedView PUT/source/rule/storage readback failed");
}

function assertPublishedViewSoftDisableReadback(response, listed, stored, clientBody, sessionBody) {
  const api = (listed.views || []).find(item => String(item.viewId) === "1");
  const disk = (stored.views || []).find(item => String(item.viewId) === "1");
  assert(response.status === "disabled" && api?.enabled === false && disk?.enabled === false && clientBody.includes("PublishedView not found") && sessionBody.includes("PublishedView not found"), "SRC-019 PublishedView DELETE soft-disable and client/session blocked readback failed");
}

function assertPublishedViewEnabledBoundaryReadback(listed, clientBody) {
  const api = (listed.views || []).find(item => String(item.viewId) === "1");
  assert(api?.enabled === false && clientBody.includes("PublishedView not found"), "SRC-020 inactive PublishedView client forbidden boundary readback failed");
}

function assertViewSourceMappingReadback(clientDetail, expectedSourceId) {
  assert(clientDetail.ok === true && clientDetail.view?.viewId === "1" && clientDetail.view?.sourceId === expectedSourceId, "SRC-021 view-source mapping client readback failed");
}

function assertAllowedRuleListReadback(clientDetail, expectedRuleIds) {
  assert(JSON.stringify(clientDetail.view?.allowedRuleIds || []) === JSON.stringify(expectedRuleIds), "SRC-022 PublishedView allowedRuleIds client detail readback failed");
}

function assertClientViewScopeProjectionReadback(list, detail) {
  const listIds = new Set((list.views || []).map(item => String(item.viewId)));
  assert(listIds.has("1") && listIds.has("2") && detail.view?.viewId === "1" && !JSON.stringify(list).includes("rtspUrl") && !JSON.stringify(detail).includes('"file":'), "SRC-023 client view scope projection and locator redaction readback failed");
}

function assertWebRtcWrapperCreateReadback(session) {
  assert(typeof session.sessionId === "string" && session.sessionId.length > 0 && typeof session.offer === "string" && session.offer.includes("v=0"), "SRC-024 WebRTC client wrapper session create readback failed");
}

function assertWebRtcWrapperDeleteReadback(closed, sessionId) {
  assert(closed.ok === true && sessionId.length > 0, "SRC-024 WebRTC client wrapper session delete readback failed");
}

async function assertWebRtcSignalingDeleteRaceReadback() {
  const raceStatuses = [];
  let acceptedIceRequests = 0;
  for (let iteration = 0; iteration < 4; iteration += 1) {
    const session = await requestJson("/client/api/views/1/webrtc/session", {
      method: "POST", headers: clientJsonHeaders(), body: '{"overlayMode":"raw"}',
    }, 200);
    const sessionId = String(session.sessionId || "");
    assertWebRtcWrapperCreateReadback(session);
    const sessionPath = `/client/api/views/1/webrtc/session/${encodeURIComponent(sessionId)}`;
    const iceRequests = Array.from({ length: 8 }, (_, candidateIndex) =>
      requestJsonAllowStatuses(sessionPath, {
        method: "POST",
        headers: clientJsonHeaders(),
        body: JSON.stringify({
          candidate: `candidate:${candidateIndex} 1 UDP 2122252543 127.0.0.1 ${9 + candidateIndex} typ host`,
          sdpMLineIndex: 0,
        }),
      }, new Set([200, 404])),
    );
    await delay(0);
    const closedRequest = requestJsonAllowStatuses(sessionPath, {
      method: "DELETE", headers: clientHeaders(),
    }, new Set([200]));
    const [iceResults, closed] = await Promise.all([Promise.all(iceRequests), closedRequest]);
    acceptedIceRequests += iceResults.filter(result => result.status === 200).length;
    assert(closed.payload?.ok === true, `MEDIA-026 concurrent signaling/delete close iteration ${iteration}`);
    raceStatuses.push(`${iceResults.map(result => result.status).join("+")}/${closed.status}`);
  }
  const views = await clientJson("/client/api/views");
  assert(acceptedIceRequests > 0, "MEDIA-026 signaling operation entered before concurrent delete");
  assert(Array.isArray(views.views), "MEDIA-026 server health readback after signaling/delete race");
  console.log(`[pass] MEDIA-026 WebRTC signaling/delete race acceptedIce=${acceptedIceRequests} ${raceStatuses.join(",")}`);
}

function assertViewDashboardReadback(dashboard, detail) {
  assert(dashboard.ok === true && dashboard.view?.viewId === "1" && detail.view?.viewId === "1" && detail.view?.showDashboard === true, "SRC-025 view-scoped Dashboard assigned-view readback failed");
}

async function assertRemainingSourceReadModels(onvifDraft, sourceCountBeforeDraft, sourceCountAfterDraft) {
  const sourceRegistryBefore = fs.readFileSync(sourceFile, "utf8");
  const publishedViewRegistryBefore = fs.readFileSync(viewFile, "utf8");
  const clientEventsRoute = "/client/api/views/{id}/events";
  const canonicalCommands = new Map([
    "verify-v340-recovery-candidate-package",
    "verify-v340-source-health-replay-drift-diff",
    "verify-v350-live-operations-graph-contract",
    "verify-v350-operations-command-plan-contract",
    "verify-v350-staged-change-plan-impact-preview",
    "verify-v360-simulation-input-contract",
    "verify-v360-command-plan-dry-run-simulator",
    "verify-v360-source-rule-impact-diff",
    "verify-v360-safe-apply-readiness-gate",
    "verify-v360-field-evidence-simulation-adapter",
    "verify-v360-vlm-assisted-simulation-explanation",
    "verify-v370-site-source-group-contract",
    "verify-v370-site-aware-source-registry-projection",
    "verify-v370-site-health-rollup",
    "verify-v370-site-impact-graph",
    "verify-v370-site-simulation-input-pack",
    "verify-v370-cross-site-safe-apply-readiness",
    "verify-v370-field-evidence-attachment",
    "verify-v370-limited-safe-execution-pilot",
    "verify-v370-outcome-reconciliation",
    "verify-v380-field-connector-evidence-package",
    "verify-v380-default-off-action-explanation",
    "verify-v390-onvif-credential-provider-status",
    "verify-v390-backup-recovery-handoff-validation",
    "verify-v390-conditional-field-ai-decisions",
  ].map(command => {
    const result = spawnSync("./server.sh", [command], { cwd: rootDir, encoding: "utf8" });
    return [command, { command, status: result.status }];
  }));
  const [
    clientEvents,
    clientMetadata,
    clientShell,
    clientViews,
    eventReviews,
    snapshotIdentity,
    onboardingQuality,
    reliabilityTimeline,
    reliabilitySearchMetrics,
    backupRecoveryHandoff,
    recoveryCandidatePackage,
    sourceHealthReplayDriftDiff,
    fieldBridgeConditionGates,
    liveOperationsGraph,
    commandPlan,
    stagedChangePlanImpactPreview,
    fieldEvidenceIntake,
    vlmAssistedExplanation,
    simulationInputPack,
    commandPlanDryRun,
    sourceRuleImpactDiff,
    safeApplyReadiness,
    fieldEvidenceSimulationAdapter,
    vlmAssistedSimulationExplanation,
    siteSourceGroupContract,
    siteAwareSourceRegistryProjection,
    siteHealthRollup,
    siteImpactGraph,
    siteSimulationInputPack,
    crossSiteSafeApplyReadiness,
    siteFieldEvidenceAttachment,
    limitedSafeExecutionPilot,
    outcomeReconciliation,
    fieldConnectorEvidencePackage,
    defaultOffActionExplanation,
    onvifCredentialProviderStatus,
    stagingRestoreValidationHandoff,
    fieldEvidenceBridgeDecision,
  ] = await Promise.all([
    clientJson(`${clientEventsRoute.replace("{id}", "1")}?limit=6`),
    clientJson("/client/api/views/1/metadata"),
    requestText("/client/live", { headers: clientHeaders() }),
    clientJson("/client/api/views"),
    opsJson("/ops/api/events/reviews"),
    opsJson("/ops/api/source-registry/snapshot"),
    opsJson("/ops/api/source-registry/onboarding-quality"),
    opsJson("/ops/api/source-registry/reliability-timeline"),
    opsJson("/ops/api/source-registry/reliability-search-metrics"),
    opsJson("/ops/api/source-registry/backup-recovery-handoff"),
    opsJson("/ops/api/source-registry/recovery-candidate-package"),
    opsJson("/ops/api/source-registry/source-health-replay-drift-diff"),
    opsJson("/ops/api/source-registry/field-bridge-condition-gates"),
    opsJson("/ops/api/live-operations/graph"),
    opsJson("/ops/api/live-operations/command-plan"),
    opsJson("/ops/api/live-operations/staged-change-plan-impact-preview"),
    opsJson("/ops/api/live-operations/field-evidence-intake"),
    opsJson("/ops/api/live-operations/vlm-assisted-explanation"),
    opsJson("/ops/api/live-operations/simulation/input-pack"),
    opsJson("/ops/api/live-operations/simulation/command-plan-dry-run"),
    opsJson("/ops/api/live-operations/simulation/impact-diff"),
    opsJson("/ops/api/live-operations/simulation/safe-apply-readiness"),
    opsJson("/ops/api/live-operations/simulation/field-evidence-adapter"),
    opsJson("/ops/api/live-operations/simulation/vlm-assisted-explanation"),
    opsJson("/ops/api/site-operations/source-group-contract"),
    opsJson("/ops/api/site-operations/source-registry-projection"),
    opsJson("/ops/api/site-operations/health-rollup"),
    opsJson("/ops/api/site-operations/impact-graph"),
    opsJson("/ops/api/site-operations/simulation-input-pack"),
    opsJson("/ops/api/site-operations/cross-site-safe-apply-readiness"),
    opsJson("/ops/api/site-operations/field-evidence-attachment"),
    opsJson("/ops/api/site-operations/limited-safe-execution-pilot"),
    opsJson("/ops/api/site-operations/outcome-reconciliation"),
    opsJson("/ops/api/actions/field-connector-evidence-package"),
    opsJson("/ops/api/actions/default-off-explanation"),
    opsJson("/ops/api/onvif/credential-provider-status"),
    opsJson("/ops/api/source-registry/staging-restore-validation-handoff"),
    opsJson("/ops/api/field-evidence/bridge-decision"),
  ]);
  const sourceRegistryWritePerformed = fs.readFileSync(sourceFile, "utf8") !== sourceRegistryBefore;
  const publishedViewWritePerformed = fs.readFileSync(viewFile, "utf8") !== publishedViewRegistryBefore;
  assertRemainingV360V390SourceReadModels({
    canonicalCommands,
    sourceRegistryWritePerformed,
    publishedViewWritePerformed,
    sourceRuleImpactDiff,
    safeApplyReadiness,
    fieldEvidenceSimulationAdapter,
    vlmAssistedSimulationExplanation,
    siteSourceGroupContract,
    siteAwareSourceRegistryProjection,
    siteHealthRollup,
    siteImpactGraph,
    siteSimulationInputPack,
    crossSiteSafeApplyReadiness,
    siteFieldEvidenceAttachment,
    limitedSafeExecutionPilot,
    outcomeReconciliation,
    fieldConnectorEvidencePackage,
    defaultOffActionExplanation,
    onvifCredentialProviderStatus,
    stagingRestoreValidationHandoff,
    fieldEvidenceBridgeDecision,
  });
  const clientProjectionRaw = JSON.stringify(clientViews);
  const sourceUrlExposed = ["sample_h264.mp4", "rtsp://", ".m3u8", "/whep", "whip-published-5"].some(token => clientProjectionRaw.includes(token));
  const rawLocatorExposed = clientProjectionRaw.includes('"canonicalSourceKey":') || clientProjectionRaw.includes('"rawLocator":');
  const credentialMaterialExposed = clientProjectionRaw.includes("operator-entered-secret") || clientProjectionRaw.includes('"credentialRef":');

  assert(clientEventsRoute === "/client/api/views/{id}/events" && clientEvents.ok === true && clientEvents.view?.viewId === "1" && clientEvents.view?.sourceId === "1" && Array.isArray(clientEvents.events?.recent) && Array.isArray(clientEvents.events?.countsByType), "SRC-026 ClientEventStreamCandidates assigned-view events runtime readback failed");
  assert(clientMetadata.ok === true && clientMetadata.view?.viewId === "1" && clientMetadata.view?.sourceId === "1" && clientMetadata.metadata?.schema === "media-server.client.metadata-summary.v1", "SRC-027 media-server.client.metadata-summary.v1 view scope runtime readback failed");
  assert(clientShell.includes('data-client-preview="true"') && clientShell.includes('data-client-preview-boundary="admin-preview-viewer-safe"') && clientShell.includes("관리자 클라이언트 미리보기"), "SRC-028 data-client-preview admin affordance runtime readback failed");
  assert(clientProjectionRaw.includes('"sourceKind":') && sourceUrlExposed === false && rawLocatorExposed === false && credentialMaterialExposed === false, "SRC-029 ClientViewsJson sourceKind client projection source URL redaction runtime readback failed");
  assert(clientShell.includes('data-client-redaction-review="viewer-safe-no-locator-debug"') && !clientShell.includes("Developer URL") && !clientShell.includes("rtsp://127.0.0.1"), "SRC-030 data-client-redaction-review Developer URL redaction runtime readback failed");
  assert(onvifDraft.credentialGate?.schema === "media-server.onvif-credential-binding-gate.v1" && onvifDraft.credentialGate?.requiredScope === "source:write" && onvifDraft.credentialGate?.redactionGuard?.urlCredentialsRejected === true && onvifDraft.credentialGate?.secretMaterialStored === false && sourceCountBeforeDraft === sourceCountAfterDraft, "SRC-031 credentialGate source:write/no-secret-store runtime readback failed");

  const evidenceReadiness = eventReviews.evidenceIntakeFieldReadiness;
  const WebRTC = evidenceReadiness?.contract?.webrtcDataChannelSchemaChanged;
  assert(WebRTC === false && evidenceReadiness?.schema === "media-server.ops.evidence-intake-field-readiness.v1" && evidenceReadiness.contract?.endpointCredentialFieldPassClaimed === false && evidenceReadiness.contract?.credentialMaterialExposed === false && evidenceReadiness.contract?.runtimeVlmCallPerformed === false && evidenceReadiness.contract?.eventPostPayloadChanged === false && evidenceReadiness.contract?.rtspOrWebrtcMediaPathChanged === false && sourceRegistryWritePerformed === false, "SRC-032 evidenceIntakeFieldReadiness no-write/no-external-success runtime readback failed");
  const managedSourceIdentity = (snapshotIdentity.sourceIdentity || []).filter(item => managedSourceIds.has(String(item.sourceId)));
  assert(snapshotIdentity.schema === "media-server.ops.v330-source-registry-snapshot-identity.v1" && Array.isArray(snapshotIdentity.sourceIdentity) && managedSourceIdentity.length === 5 && snapshotIdentity.boundaries?.sourceRegistryWritePerformed === false && snapshotIdentity.boundaries?.publishedViewWritePerformed === false && snapshotIdentity.boundaries?.viewerClientExposureAdded === false && sourceRegistryWritePerformed === false && publishedViewWritePerformed === false, "SRC-033 sourceIdentity snapshot independent no-write runtime readback failed");
  assert(onboardingQuality.schema === "media-server.ops.v330-source-onboarding-quality-summary.v1" && Array.isArray(onboardingQuality.sourceOnboardingQuality) && onboardingQuality.boundaries?.sourceRegistryWritePerformed === false && onboardingQuality.boundaries?.rawLocatorExposedToClient === false && onboardingQuality.boundaries?.credentialMaterialExposed === false && onboardingQuality.boundaries?.viewerClientExposureAdded === false && sourceRegistryWritePerformed === false, "SRC-034 sourceOnboardingQuality redacted no-write runtime readback failed");
  assert(reliabilityTimeline.schema === "media-server.ops.v330-reliability-timeline-health-history.v1" && Array.isArray(reliabilityTimeline.reliabilityTimeline) && reliabilityTimeline.auditLinkage?.action === "source-health-state-change" && reliabilityTimeline.boundaries?.sourceRegistryWritePerformed === false && reliabilityTimeline.boundaries?.rawLocatorExposedToClient === false && reliabilityTimeline.boundaries?.credentialMaterialExposed === false && sourceRegistryWritePerformed === false, "SRC-035 reliabilityTimeline health-history no-write runtime readback failed");

  const correlation = eventReviews.unifiedResolutionWorkspace?.incidentSourceCorrelationSummary;
  const recoveryQueue = eventReviews.unifiedResolutionWorkspace?.operatorRecheckRecoveryQueueSummary;
  assert(correlation?.schema === "media-server.ops.v330-incident-source-correlation.v1" && correlation.sourceHealthAuditLinked === true && correlation.sourceRegistryWritePerformed === false && correlation.viewerClientExposureAdded === false && correlation.sourceUrlExposed === false && correlation.rawJsonExposed === false && sourceRegistryWritePerformed === false, "SRC-036 incidentSourceCorrelation source-health audit readback failed");
  assert(recoveryQueue?.schema === "media-server.ops.v330-operator-recheck-recovery-queue.v1" && recoveryQueue.failedOnlyRecheck === true && recoveryQueue.recoveryQueueWritePerformed === false && recoveryQueue.sourceRegistryWritePerformed === false && recoveryQueue.viewerClientExposureAdded === false && recoveryQueue.sourceUrlExposed === false && recoveryQueue.rawJsonExposed === false && sourceRegistryWritePerformed === false, "SRC-037 operatorRecheckRecoveryQueue failed-only no-write readback failed");

  const sourceStatusDigest = clientEvents.events?.sourceStatusDigest;
  assert(sourceStatusDigest?.schema === "media-server.client.source-status-digest.v1" && sourceStatusDigest.viewerSafe === true && sourceStatusDigest.publishedViewScoped === true && sourceStatusDigest.sourceUrlIncluded === false && sourceStatusDigest.rawLocatorIncluded === false && sourceStatusDigest.credentialMaterialIncluded === false && sourceStatusDigest.sourceRegistryWritePerformed === false && sourceRegistryWritePerformed === false, "SRC-038 sourceStatusDigest PublishedView-scoped redacted runtime readback failed");
  assert(reliabilitySearchMetrics.schema === "media-server.ops.v330-source-reliability-search-metrics.v1" && Array.isArray(reliabilitySearchMetrics.sourceHealthFilters) && Array.isArray(reliabilitySearchMetrics.savedReliabilityViews) && reliabilitySearchMetrics.boundaries?.sourceRegistryWritePerformed === false && reliabilitySearchMetrics.boundaries?.savedViewWritePerformed === false && reliabilitySearchMetrics.boundaries?.rawLocatorExposedToClient === false && reliabilitySearchMetrics.boundaries?.credentialMaterialExposed === false && sourceRegistryWritePerformed === false, "SRC-039 sourceReliabilitySearchMetrics read-only metrics runtime readback failed");
  assert(backupRecoveryHandoff.schema === "media-server.ops.v330-backup-recovery-source-handoff.v1" && Array.isArray(backupRecoveryHandoff.recoveryValidationPlan) && backupRecoveryHandoff.boundaries?.sourceRegistryWritePerformed === false && backupRecoveryHandoff.boundaries?.publishedViewWritePerformed === false && backupRecoveryHandoff.boundaries?.realBackupPerformed === false && backupRecoveryHandoff.boundaries?.rawLocatorExposedToClient === false && sourceRegistryWritePerformed === false && publishedViewWritePerformed === false, "SRC-040 backupRecoverySourceHandoff no-persistence runtime readback failed");
  assert(canonicalCommands.get("verify-v340-recovery-candidate-package")?.status === 0 && recoveryCandidatePackage.schema === "media-server.ops.v340-recovery-candidate-package.v1" && Array.isArray(recoveryCandidatePackage.recoveryCandidates) && recoveryCandidatePackage.redactionPolicy?.sourceLocatorIncluded === false && recoveryCandidatePackage.redactionPolicy?.credentialMaterialIncluded === false && recoveryCandidatePackage.boundaries?.sourceRegistryWritePerformed === false && recoveryCandidatePackage.boundaries?.publishedViewWritePerformed === false && sourceRegistryWritePerformed === false && publishedViewWritePerformed === false, "SRC-041 recoveryCandidatePackage redacted no-write runtime readback failed");
  assert(canonicalCommands.get("verify-v340-source-health-replay-drift-diff")?.status === 0 && sourceHealthReplayDriftDiff.schema === "media-server.ops.v340-source-health-replay-drift-diff.v1" && Array.isArray(sourceHealthReplayDriftDiff.sourceHealthReplayDriftItems) && sourceHealthReplayDriftDiff.driftPolicy?.staleOfflineReconnectWarningCompared === true && sourceHealthReplayDriftDiff.boundaries?.sourceRegistryWritePerformed === false && sourceHealthReplayDriftDiff.boundaries?.publishedViewWritePerformed === false && sourceHealthReplayDriftDiff.boundaries?.rawLocatorExposedToClient === false && sourceRegistryWritePerformed === false, "SRC-042 sourceHealthReplayDriftDiff independent comparison runtime readback failed");
  assert(fieldBridgeConditionGates.schema === "media-server.ops.v340-field-bridge-condition-gates.v1" && fieldBridgeConditionGates.sourceOnlyPassPolicy?.sourceOnlyPassAccepted === false && fieldBridgeConditionGates.sourceOnlyPassPolicy?.localVerifierPassSubstitutesFieldSmoke === false && fieldBridgeConditionGates.boundaries?.fieldSmokeExecuted === false && fieldBridgeConditionGates.boundaries?.credentialProbePerformed === false && fieldBridgeConditionGates.redactionPolicy?.credentialMaterialIncluded === false && sourceRegistryWritePerformed === false, "SRC-043 fieldBridgeConditionGates real-device not-run runtime readback failed");
  assert(canonicalCommands.get("verify-v350-live-operations-graph-contract")?.status === 0 && liveOperationsGraph.schema === "media-server.ops.v350-live-operations-graph.v1" && Array.isArray(liveOperationsGraph.graphNodes) && Array.isArray(liveOperationsGraph.graphEdges) && liveOperationsGraph.boundaries?.sourceRegistryWritePerformed === false && liveOperationsGraph.boundaries?.publishedViewWritePerformed === false && liveOperationsGraph.boundaries?.rawLocatorExposedToClient === false && liveOperationsGraph.boundaries?.credentialMaterialExposed === false && sourceRegistryWritePerformed === false, "SRC-044 liveOperationsGraph redacted no-write runtime readback failed");
  assert(canonicalCommands.get("verify-v350-operations-command-plan-contract")?.status === 0 && commandPlan.schema === "media-server.ops.v350-command-plan.v1" && Array.isArray(commandPlan.commandPlanCandidates) && commandPlan.contractPolicy?.sourceRecheck === "draft-only" && commandPlan.boundaries?.sourceRecheckExecuted === false && commandPlan.boundaries?.recoveryExecuted === false && commandPlan.boundaries?.sourceRegistryWritePerformed === false && commandPlan.boundaries?.publishedViewWritePerformed === false && sourceRegistryWritePerformed === false, "SRC-045 commandPlan draft-only no-execution runtime readback failed");
  assert(canonicalCommands.get("verify-v350-staged-change-plan-impact-preview")?.status === 0 && stagedChangePlanImpactPreview.schema === "media-server.ops.v350-staged-change-plan-impact-preview.v1" && Array.isArray(stagedChangePlanImpactPreview.stagedChangePlans) && stagedChangePlanImpactPreview.impactPreview?.stagingOnly === true && stagedChangePlanImpactPreview.boundaries?.sourceChangeApplied === false && stagedChangePlanImpactPreview.boundaries?.publishedViewChangeApplied === false && stagedChangePlanImpactPreview.boundaries?.sourceRegistryWritePerformed === false && stagedChangePlanImpactPreview.boundaries?.rawLocatorExposedToClient === false && sourceRegistryWritePerformed === false, "SRC-046 stagedChangePlanImpactPreview no-apply runtime readback failed");
  assert(fieldEvidenceIntake.schema === "media-server.ops.v350-field-evidence-intake.v1" && fieldEvidenceIntake.evidenceIntakePolicy?.executionStatus === "not-run" && fieldEvidenceIntake.boundaries?.endpointProbePerformed === false && fieldEvidenceIntake.boundaries?.credentialProbePerformed === false && fieldEvidenceIntake.boundaries?.sourceRegistryWritePerformed === false && fieldEvidenceIntake.redactionPolicy?.rawLocatorIncluded === false && fieldEvidenceIntake.redactionPolicy?.credentialMaterialIncluded === false && sourceRegistryWritePerformed === false, "SRC-047 fieldEvidenceIntake redacted not-run runtime readback failed");
  assert(vlmAssistedExplanation.schema === "media-server.ops.v350-vlm-assisted-explanation.v1" && vlmAssistedExplanation.defaultOff === true && vlmAssistedExplanation.boundaries?.vlmProviderCallPerformed === false && vlmAssistedExplanation.boundaries?.vlmRuntimeCallPerformed === false && vlmAssistedExplanation.boundaries?.sourceRegistryWritePerformed === false && vlmAssistedExplanation.boundaries?.publishedViewWritePerformed === false && sourceRegistryWritePerformed === false, "SRC-048 vlmAssistedExplanation default-off provider no-call runtime readback failed");
  assert(canonicalCommands.get("verify-v360-simulation-input-contract")?.status === 0 && simulationInputPack.schema === "media-server.ops.v360-simulation-input-pack.v1" && simulationInputPack.readOnlySimulationInputPack === true && Array.isArray(simulationInputPack.simulationInputPackItems) && simulationInputPack.boundaries?.sourceRegistryWritePerformed === false && simulationInputPack.boundaries?.publishedViewWritePerformed === false && simulationInputPack.boundaries?.rawLocatorExposedToClient === false && simulationInputPack.boundaries?.credentialMaterialExposed === false && simulationInputPack.boundaries?.eventPostPayloadChanged === false && simulationInputPack.boundaries?.rtspOrWebrtcMediaPathChanged === false && sourceRegistryWritePerformed === false && publishedViewWritePerformed === false, "SRC-049 simulationInputPack read-only no-mutation runtime readback failed");
  assert(canonicalCommands.get("verify-v360-command-plan-dry-run-simulator")?.status === 0 && commandPlanDryRun.schema === "media-server.ops.v360-command-plan-dry-run.v1" && Array.isArray(commandPlanDryRun.commandPlanDryRunResults) && commandPlanDryRun.boundaries?.dryRunOnly === true && commandPlanDryRun.boundaries?.sourceRecheckExecuted === false && commandPlanDryRun.boundaries?.recoveryExecuted === false && commandPlanDryRun.boundaries?.sourceRegistryWritePerformed === false && commandPlanDryRun.boundaries?.publishedViewWritePerformed === false && sourceRegistryWritePerformed === false && publishedViewWritePerformed === false, "SRC-050 commandPlanDryRun dry-run-only no-execution runtime readback failed");
}

function assertRemainingV360V390SourceReadModels({
  canonicalCommands,
  sourceRegistryWritePerformed,
  publishedViewWritePerformed,
  sourceRuleImpactDiff,
  safeApplyReadiness,
  fieldEvidenceSimulationAdapter,
  vlmAssistedSimulationExplanation,
  siteSourceGroupContract,
  siteAwareSourceRegistryProjection,
  siteHealthRollup,
  siteImpactGraph,
  siteSimulationInputPack,
  crossSiteSafeApplyReadiness,
  siteFieldEvidenceAttachment,
  limitedSafeExecutionPilot,
  outcomeReconciliation,
  fieldConnectorEvidencePackage,
  defaultOffActionExplanation,
  onvifCredentialProviderStatus,
  stagingRestoreValidationHandoff,
  fieldEvidenceBridgeDecision,
}) {
  for (const command of [
    "verify-v360-source-rule-impact-diff",
    "verify-v360-safe-apply-readiness-gate",
    "verify-v360-field-evidence-simulation-adapter",
    "verify-v360-vlm-assisted-simulation-explanation",
    "verify-v370-site-source-group-contract",
    "verify-v370-site-aware-source-registry-projection",
    "verify-v370-site-health-rollup",
    "verify-v370-site-impact-graph",
    "verify-v370-site-simulation-input-pack",
    "verify-v370-cross-site-safe-apply-readiness",
    "verify-v370-field-evidence-attachment",
    "verify-v370-limited-safe-execution-pilot",
    "verify-v370-outcome-reconciliation",
    "verify-v380-field-connector-evidence-package",
    "verify-v380-default-off-action-explanation",
    "verify-v390-onvif-credential-provider-status",
    "verify-v390-backup-recovery-handoff-validation",
    "verify-v390-conditional-field-ai-decisions",
  ]) {
    assert(canonicalCommands.get(command)?.status === 0, `canonical verifier direct/scoped: ${command}`);
  }

  const src051CredentialMaterialExposed = runtimeCredentialMaterialExposed(sourceRuleImpactDiff);
  assert(sourceRuleImpactDiff.schema === "media-server.ops.v360-source-rule-impact-diff.v1" && Array.isArray(sourceRuleImpactDiff.sourceRuleImpactDiffs) && runtimeFlagValue(sourceRuleImpactDiff, "sourceRegistryWritePerformed") === false && runtimeFlagValue(sourceRuleImpactDiff, "publishedViewWritePerformed") === false && src051CredentialMaterialExposed === false && sourceRegistryWritePerformed === false && publishedViewWritePerformed === false, "SRC-051 source/rule impact diff independent no-write/redaction runtime readback failed");

  const ops120AutoApplyPerformed = runtimeFlagValue(safeApplyReadiness, "automaticApplyPerformed");
  assert(safeApplyReadiness.schema === "media-server.ops.v360-safe-apply-readiness.v1" && ops120AutoApplyPerformed === false, "OPS-120 actual GET autoApply boundary readback failed");
  assert(canonicalCommands.get("verify-v360-safe-apply-readiness-gate")?.status === 0 && safeApplyReadiness.schema === "media-server.ops.v360-safe-apply-readiness.v1" && Array.isArray(safeApplyReadiness.safeApplyReadinessItems) && ops120AutoApplyPerformed === false && runtimeFlagValue(safeApplyReadiness, "safeApplyPerformed") === false && runtimeFlagValue(safeApplyReadiness, "sourceRegistryWritePerformed") === false && runtimeFlagValue(safeApplyReadiness, "publishedViewWritePerformed") === false && runtimeFlagValue(safeApplyReadiness, "sourceChangeApplied") === false && sourceRegistryWritePerformed === false && publishedViewWritePerformed === false, "OPS-120 safe apply readiness independent GET and registry before/after readback failed");

  assert(fieldEvidenceSimulationAdapter.schema === "media-server.ops.v360-field-evidence-simulation-adapter.v1" && Array.isArray(fieldEvidenceSimulationAdapter.fieldEvidenceSimulationAdapters) && runtimeFlagValue(fieldEvidenceSimulationAdapter, "fieldSmokeExecuted") === false && runtimeFlagValue(fieldEvidenceSimulationAdapter, "endpointProbePerformed") === false && runtimeFlagValue(fieldEvidenceSimulationAdapter, "credentialProbePerformed") === false && runtimeFlagValue(fieldEvidenceSimulationAdapter, "sourceRegistryWritePerformed") === false && runtimeFlagValue(fieldEvidenceSimulationAdapter, "credentialMaterialIncluded") === false && sourceRegistryWritePerformed === false, "SRC-052 field evidence adapter independent conditional-not-run runtime readback failed");

  assert(vlmAssistedSimulationExplanation.schema === "media-server.ops.v360-vlm-assisted-simulation-explanation.v1" && Array.isArray(vlmAssistedSimulationExplanation.vlmAssistedSimulationExplanations) && runtimeFlagValue(vlmAssistedSimulationExplanation, "vlmProviderCallPerformed") === false && runtimeFlagValue(vlmAssistedSimulationExplanation, "vlmRuntimeCallPerformed") === false && runtimeFlagValue(vlmAssistedSimulationExplanation, "sourceRegistryWritePerformed") === false && runtimeFlagValue(vlmAssistedSimulationExplanation, "credentialMaterialIncluded") === false && sourceRegistryWritePerformed === false, "SRC-053 VLM-assisted simulation explanation independent default-off provider runtime readback failed");

  assert(siteSourceGroupContract.schema === "media-server.ops.v370-site-source-group-contract.v1" && Array.isArray(siteSourceGroupContract.siteSourceGroupContract) && runtimeFlagValue(siteSourceGroupContract, "sourceRegistryWritePerformed") === false && runtimeFlagValue(siteSourceGroupContract, "publishedViewWritePerformed") === false && runtimeFlagValue(siteSourceGroupContract, "viewerClientExposureAdded") === false && runtimeFlagValue(siteSourceGroupContract, "credentialMaterialExposed") === false && sourceRegistryWritePerformed === false && publishedViewWritePerformed === false, "SRC-054 site/source-group contract independent no-auto-write runtime readback failed");

  assert(siteAwareSourceRegistryProjection.schema === "media-server.ops.v370-site-aware-source-registry-projection.v1" && Array.isArray(siteAwareSourceRegistryProjection.siteRegistryProjection) && runtimeFlagValue(siteAwareSourceRegistryProjection, "sourceRegistryWritePerformed") === false && runtimeFlagValue(siteAwareSourceRegistryProjection, "publishedViewWritePerformed") === false && runtimeFlagValue(siteAwareSourceRegistryProjection, "rawLocatorIncluded") === false && runtimeFlagValue(siteAwareSourceRegistryProjection, "credentialMaterialIncluded") === false && sourceRegistryWritePerformed === false && publishedViewWritePerformed === false, "SRC-055 site-aware registry projection independent redacted no-write runtime readback failed");

  assert(siteHealthRollup.schema === "media-server.ops.v370-site-health-rollup.v1" && Array.isArray(siteHealthRollup.siteHealthRollup) && runtimeFlagValue(siteHealthRollup, "sourceHealthPersisted") === false && runtimeFlagValue(siteHealthRollup, "automaticRecoveryPerformed") === false && runtimeFlagValue(siteHealthRollup, "fieldSmokeExecuted") === false && runtimeFlagValue(siteHealthRollup, "sourceRegistryWritePerformed") === false && sourceRegistryWritePerformed === false, "SRC-056 site health rollup independent no-persistence/no-field runtime readback failed");

  const src057EventPostPayloadChanged = runtimeFlagValue(siteImpactGraph, "eventPostPayloadChanged");
  const src057DebugMaterialExposed = runtimeFlagValue(siteImpactGraph, "rawDiagnosticJsonIncluded");
  assert(src057DebugMaterialExposed === false, "SRC-057 site impact graph independent debug-redaction runtime readback failed");
  assert(src057EventPostPayloadChanged === false && siteImpactGraph.schema === "media-server.ops.v370-site-impact-graph.v1" && Array.isArray(siteImpactGraph.siteImpactGraphNodes) && Array.isArray(siteImpactGraph.siteImpactGraphEdges) && runtimeFlagValue(siteImpactGraph, "sourceRegistryWritePerformed") === false && runtimeFlagValue(siteImpactGraph, "rawLocatorIncluded") === false && runtimeFlagValue(siteImpactGraph, "credentialMaterialIncluded") === false && sourceRegistryWritePerformed === false && publishedViewWritePerformed === false, "SRC-057 site impact graph independent no-mutation/redaction runtime readback failed");

  assert(siteSimulationInputPack.schema === "media-server.ops.v370-site-simulation-input-pack.v1" && Array.isArray(siteSimulationInputPack.siteSimulationInputPackItems) && runtimeFlagValue(siteSimulationInputPack, "simulationRunExecuted") === false && runtimeFlagValue(siteSimulationInputPack, "sourceRegistryWritePerformed") === false && runtimeFlagValue(siteSimulationInputPack, "publishedViewWritePerformed") === false && runtimeFlagValue(siteSimulationInputPack, "rawLocatorIncluded") === false && runtimeFlagValue(siteSimulationInputPack, "credentialMaterialIncluded") === false && sourceRegistryWritePerformed === false && publishedViewWritePerformed === false, "SRC-058 site simulation input pack independent no-run/no-write runtime readback failed");

  const src059SourceRegistryWritePerformed = runtimeFlagValue(crossSiteSafeApplyReadiness, "sourceRegistryWritePerformed");
  assert(crossSiteSafeApplyReadiness.schema === "media-server.ops.v370-cross-site-safe-apply-readiness.v1" && Array.isArray(crossSiteSafeApplyReadiness.crossSiteSafeApplyReadinessItems) && src059SourceRegistryWritePerformed === false && runtimeFlagValue(crossSiteSafeApplyReadiness, "publishedViewWritePerformed") === false && runtimeFlagValue(crossSiteSafeApplyReadiness, "sourceChangeApplied") === false && runtimeFlagValue(crossSiteSafeApplyReadiness, "rawLocatorIncluded") === false && runtimeFlagValue(crossSiteSafeApplyReadiness, "credentialMaterialIncluded") === false && sourceRegistryWritePerformed === false && publishedViewWritePerformed === false, "SRC-059 cross-site readiness independent no-write/redaction runtime readback failed");

  assert(siteFieldEvidenceAttachment.schema === "media-server.ops.v370-field-evidence-attachment.v1" && Array.isArray(siteFieldEvidenceAttachment.fieldEvidenceAttachments) && runtimeFlagValue(siteFieldEvidenceAttachment, "fieldSmokeExecuted") === false && runtimeFlagValue(siteFieldEvidenceAttachment, "endpointProbePerformed") === false && runtimeFlagValue(siteFieldEvidenceAttachment, "credentialProbePerformed") === false && runtimeFlagValue(siteFieldEvidenceAttachment, "sourceRegistryWritePerformed") === false && runtimeFlagValue(siteFieldEvidenceAttachment, "credentialMaterialIncluded") === false && sourceRegistryWritePerformed === false && publishedViewWritePerformed === false, "SRC-060 field evidence attachment independent not-run/no-write runtime readback failed");

  assert(limitedSafeExecutionPilot.schema === "media-server.ops.v370-limited-safe-execution-pilot.v1" && Array.isArray(limitedSafeExecutionPilot.limitedSafeExecutionPilotActions) && runtimeFlagValue(limitedSafeExecutionPilot, "sourceRecheckExecuted") === false && runtimeFlagValue(limitedSafeExecutionPilot, "sourceRegistryWritePerformed") === false && runtimeFlagValue(limitedSafeExecutionPilot, "publishedViewWritePerformed") === false && runtimeFlagValue(limitedSafeExecutionPilot, "rawLocatorIncluded") === false && runtimeFlagValue(limitedSafeExecutionPilot, "credentialMaterialIncluded") === false && sourceRegistryWritePerformed === false && publishedViewWritePerformed === false, "SRC-061 limited safe execution pilot independent approval-gated no-execution runtime readback failed");

  const src062RawMaterialExposed = runtimeSourceMaterialExposed(outcomeReconciliation);
  const src062SourceUrlExposed = runtimeSourceUrlExposed(outcomeReconciliation);
  const src062CredentialMaterialExposed = runtimeCredentialMaterialExposed(outcomeReconciliation);
  assert(outcomeReconciliation.schema === "media-server.ops.v370-outcome-reconciliation.v1" && Array.isArray(outcomeReconciliation.outcomeReconciliationItems) && runtimeFlagValue(outcomeReconciliation, "sourceRecheckExecuted") === false && runtimeFlagValue(outcomeReconciliation, "sourceRegistryWritePerformed") === false && runtimeFlagValue(outcomeReconciliation, "publishedViewWritePerformed") === false && src062RawMaterialExposed === false && src062SourceUrlExposed === false && src062CredentialMaterialExposed === false && sourceRegistryWritePerformed === false && publishedViewWritePerformed === false, "SRC-062 outcome reconciliation independent not-run/no-write runtime readback failed");

  const src063SourceRegistryWritePerformed = runtimeFlagValue(fieldConnectorEvidencePackage, "sourceRegistryWritePerformed");
  const src063RawMaterialExposed = runtimeSourceMaterialExposed(fieldConnectorEvidencePackage);
  const src063SourceUrlExposed = runtimeSourceUrlExposed(fieldConnectorEvidencePackage);
  const src063CredentialMaterialExposed = runtimeCredentialMaterialExposed(fieldConnectorEvidencePackage);
  assert(fieldConnectorEvidencePackage.schema === "media-server.ops.v380-field-connector-evidence-package.v1" && Array.isArray(fieldConnectorEvidencePackage.fieldConnectorEvidenceItems) && src063SourceRegistryWritePerformed === false && runtimeFlagValue(fieldConnectorEvidencePackage, "publishedViewWritePerformed") === false && runtimeFlagValue(fieldConnectorEvidencePackage, "onvifDeviceContacted") === false && runtimeFlagValue(fieldConnectorEvidencePackage, "endpointProbePerformed") === false && runtimeFlagValue(fieldConnectorEvidencePackage, "credentialProbePerformed") === false && src063RawMaterialExposed === false && src063SourceUrlExposed === false && src063CredentialMaterialExposed === false && sourceRegistryWritePerformed === false && publishedViewWritePerformed === false, "SRC-063 field connector evidence independent no-write/redaction/not-run runtime readback failed");

  const src064RawMaterialExposed = runtimeSourceMaterialExposed(defaultOffActionExplanation);
  const src064SourceUrlExposed = runtimeSourceUrlExposed(defaultOffActionExplanation);
  const src064CredentialMaterialExposed = runtimeCredentialMaterialExposed(defaultOffActionExplanation);
  assert(defaultOffActionExplanation.schema === "media-server.ops.v380-default-off-action-explanation.v1" && Array.isArray(defaultOffActionExplanation.defaultOffActionExplanations) && runtimeFlagValue(defaultOffActionExplanation, "sourceRecheckExecuted") === false && runtimeFlagValue(defaultOffActionExplanation, "sourceRegistryWritePerformed") === false && runtimeFlagValue(defaultOffActionExplanation, "publishedViewWritePerformed") === false && runtimeFlagValue(defaultOffActionExplanation, "vlmProviderCallPerformed") === false && src064RawMaterialExposed === false && src064SourceUrlExposed === false && src064CredentialMaterialExposed === false && sourceRegistryWritePerformed === false && publishedViewWritePerformed === false, "SRC-064 source readiness explanation independent default-off/redaction runtime readback failed");

  const src065RawMaterialExposed = runtimeSourceMaterialExposed(onvifCredentialProviderStatus);
  const src065SourceUrlExposed = runtimeSourceUrlExposed(onvifCredentialProviderStatus);
  const src065CredentialMaterialExposed = runtimeFlagValue(onvifCredentialProviderStatus, "credentialMaterialExposed");
  assert(onvifCredentialProviderStatus.schema === "media-server.ops.v390-onvif-credential-provider-status.v1" && onvifCredentialProviderStatus.decision?.primarySelection === "none" && onvifCredentialProviderStatus.decision?.fallbackSelection === "in-memory-fixture" && runtimeFlagValue(onvifCredentialProviderStatus, "credentialReferenceValueIncluded") === false && src065RawMaterialExposed === false && src065SourceUrlExposed === false && src065CredentialMaterialExposed === false && sourceRegistryWritePerformed === false && publishedViewWritePerformed === false, "SRC-065 ONVIF provider readiness independent sanitized status runtime readback failed");

  const src067SourceRegistryWritePerformed = runtimeFlagValue(stagingRestoreValidationHandoff, "sourceRegistryWritePerformed");
  const src067RawMaterialExposed = runtimeSourceMaterialExposed(stagingRestoreValidationHandoff);
  const src067SourceUrlExposed = runtimeSourceUrlExposed(stagingRestoreValidationHandoff);
  const src067CredentialMaterialExposed = runtimeFlagValue(stagingRestoreValidationHandoff, "credentialMaterialExposed");
  assert(stagingRestoreValidationHandoff.schema === "media-server.ops.v390-staging-restore-validation-handoff.v1" && Array.isArray(stagingRestoreValidationHandoff.stagingRestoreValidationChecklist) && src067SourceRegistryWritePerformed === false && runtimeFlagValue(stagingRestoreValidationHandoff, "publishedViewWritePerformed") === false && runtimeFlagValue(stagingRestoreValidationHandoff, "productionRestorePerformed") === false && src067RawMaterialExposed === false && src067SourceUrlExposed === false && src067CredentialMaterialExposed === false && sourceRegistryWritePerformed === false && publishedViewWritePerformed === false, "SRC-067 staging restore handoff independent no-write/redaction runtime readback failed");

  const src068SourceRegistryWritePerformed = runtimeFlagValue(fieldEvidenceBridgeDecision, "sourceRegistryWritePerformed");
  const src068RawMaterialExposed = runtimeSourceMaterialExposed(fieldEvidenceBridgeDecision);
  const src068SourceUrlExposed = runtimeSourceUrlExposed(fieldEvidenceBridgeDecision);
  const src068CredentialMaterialExposed = runtimeFlagValue(fieldEvidenceBridgeDecision, "rawCredentialMaterialIncluded");
  assert(fieldEvidenceBridgeDecision.schema === "media-server.ops.v390-field-evidence-bridge-decision.v1" && Array.isArray(fieldEvidenceBridgeDecision.fieldEvidenceBridgeDecisions) && src068SourceRegistryWritePerformed === false && runtimeFlagValue(fieldEvidenceBridgeDecision, "publishedViewWritePerformed") === false && runtimeFlagValue(fieldEvidenceBridgeDecision, "endpointProbePerformed") === false && runtimeFlagValue(fieldEvidenceBridgeDecision, "credentialProbePerformed") === false && runtimeFlagValue(fieldEvidenceBridgeDecision, "fieldPassClaimed") === false && runtimeFlagValue(fieldEvidenceBridgeDecision, "releasePassClaimed") === false && src068RawMaterialExposed === false && src068SourceUrlExposed === false && src068CredentialMaterialExposed === false && sourceRegistryWritePerformed === false && publishedViewWritePerformed === false, "SRC-068 field evidence approval boundary independent no-write/redaction/not-run runtime readback failed");
}

function sourceFixtures() {
  return [
    { sourceId: "1", displayName: "File Source", kind: "file", file: "sample_h264.mp4", enabled: true, site: "Site A", floor: "1F", zone: "North" },
    { sourceId: "2", displayName: "RTSP Source", kind: "rtsp", rtspUrl: `rtsp://127.0.0.1:${rtspPort}/dhseo?file=sample_h264.mp4`, enabled: true },
    { sourceId: "3", displayName: "HLS Source", kind: "hls", httpUrl: "https://example.test/live/master.m3u8", enabled: true },
    { sourceId: "4", displayName: "WHEP Source", kind: "whep", whepUrl: `${httpBase}/whep?file=sample_h264.mp4`, enabled: true },
    { sourceId: "5", displayName: "WHIP Published Source", kind: "webrtc", webrtcSourceId: "whip-published-5", enabled: true },
  ];
}

function runtimeFlagValue(payload, field) {
  const values = [];
  const visit = value => {
    if (!value || typeof value !== "object") return;
    if (Object.prototype.hasOwnProperty.call(value, field)) values.push(value[field]);
    for (const nested of Array.isArray(value) ? value : Object.values(value)) visit(nested);
  };
  visit(payload);
  if (values.length === 0) throw new Error(`runtime response boundary flag missing: ${field}`);
  if (!values.every(value => typeof value === "boolean")) throw new Error(`runtime response boundary flag is not boolean: ${field}`);
  return values.some(Boolean);
}

function runtimeSourceMaterialExposed(payload) {
  const text = JSON.stringify(payload);
  return ["__review4_managed_sentinel__.mp4", "sample_h264.mp4", "whip-published-5"].some(token => text.includes(token));
}

function runtimeSourceUrlExposed(payload) {
  const text = JSON.stringify(payload);
  return ["rtsp://127.0.0.1:", "https://example.test/live/master.m3u8", "/whep?file=sample_h264.mp4"].some(token => text.includes(token));
}

function runtimeCredentialMaterialExposed(payload) {
  const text = JSON.stringify(payload);
  return [adminToken, operatorToken, "operator-entered-secret"].some(token => text.includes(token));
}

function viewFixture(viewId, sourceId, overrides = {}) {
  return {
    viewId,
    sourceId,
    displayName: `View ${viewId}`,
    defaultRuleId: "",
    allowedRuleIds: [],
    allowedOverlayModes: ["raw", "va-overlay"],
    showDashboard: true,
    showEvents: true,
    showMetadataSummary: true,
    maxTiles: 2,
    enabled: true,
    ...overrides,
  };
}

function startServer() {
  const child = spawn("./server.sh", ["foreground"], {
    cwd: rootDir,
    env: {
      ...process.env,
      MEDIA_SERVER_SKIP_LOCAL_ENV: "1",
      MEDIA_SERVER_SKIP_BUILD: "1",
      MEDIA_SERVER_AUTH_MODE: "token",
      MEDIA_SERVER_AUTH_ADMIN_TOKEN: adminToken,
      MEDIA_SERVER_AUTH_OPERATOR_TOKEN: operatorToken,
      MEDIA_SERVER_SOURCE_REGISTRY: sourceFile,
      MEDIA_SERVER_PUBLISHED_VIEWS: viewFile,
      MEDIA_SERVER_ANALYSIS_REGISTRY: analysisFile,
      MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_ENABLED: "0",
      MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_PATH: eventFile,
      MEDIA_SERVER_AUTH_USERS_FILE: usersFile,
      MEDIA_SERVER_LISTEN_ADDRESS: "127.0.0.1",
      MEDIA_SERVER_HTTP_LISTEN_ADDRESS: "127.0.0.1",
      MEDIA_SERVER_LISTEN_PORT: String(rtspPort),
      MEDIA_SERVER_HTTP_LISTEN_PORT: String(httpPort),
      MEDIA_SERVER_FORCE_RTSP_TCP: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", rememberLog);
  child.stderr.on("data", rememberLog);
  return child;
}

function rememberLog(chunk) {
  for (const line of String(chunk || "").split(/\r?\n/)) {
    if (!line.trim()) continue;
    serverLogs.push(line.slice(0, 300));
    if (serverLogs.length > 100) serverLogs.shift();
  }
}

async function waitForServer() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (server.exitCode !== null) throw new Error(`managed server exited: ${serverLogs.slice(-20).join(" | ")}`);
    try {
      const response = await fetch(`${httpBase}/health`);
      if (response.ok) {
        console.log(`[pass] managed source registry server ready ${httpBase}`);
        return;
      }
    } catch {}
    await delay(100);
  }
  throw new Error(`managed server readiness timeout: ${serverLogs.slice(-20).join(" | ")}`);
}

async function stopServer() {
  if (!server || server.exitCode !== null || server.signalCode !== null) return;
  const child = server;
  let observedExit = false;
  const exited = new Promise(resolve => {
    child.once("exit", () => {
      observedExit = true;
      resolve(true);
    });
  });
  child.kill("SIGTERM");
  let terminated = await Promise.race([exited, delay(5000).then(() => false)]);
  if (!terminated && child.exitCode === null && child.signalCode === null) {
    child.kill("SIGKILL");
    terminated = await Promise.race([exited, delay(5000).then(() => false)]);
  }
  if (!(terminated || observedExit || child.exitCode !== null || child.signalCode !== null)) {
    throw new Error("managed source registry server did not stop");
  }
  console.log("[pass] managed source registry server stop observed");
}

async function requestJson(urlPath, options = {}, expectedStatus = 200) {
  const text = await requestText(urlPath, options, expectedStatus);
  try { return JSON.parse(text); } catch { throw new Error(`${urlPath} returned non-JSON: ${text.slice(0, 220)}`); }
}

async function requestJsonWithStatus(urlPath, options = {}, expectedStatus = 200) {
  const response = await fetch(`${httpBase}${urlPath}`, options);
  const text = await response.text();
  if (response.status !== expectedStatus) {
    throw new Error(`${options.method || "GET"} ${urlPath} expected ${expectedStatus}, got ${response.status}: ${text.slice(0, 240)}`);
  }
  try {
    return { status: response.status, payload: JSON.parse(text) };
  } catch {
    throw new Error(`${urlPath} returned non-JSON: ${text.slice(0, 220)}`);
  }
}

async function requestJsonAllowStatuses(urlPath, options, allowedStatuses) {
  let response;
  try {
    response = await fetch(`${httpBase}${urlPath}`, options);
  } catch (error) {
    const recentLogs = serverLogs.slice(-20).join(" | ")
      .replaceAll(adminToken, "<redacted-admin-token>")
      .replaceAll(operatorToken, "<redacted-operator-token>");
    throw new Error(
      `${options.method || "GET"} ${urlPath} transport failed during lifecycle race; ` +
      `serverExit=${server?.exitCode ?? "null"} serverSignal=${server?.signalCode ?? "null"}; ` +
      `logs=${recentLogs || "<empty>"}`,
      { cause: error },
    );
  }
  const text = await response.text();
  if (!allowedStatuses.has(response.status)) {
    throw new Error(
      `${options.method || "GET"} ${urlPath} expected one of ${[...allowedStatuses].join(",")}, ` +
      `got ${response.status}: ${text.slice(0, 240)}`,
    );
  }
  try {
    return { status: response.status, payload: JSON.parse(text) };
  } catch {
    throw new Error(`${urlPath} returned non-JSON: ${text.slice(0, 220)}`);
  }
}

async function requestText(urlPath, options = {}, expectedStatus = 200) {
  let response;
  try {
    response = await fetch(`${httpBase}${urlPath}`, options);
  } catch (error) {
    const recentLogs = serverLogs.slice(-20).join(" | ")
      .replaceAll(adminToken, "<redacted-admin-token>")
      .replaceAll(operatorToken, "<redacted-operator-token>");
    throw new Error(
      `${options.method || "GET"} ${urlPath} transport failed; ` +
      `serverExit=${server?.exitCode ?? "null"} serverSignal=${server?.signalCode ?? "null"}; ` +
      `logs=${recentLogs || "<empty>"}`,
      { cause: error },
    );
  }
  const text = await response.text();
  if (response.status !== expectedStatus) {
    throw new Error(`${options.method || "GET"} ${urlPath} expected ${expectedStatus}, got ${response.status}: ${text.slice(0, 240)}`);
  }
  return text;
}

function opsJson(urlPath) { return requestJson(urlPath, { headers: opsHeaders() }); }
function clientJson(urlPath) { return requestJson(urlPath, { headers: clientHeaders() }); }
function opsHeaders() { return { Authorization: `Bearer ${adminToken}` }; }
function clientHeaders() { return { Authorization: `Bearer ${adminToken}` }; }
function opsJsonHeaders() { return { ...opsHeaders(), "Content-Type": "application/json" }; }
function clientJsonHeaders() { return { ...clientHeaders(), "Content-Type": "application/json" }; }
function readJson(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }
function assert(condition, message) { if (!condition) throw new Error(message); console.log(`[pass] ${message.replace(/ failed$/, "")}`); }

function numberOption(args, name, fallback) {
  const index = args.indexOf(`--${name}`);
  if (index < 0) return fallback;
  const value = Number(args[index + 1]);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`--${name} must be a positive number`);
  return value;
}

async function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" && address ? address.port : 0;
      probe.close(error => error ? reject(error) : resolve(port));
    });
  });
}
