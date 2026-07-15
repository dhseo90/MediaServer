#!/usr/bin/env node
// REVIEW4-53 LAB core API의 실제 HTTP mutation/readback/cleanup oracle다.

import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`V390 REVIEW4 LAB core API verification

Usage:
  ./server.sh verify-v390-review4-lab-core-api [--http-base <url>] [--file <token>]

Checks analysis registry, tap metadata/diagnostics/images, report path guards, and VLM Ops contracts
with exact HTTP readback and cleanup. The command owns a throwaway local server by default and does
not perform external WHEP/TURN, UI, or long-run checks.
`);
}
assertKnownOptions(rawArgs, ["h", "help", "http-base", "file"]);

let httpBase = process.env.MEDIA_SERVER_VERIFY_LAB_CORE_HTTP_BASE || "";
let externalServerRequested = Boolean(process.env.MEDIA_SERVER_VERIFY_LAB_CORE_HTTP_BASE);
let fileToken = process.env.MEDIA_SERVER_VERIFY_LAB_CORE_FILE || "sample_h264.mp4";
for (let index = 0; index < rawArgs.length; index += 1) {
  const value = rawArgs[index];
  if (value === "--http-base") { httpBase = rawArgs[++index] || httpBase; externalServerRequested = true; }
  else if (value.startsWith("--http-base=")) { httpBase = value.slice("--http-base=".length) || httpBase; externalServerRequested = true; }
  else if (value === "--file") fileToken = rawArgs[++index] || fileToken;
  else if (value.startsWith("--file=")) fileToken = value.slice("--file=".length) || fileToken;
}

const suffix = `${Date.now()}${process.pid}`.slice(-9);
const profileId = `6${suffix.slice(-8)}`;
const ruleId = `7${suffix.slice(-8)}`;
const vaRuleId = `8${suffix.slice(-8)}`;
const vlmProfileId = `review4-${suffix}`;
const reportPath = path.join("/tmp", `media_server_review4_lab_core_${process.pid}.json`);
const reportMarker = `review4-lab-report-${suffix}`;
let tapId = "";
let managedServer = null;
let managedWorkDir = "";
const managedLogs = [];

try {
  fs.writeFileSync(reportPath, JSON.stringify({schema:"media-server.review4-lab-report.v1", marker:reportMarker}), {mode:0o600});
  const reportResolvedPath = fs.realpathSync(reportPath);
  await ensureServerReady();
  const capabilitiesResponse = await request("GET", "/lab/analysis/capabilities", undefined, 200);
  const capabilities = capabilitiesResponse.json;
  const trackingCategoriesBytes = extractJsonArrayMember(capabilitiesResponse.text, "trackingCategories");
  assert(Array.isArray(capabilities.detectors) && Array.isArray(capabilities.outputs), "LAB-001 detectors/outputs schema missing");
  assert(Array.isArray(capabilities.trackingCategories) && capabilities.trackingCategories.length === 10 &&
    capabilities.trackingCategories.every(item =>
      JSON.stringify(Object.keys(item)) === JSON.stringify([
        "value", "label", "hint", "group", "aliases", "labels", "displayLabels",
      ])) &&
    crypto.createHash("sha256").update(trackingCategoriesBytes).digest("hex") ===
      "5acfa1e522bc627763073d208b3b71be5c02f19f7ebfd6eadc2773ade5ed43fe",
  "LAB-001 trackingCategories ordered byte schema drift");

  const initialProfiles = (await request("GET", "/lab/analysis/profiles", undefined, 200)).json;
  assert(Array.isArray(initialProfiles.builtInProfiles) && Array.isArray(initialProfiles.profiles), "LAB-002 profiles schema missing");

  const initialRules = (await request("GET", "/lab/analysis/rules", undefined, 200)).json;
  assert(Array.isArray(initialRules.rules), "LAB-006 rules schema missing");

  const initialVaRules = (await request("GET", "/lab/analysis/va-rules", undefined, 200)).json;
  assert(Array.isArray(initialVaRules.vaRules), "LAB-010 vaRules schema missing");

  const createdProfile = await request("POST", "/lab/analysis/profiles", profilePayload(profileId, 5), 201);
  const duplicateProfile = await request("POST", "/lab/analysis/profiles", profilePayload(profileId, 5), 400);
  const profilesAfterCreate = (await request("GET", "/lab/analysis/profiles", undefined, 200)).json;
  assert(createdProfile.json?.profile?.id === profileId && duplicateProfile.status === 400 && profilesAfterCreate.profiles.some(item => item?.id === profileId), "LAB-003 profile create/validation/readback failed");

  const updatedProfile = await request("PUT", `/lab/analysis/profiles/${encodeURIComponent(profileId)}`, profilePayload(profileId, 7), 200);
  const invalidProfile = await request("PUT", `/lab/analysis/profiles/${encodeURIComponent(profileId)}`, profilePayload(`${profileId}-wrong`, 9), 400);
  const profileReadback = (await request("GET", `/lab/analysis/profiles/${encodeURIComponent(profileId)}`, undefined, 200)).json;
  assert(updatedProfile.json?.profile?.fps === 7 && invalidProfile.status === 400 && profileReadback.profile?.fps === 7, "LAB-004 profile update/validation/readback failed");

  const createdRule = await request("POST", "/lab/analysis/rules", rulePayload(ruleId, "created"), 201);
  const duplicateRule = await request("POST", "/lab/analysis/rules", rulePayload(ruleId, "duplicate"), 400);
  const rulesAfterCreate = (await request("GET", "/lab/analysis/rules", undefined, 200)).json;
  assert(createdRule.json?.rule?.id === ruleId && duplicateRule.status === 400 && rulesAfterCreate.rules.some(item => item?.id === ruleId), "LAB-007 rule create/validation/readback failed");

  const updatedRule = await request("PUT", `/lab/analysis/rules/${encodeURIComponent(ruleId)}`, rulePayload(ruleId, "updated"), 200);
  const invalidRule = await request("PUT", `/lab/analysis/rules/${encodeURIComponent(ruleId)}`, rulePayload(`${ruleId}-wrong`, "invalid"), 400);
  const ruleReadback = (await request("GET", `/lab/analysis/rules/${encodeURIComponent(ruleId)}`, undefined, 200)).json;
  assert(updatedRule.json?.rule?.name === "review4-updated" && invalidRule.status === 400 && ruleReadback.rule?.name === "review4-updated", "LAB-008 rule update/validation/readback failed");

  const createdVaRule = await request("POST", "/lab/analysis/va-rules", vaRulePayload(vaRuleId, profileId, ruleId, 10), 201);
  const duplicateVaRule = await request("POST", "/lab/analysis/va-rules", vaRulePayload(vaRuleId, profileId, ruleId, 10), 400);
  const vaRulesAfterCreate = (await request("GET", "/lab/analysis/va-rules", undefined, 200)).json;
  assert(createdVaRule.json?.vaRule?.id === vaRuleId && duplicateVaRule.status === 400 && vaRulesAfterCreate.vaRules.some(item => item?.id === vaRuleId), "LAB-011 vaRule create/validation/readback failed");

  const updatedVaRule = await request("PUT", `/lab/analysis/va-rules/${encodeURIComponent(vaRuleId)}`, vaRulePayload(vaRuleId, profileId, ruleId, 20), 200);
  const invalidVaRule = await request("PUT", `/lab/analysis/va-rules/${encodeURIComponent(vaRuleId)}`, vaRulePayload(`${vaRuleId}-wrong`, profileId, ruleId, 30), 400);
  const vaRuleReadback = (await request("GET", `/lab/analysis/va-rules/${encodeURIComponent(vaRuleId)}`, undefined, 200)).json;
  assert(updatedVaRule.json?.vaRule?.priority === 20 && invalidVaRule.status === 400 && vaRuleReadback.vaRule?.priority === 20, "LAB-012 vaRule update/validation/readback failed");

  const tapListBefore = (await request("GET", "/lab/analysis/taps", undefined, 200)).json;
  assert(Array.isArray(tapListBefore.taps), "LAB-017 tap list schema missing");

  const createdTap = (await request("POST", `/lab/analysis/taps?file=${encodeURIComponent(fileToken)}&va=1`, undefined, 200)).json;
  tapId = String(createdTap.tapId || "");
  const tapListAfterCreate = (await request("GET", "/lab/analysis/taps", undefined, 200)).json;
  assert(Boolean(tapId) && tapListAfterCreate.taps.some(item => item?.tapId === tapId), "LAB-018 tap create/source/readback failed");

  const metadata = await waitForTapMetadata(tapId);
  assert(metadata.tapId === tapId && metadata.hasResult === true && Number.isFinite(Number(metadata.result?.pts)) && Array.isArray(metadata.result?.detections), "LAB-021 tap metadata authoritative readback failed");

  const streamMetadata = await readSseMetadata(`/lab/analysis/taps/${encodeURIComponent(tapId)}/metadata/stream`);
  assert(streamMetadata.schema === "media-server.va.runtime-metadata.v1" && Array.isArray(streamMetadata.tracks) && Array.isArray(streamMetadata.events), "LAB-015 metadata stream schema/delivery readback failed");
  assert(streamMetadata.schema === "media-server.va.runtime-metadata.v1" && Array.isArray(streamMetadata.tracks) && Array.isArray(streamMetadata.events), "LAB-020 tap metadata stream independent SSE readback failed");

  const ptsMs = Math.trunc(Number(metadata.result.pts) / 1_000_000);
  const bbox = (await request("GET", `/lab/analysis/taps/${encodeURIComponent(tapId)}/bbox-diagnostics?ptsMs=${ptsMs}&toleranceMs=1200`, undefined, 200)).json;
  assert(bbox.schema === "media-server.lab.bbox-diagnostics.v1" && bbox.tapId === tapId && bbox.matched === true && Array.isArray(bbox.detectorDetections) && !/(credential|rawFrameBytes)/i.test(JSON.stringify(bbox)), "LAB-022 bbox diagnostics PTS/redaction readback failed");

  const stateDump = (await request("GET", `/lab/analysis/taps/${encodeURIComponent(tapId)}/state-dump`, undefined, 200)).json;
  assert(stateDump.tapId === tapId && stateDump.analyticsState && typeof stateDump.analyticsState === "object" && !/(credential|sourceUrl|rawFrameBytes)/i.test(JSON.stringify(stateDump)), "LAB-023 tap state dump authoritative/redacted readback failed");

  const metricsDump = (await request("GET", `/lab/analysis/taps/${encodeURIComponent(tapId)}/metrics-dump`, undefined, 200)).json;
  assert(metricsDump.tapId === tapId && metricsDump.tapState && typeof metricsDump.tapState === "object" && Object.hasOwn(metricsDump, "metricsReport"), "LAB-024 tap metrics dump authoritative readback failed");

  const events = (await request("GET", `/lab/analysis/taps/${encodeURIComponent(tapId)}/events`, undefined, 200)).json;
  assert(events.tapId === tapId && Array.isArray(events.events) && events.result && typeof events.result === "object", "LAB-025 tap event evaluation readback failed");

  const snapshot = await request("GET", `/lab/analysis/taps/${encodeURIComponent(tapId)}/snapshot.jpg?quality=70`, undefined, 200);
  assert(snapshot.contentType.startsWith("image/jpeg") && snapshot.byteLength > 0, "LAB-026 tap snapshot JPEG readback failed");

  const overlay = await request("GET", `/lab/analysis/taps/${encodeURIComponent(tapId)}/overlay.jpg?quality=70`, undefined, 200);
  assert(overlay.contentType.startsWith("image/jpeg") && overlay.byteLength > 0, "LAB-027 tap overlay JPEG readback failed");

  const labFiles = (await request("GET", "/lab/files", undefined, 200)).json;
  assert(Array.isArray(labFiles.files) && Array.isArray(labFiles.imageFiles) && Array.isArray(labFiles.assetImages), "LAB-032 lab files authoritative inventory readback failed");

  await verifyGlobalAnalysisEndpoints();

  const labReports = (await request("GET", "/lab/reports", undefined, 200)).json;
  assert(Array.isArray(labReports.reports) && labReports.reports.some(item => item?.path === reportResolvedPath && Number(item?.sizeBytes) > 0), "LAB-033 lab reports authoritative inventory readback failed");

  const reportContent = (await request("GET", `/lab/reports/content?path=${encodeURIComponent(reportPath)}`, undefined, 200)).json;
  const rejectedReportPath = await request("GET", `/lab/reports/content?path=${encodeURIComponent("/etc/passwd")}`, undefined, 400);
  assert(reportContent.path === reportResolvedPath && String(reportContent.content || "").includes(reportMarker) && rejectedReportPath.status === 400, "LAB-034 lab report content/path guard readback failed");

  const dryRun = (await request("GET", "/ops/api/vlm/install-connection/dry-run?hardwareClass=local-standard&privacyMode=local-only&cloudOptIn=not-acknowledged&runtimeReadiness=ready", undefined, 200)).json;
  assert(dryRun.sourceRecommendation?.schema === "media-server.vlm-recommendation.v1" && dryRun.pcCapability?.hardwareClass === "local-standard" && dryRun.decision?.status === "ready-for-user-selection" && dryRun.options.some(item => item?.selectable === true && item?.impact?.resourceEstimate), "LAB-036 VLM recommendation decision/resource readback failed");
  const invalidDryRun = await request("GET", "/ops/api/vlm/install-connection/dry-run?hardwareClass=invalid", undefined, 400);
  assert(dryRun.schema === "media-server.vlm-install-connection-dry-run.v1" && dryRun.contractInvariants?.installPerformed === false && dryRun.contractInvariants?.connectionPerformed === false && invalidDryRun.status === 400, "LAB-037 VLM install/connection dry-run contract readback failed");

  const createdVlmProfile = await request("POST", "/ops/api/vlm/profiles", vlmProfilePayload(vlmProfileId, "created"), 201);
  const invalidVlmProfile = await request("PUT", `/ops/api/vlm/profiles/${encodeURIComponent(vlmProfileId)}`, {...vlmProfilePayload(vlmProfileId, "invalid"), schema:"invalid"}, 400);
  const updatedVlmProfile = await request("PUT", `/ops/api/vlm/profiles/${encodeURIComponent(vlmProfileId)}`, vlmProfilePayload(vlmProfileId, "updated"), 200);
  const vlmProfileReadback = (await request("GET", `/ops/api/vlm/profiles/${encodeURIComponent(vlmProfileId)}`, undefined, 200)).json;
  assert(createdVlmProfile.json?.vlmProfile?.id === vlmProfileId && invalidVlmProfile.status === 400 && updatedVlmProfile.json?.vlmProfile?.activation?.disabledReason === "review4-updated" && vlmProfileReadback.vlmProfile?.schema === "media-server.vlm-profile.v1", "LAB-038 VLM profile create/validation/update/readback failed");

  const cloudBlocked = (await request("GET", "/ops/api/vlm/install-connection/dry-run?hardwareClass=local-standard&privacyMode=cloud-allowed&cloudOptIn=not-acknowledged&runtimeReadiness=ready", undefined, 200)).json;
  assert(dryRun.privacyTransferGuard?.schema === "media-server.vlm-privacy-transfer-guard.v1" && dryRun.privacyTransferGuard?.gate?.status === "pass" && cloudBlocked.privacyTransferGuard?.gate?.status === "blocked" && cloudBlocked.privacyTransferGuard?.gate?.providerCallAllowed === false, "LAB-042 VLM privacy transfer guard local/cloud readback failed");

  const summaryReview = (await request("GET", "/ops/api/events/reviews?q=review4", undefined, 200)).json;
  assert(summaryReview.memorySearch?.vlmSummaryCandidateReview?.sourceCandidateReport?.schema === "media-server.vlm-summary-search-candidates.v1" && Array.isArray(summaryReview.memorySearch.vlmSummaryCandidateReview.sourceCandidateReport.candidates), "LAB-043 VLM summary search candidate HTTP readback failed");

  const suggestionWorkflow = (await request("GET", "/ops/api/vlm/rule-suggestion-drafts?limit=5", undefined, 200)).json;
  assert(suggestionWorkflow.sourceCandidateReport?.schema === "media-server.vlm-rule-suggestion-candidates.v1" && Array.isArray(suggestionWorkflow.sourceCandidateReport.candidates) && suggestionWorkflow.workflowContract?.ruleRegistryWritePerformed === false && suggestionWorkflow.workflowContract?.autoRuleApplied === false, "LAB-044 VLM rule suggestion candidate HTTP readback failed");

  await request("DELETE", `/lab/analysis/taps/${encodeURIComponent(tapId)}`, undefined, 200);
  const deletedTapReadback = await request("GET", `/lab/analysis/taps/${encodeURIComponent(tapId)}`, undefined, 404);
  const tapListAfterDelete = (await request("GET", "/lab/analysis/taps", undefined, 200)).json;
  assert(deletedTapReadback.status === 404 && !tapListAfterDelete.taps.some(item => item?.tapId === tapId), "LAB-019 tap detach/cleanup readback failed");
  tapId = "";

  await request("DELETE", `/ops/api/vlm/profiles/${encodeURIComponent(vlmProfileId)}`, undefined, 200);
  const deletedVlmProfile = await request("GET", `/ops/api/vlm/profiles/${encodeURIComponent(vlmProfileId)}`, undefined, 404);
  const vlmProfilesAfterDelete = (await request("GET", "/ops/api/vlm/profiles", undefined, 200)).json;
  assert(deletedVlmProfile.status === 404 && !vlmProfilesAfterDelete.profiles.some(item => item?.id === vlmProfileId), "LAB-038 VLM profile delete/cleanup readback failed");

  await request("DELETE", `/lab/analysis/va-rules/${encodeURIComponent(vaRuleId)}`, undefined, 200);
  const deletedVaRule = await request("GET", `/lab/analysis/va-rules/${encodeURIComponent(vaRuleId)}`, undefined, 404);
  const vaRulesAfterDelete = (await request("GET", "/lab/analysis/va-rules", undefined, 200)).json;
  assert(deletedVaRule.status === 404 && !vaRulesAfterDelete.vaRules.some(item => item?.id === vaRuleId), "LAB-013 vaRule delete/cleanup readback failed");

  await request("DELETE", `/lab/analysis/rules/${encodeURIComponent(ruleId)}`, undefined, 200);
  const deletedRule = await request("GET", `/lab/analysis/rules/${encodeURIComponent(ruleId)}`, undefined, 404);
  const rulesAfterDelete = (await request("GET", "/lab/analysis/rules", undefined, 200)).json;
  assert(deletedRule.status === 404 && !rulesAfterDelete.rules.some(item => item?.id === ruleId), "LAB-009 rule delete/cleanup readback failed");

  await request("DELETE", `/lab/analysis/profiles/${encodeURIComponent(profileId)}`, undefined, 200);
  const deletedProfile = await request("GET", `/lab/analysis/profiles/${encodeURIComponent(profileId)}`, undefined, 404);
  const profilesAfterDelete = (await request("GET", "/lab/analysis/profiles", undefined, 200)).json;
  assert(deletedProfile.status === 404 && !profilesAfterDelete.profiles.some(item => item?.id === profileId), "LAB-005 profile delete/cleanup readback failed");

  console.log("[pass] V390 REVIEW4 LAB core API contracts");
} finally {
  if (tapId) await request("DELETE", `/lab/analysis/taps/${encodeURIComponent(tapId)}`, undefined, [200, 404], true);
  await request("DELETE", `/ops/api/vlm/profiles/${encodeURIComponent(vlmProfileId)}`, undefined, [200, 404], true);
  await request("DELETE", `/lab/analysis/va-rules/${encodeURIComponent(vaRuleId)}`, undefined, [200, 404], true);
  await request("DELETE", `/lab/analysis/rules/${encodeURIComponent(ruleId)}`, undefined, [200, 404], true);
  await request("DELETE", `/lab/analysis/profiles/${encodeURIComponent(profileId)}`, undefined, [200, 404], true);
  await stopManagedServer();
  fs.rmSync(reportPath, {force:true});
  if (managedWorkDir) fs.rmSync(managedWorkDir, {recursive:true,force:true});
}

function profilePayload(id, fps) {
  return {id, enabled:true, detector:"dummy", fps, maxQueue:1, trackingClasses:["person"], analysis:{classes:["person"]}};
}

function rulePayload(id, revision) {
  return {id, name:`review4-${revision}`, enabled:true, ruleKind:"basic", analysis:{classes:["person"],trackingPolicy:{tracker:"lite",reid:"off"}}, event:{type:"presence",region:{type:"polygon",points:[{x:0.1,y:0.1},{x:0.9,y:0.1},{x:0.9,y:0.9}]}}};
}

function vaRulePayload(id, profileIdValue, ruleIdValue, priority) {
  return {id, name:`review4-${id}`, enabled:true, priority, source:{kind:"file",file:fileToken}, analysis:{profileId:profileIdValue,classes:["person"],trackingPolicy:{tracker:"lite",reid:"off"}}, templateStart:{ruleId:ruleIdValue}, event:rulePayload(ruleIdValue,"va").event};
}

function vlmProfilePayload(id, revision) {
  return {
    schema:"media-server.vlm-profile.v1", id, selectedOptionId:"local-qwen3-vl-8b",
    provider:"user-supplied-local-runtime", model:"Qwen/Qwen3-VL-8B-Instruct", runtime:"not-configured",
    privacyMode:"local-only", cloudOptInAcknowledged:false,
    promptProfile:{id:"event-review-default",version:"v1",language:"ko-en"},
    evaluation:{candidateId:"",expectedCatalogRevision:"",expectedProvenanceDigest:""},
    activation:{enabled:false,status:"disabled",fallbackProfileId:"",disabledReason:`review4-${revision}`},
    runtimeContract:{schema:"media-server.vlm-runtime-opt-in-contract.v1",targetStep:"V210-S01",mode:"disabled",status:"disabled",defaultEnabled:false,operatorOptInRequired:true,operatorOptInAcknowledged:false,runtimeCallAllowed:false,providerCallAllowed:false,providerFieldSmokeRequired:false,sideEffects:falseInvariantSet({modelArtifactDownloaded:false,modelArtifactBundled:false})},
    sourceStep:"V390-REVIEW4-53",storageScope:"profile-storage-only",contractInvariants:falseInvariantSet(),
  };
}

function falseInvariantSet(extra = {}) {
  return {runtimeVlmCallPerformed:false,sidecarStored:false,cloudProviderApiCalled:false,credentialStored:false,eventPostPayloadChanged:false,webrtcDataChannelSchemaChanged:false,sseMetadataSchemaChanged:false,wsMetadataSchemaChanged:false,rtspOrWebrtcMediaPathChanged:false,viewerClientExposureAdded:false,...extra};
}

async function request(method, path, body, expectedStatus, bestEffort = false) {
  try {
    const response = await fetch(new URL(path, httpBase), {method, headers:body === undefined ? {} : {"Content-Type":"application/json"}, body:body === undefined ? undefined : JSON.stringify(body)});
    const bytes = new Uint8Array(await response.arrayBuffer());
    const text = new TextDecoder().decode(bytes);
    let json = {};
    try { json = JSON.parse(text); } catch {}
    const expected = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
    if (!expected.includes(response.status)) throw new Error(`${method} ${path}: expected ${expected.join("/")}, got ${response.status}: ${text.slice(0,240)}`);
    return {status:response.status,text,json,byteLength:bytes.byteLength,contentType:response.headers.get("content-type") || ""};
  } catch (error) {
    if (bestEffort) return {status:0,text:"",json:{}};
    throw error;
  }
}

async function waitForTapMetadata(id) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const response = await request("GET", `/lab/analysis/taps/${encodeURIComponent(id)}/metadata`, undefined, 200);
    if (response.json?.hasResult === true && response.json?.result) return response.json;
    await delay(100);
  }
  throw new Error(`LAB-021 tap metadata result timeout: ${id}`);
}

async function verifyGlobalAnalysisEndpoints() {
  const metadata = (await request("GET", "/lab/analysis/metadata", undefined, 200)).json;
  assert(metadata.schema === "media-server.lab.analysis-metadata.v1" && metadata.activeTaps >= 1 && Array.isArray(metadata.taps), "LAB-028 global metadata schema/readback failed");

  const bbox = (await request("GET", "/lab/analysis/bbox-diagnostics", undefined, 200)).json;
  assert(bbox.schema === "media-server.lab.bbox-diagnostics-collection.v1" && Array.isArray(bbox.diagnostics) && !/(credential|sourceUrl|rawFrameBytes)/i.test(JSON.stringify(bbox)), "LAB-029 global bbox diagnostics schema/redaction failed");

  const state = (await request("GET", "/lab/analysis/state-dump", undefined, 200)).json;
  assert(state.schema === "media-server.lab.analysis-state-dump.v1" && Array.isArray(state.states) && !/(credential|sourceUrl|rawFrameBytes)/i.test(JSON.stringify(state)), "LAB-030 global state dump schema/redaction failed");

  const metrics = (await request("GET", "/lab/analysis/metrics-dump", undefined, 200)).json;
  assert(metrics.schema === "media-server.lab.analysis-metrics-dump.v1" && Array.isArray(metrics.metrics), "LAB-031 global metrics dump schema/readback failed");
}

async function readSseMetadata(route) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(new URL(route, httpBase), {signal:controller.signal});
    assert(response.status === 200 && String(response.headers.get("content-type") || "").includes("text/event-stream"), "LAB-020 metadata stream response contract failed");
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const {done,value} = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, {stream:true});
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() || "";
      for (const block of blocks) {
        const event = block.split(/\r?\n/).find(line => line.startsWith("event:"))?.slice(6).trim();
        const data = block.split(/\r?\n/).filter(line => line.startsWith("data:")).map(line => line.slice(5).trim()).join("\n");
        if (event === "metadata" && data) { await reader.cancel(); return JSON.parse(data); }
      }
    }
  } finally {
    clearTimeout(timeout);
  }
  throw new Error("LAB-020 metadata SSE event not observed");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function extractJsonArrayMember(text, key) {
  const keyIndex = text.indexOf(`"${key}"`);
  if (keyIndex < 0) throw new Error(`JSON member missing: ${key}`);
  const colon = text.indexOf(":", keyIndex + key.length + 2);
  let start = colon + 1;
  while (/\s/.test(text[start] || "")) start += 1;
  if (colon < 0 || text[start] !== "[") throw new Error(`JSON array member malformed: ${key}`);
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === "[") depth += 1;
    else if (char === "]" && --depth === 0) return text.slice(start, index + 1);
  }
  throw new Error(`JSON array member unterminated: ${key}`);
}

async function ensureServerReady() {
  if (externalServerRequested) {
    if (!httpBase) throw new Error("explicit external HTTP base is empty");
    const response = await fetch(new URL("/health", httpBase));
    if (!response.ok) throw new Error(`external server health failed: HTTP ${response.status}`);
    return;
  }
  const httpPort = await freePort();
  let rtspPort = await freePort();
  while (rtspPort === httpPort) rtspPort = await freePort();
  httpBase = `http://127.0.0.1:${httpPort}`;
  managedWorkDir = fs.mkdtempSync(path.join(os.tmpdir(), "media-server-review4-lab-core-"));
  managedServer = spawn("./server.sh", ["foreground"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      MEDIA_SERVER_SKIP_LOCAL_ENV:"1",
      MEDIA_SERVER_SKIP_BUILD:"1",
      MEDIA_SERVER_BUILD_DIR:process.env.MEDIA_SERVER_BUILD_DIR || path.join(process.cwd(), "build-gst-onnx"),
      MEDIA_SERVER_AUTH_MODE:"off",
      MEDIA_SERVER_LISTEN_ADDRESS:"127.0.0.1",
      MEDIA_SERVER_HTTP_LISTEN_ADDRESS:"127.0.0.1",
      MEDIA_SERVER_LISTEN_PORT:String(rtspPort),
      MEDIA_SERVER_HTTP_LISTEN_PORT:String(httpPort),
      MEDIA_SERVER_ANALYSIS_REGISTRY:path.join(managedWorkDir,"analysis.json"),
      MEDIA_SERVER_SOURCE_REGISTRY:path.join(managedWorkDir,"sources.json"),
      MEDIA_SERVER_PUBLISHED_VIEWS:path.join(managedWorkDir,"views.json"),
      MEDIA_SERVER_AUTH_USERS_FILE:path.join(managedWorkDir,"users.json"),
      MEDIA_SERVER_ANALYSIS_EVENT_STORAGE:path.join(managedWorkDir,"events.jsonl"),
    },
    stdio:["ignore","pipe","pipe"],
  });
  const remember = chunk => {
    for (const line of String(chunk || "").split(/\r?\n/)) if (line.trim()) managedLogs.push(line.slice(0,300));
    if (managedLogs.length > 120) managedLogs.splice(0,managedLogs.length-120);
  };
  managedServer.stdout.on("data",remember);
  managedServer.stderr.on("data",remember);
  const deadline=Date.now()+30000;
  while(Date.now()<deadline){
    if(managedServer.exitCode!==null) throw new Error(`managed server exited: ${managedLogs.slice(-20).join(" | ")}`);
    try{const response=await fetch(new URL("/health",httpBase));if(response.ok)return;}catch{}
    await delay(100);
  }
  throw new Error(`managed server health timeout: ${managedLogs.slice(-20).join(" | ")}`);
}

async function stopManagedServer(){
  if(!managedServer||managedServer.exitCode!==null)return;
  const child=managedServer;
  const exited=new Promise(resolve=>child.once("exit",resolve));
  child.kill("SIGTERM");
  if(!await Promise.race([exited.then(()=>true),delay(3000).then(()=>false)])){
    child.kill("SIGKILL");
    await Promise.race([exited,delay(3000)]);
  }
  managedServer=null;
}

function freePort(){
  return new Promise((resolve,reject)=>{
    const server=net.createServer();
    server.once("error",reject);
    server.listen(0,"127.0.0.1",()=>{
      const address=server.address();
      const port=typeof address==="object"&&address?address.port:0;
      server.close(error=>error?reject(error):resolve(port));
    });
  });
}

function delay(ms){return new Promise(resolve=>setTimeout(resolve,ms));}
