#!/usr/bin/env node
// 파일 용도: VLM incident/candidate/evaluation provenance가 수동 생성 rule과 저장 API까지 보존되는지 검증한다.

import fs from "node:fs";
import { spawn } from "node:child_process";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), `media-server-v390-vlm-rule-provenance-${process.pid}-`));
const registryPath = path.join(workDir, "analysis-registry.json");
const eventPath = path.join(workDir, "events.jsonl");
const observationPath = path.join(workDir, "events.vlm-observations.jsonl");
const serverLog = [];
let serverProcess = null;

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 VLM incident-to-rule provenance verification

Usage:
  ./server.sh verify-v390-vlm-incident-rule-provenance

Checks:
  - candidate response exposes event, candidate, and evaluation source provenance.
  - /ops/rules draft application preserves provenance in the generated rule payload.
  - the rule save validator binds generated rule id and /lab/analysis/rules/{id} route.
  - persisted rule readback keeps provenance without changing event/media contracts.
  - duplicate/nested-scope JSON is rejected and reload rechecks live server records.
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const files = {
  store: read("src/analysis/vlm_observation_store.cpp"),
  server: read("src/ingress/webrtc_http_server.cpp"),
  ui: read("src/ingress/product_ui_page_scripts.cpp"),
  backlog: read("docs/development-backlog.md"),
  inventory: read("docs/project-feature-test-inventory.md"),
  records: read("docs/release-test-records.md"),
};

for (const snippet of [
  "media-server.vlm-incident-to-rule-provenance.v1",
  "eventSource",
  "candidateSource",
  "evaluationSource",
  "generatedRule",
]) assert(files.store.includes(snippet), `candidate provenance missing ${snippet}`);

for (const snippet of [
  "ValidateVlmIncidentRuleProvenanceContract",
  "generated rule id must match provenance",
  "generated rule save API route must match rule id",
  "ParseStrictJsonObjectDocument",
  "rules_quarantined_on_load_",
  "rule provenance reload quarantine",
]) assert(files.server.includes(snippet), `rule save validator missing ${snippet}`);
for (const snippet of [
  "ValidateVlmIncidentRuleProvenanceServerRecords",
  "QueryEventRecords",
  "QueryVlmObservations",
  "include_archives = true",
  "rule VLM provenance does not match server records",
]) assert(files.store.includes(snippet), `server-owned provenance comparison missing ${snippet}`);

for (const snippet of [
  "opsVlmRuleDraftProvenance",
  "candidate?.provenance",
  "saveApiRoute: `/lab/analysis/rules/${payload.id}`",
  "vlmProvenance",
]) assert(files.ui.includes(snippet), `Ops rule draft propagation missing ${snippet}`);

for (const [label, content] of Object.entries({ backlog: files.backlog, inventory: files.inventory, records: files.records })) {
  for (const snippet of ["VLM incident-to-rule provenance", "RULE-112", "LAB-126", "SAFE-213", "OPS-180"]) {
    assert(content.includes(snippet), `${label} missing ${snippet}`);
  }
}
assert(files.backlog.includes("완료/커밋 `260cbd9e`"), "backlog missing Development 15 commit reconciliation");

try {
  prepareObservationFixture();
  let ports = { http: await freePort(), rtsp: await freePort() };
  serverProcess = startServer(ports);
  let baseUrl = `http://127.0.0.1:${ports.http}`;
  await waitForHealth(baseUrl);
  const candidateResponse = await request(baseUrl, "GET", "/ops/api/vlm/rule-suggestion-drafts?sourceId=front-door&limit=1");
  assert(candidateResponse.status === 200, `candidate API HTTP ${candidateResponse.status}: ${candidateResponse.text}`);
  const candidate = candidateResponse.json?.sourceCandidateReport?.candidates?.[0];
  assert(candidate?.provenance?.eventSource?.eventId === candidate?.eventId, "candidate event provenance mismatch");
  assert(candidate?.provenance?.candidateSource?.candidateId === candidate?.candidateId, "candidate identity provenance mismatch");
  assert(candidate?.provenance?.evaluationSource?.evaluationExecuted === false, "candidate must not claim evaluation execution");

  const valid = buildRule("701", candidate.provenance);
  const saved = await request(baseUrl, "PUT", "/lab/analysis/rules/701", valid);
  assert(saved.status === 200, `valid provenance save HTTP ${saved.status}: ${saved.text}`);
  assert(saved.json?.rule?.vlmProvenance?.generatedRule?.id === "701", "save response lost generated rule provenance");
  const readback = await request(baseUrl, "GET", "/lab/analysis/rules/701");
  assert(readback.status === 200, `valid provenance readback HTTP ${readback.status}`);
  assert(readback.json?.rule?.vlmProvenance?.eventSource?.eventId === candidate.eventId, "readback lost event provenance");
  assert(readback.json?.rule?.vlmProvenance?.candidateSource?.candidateId === candidate.candidateId, "readback lost candidate provenance");
  assert(readback.json?.rule?.vlmProvenance?.evaluationSource?.provider === candidate.provider, "readback lost evaluation source");

  await stopServer();
  ports = { http: await freePort(), rtsp: await freePort() };
  serverProcess = startServer(ports);
  baseUrl = `http://127.0.0.1:${ports.http}`;
  await waitForHealth(baseUrl);
  const restartReadback = await request(baseUrl, "GET", "/lab/analysis/rules/701");
  assert(restartReadback.status === 200, `restart readback HTTP ${restartReadback.status}`);
  assert(JSON.stringify(restartReadback.json?.rule?.vlmProvenance) === JSON.stringify(valid.vlmProvenance),
    "restart readback changed canonical provenance");

  await stopServer();
  const reloadRegistry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  const reloadValid = buildRule("702", candidate.provenance);
  const reloadForged = buildRule("703", candidate.provenance);
  reloadForged.vlmProvenance.eventSource.eventId = "evt-reload-forged";
  reloadRegistry.rules.push(reloadValid, reloadForged);
  const duplicateReload = JSON.stringify(buildRule("704", candidate.provenance)).replace(
    `"candidateId":"${candidate.candidateId}"`,
    `"candidateId":"${candidate.candidateId}","candidateId":"candidate-reload-forged"`);
  const nestedReload = buildRule("705", candidate.provenance);
  const nestedProvenance = nestedReload.vlmProvenance;
  delete nestedReload.vlmProvenance;
  nestedReload.shadow = { vlmProvenance: nestedProvenance };
  let reloadRegistryText = `${JSON.stringify(reloadRegistry, null, 2)}\n`;
  reloadRegistryText = reloadRegistryText.replace(
    '"rules": [',
    `"rules": [\n${duplicateReload},\n${JSON.stringify(nestedReload)},`);
  fs.writeFileSync(registryPath, reloadRegistryText);

  ports = { http: await freePort(), rtsp: await freePort() };
  serverProcess = startServer(ports);
  baseUrl = `http://127.0.0.1:${ports.http}`;
  await waitForHealth(baseUrl);
  for (const id of ["701", "702"]) {
    assert((await request(baseUrl, "GET", `/lab/analysis/rules/${id}`)).status === 200,
      `${id} valid reload provenance was quarantined`);
  }
  for (const id of ["703", "704", "705"]) {
    assert((await request(baseUrl, "GET", `/lab/analysis/rules/${id}`)).status === 404,
      `${id} invalid reload provenance remained visible`);
  }

  const mutationCases = [
    ["event-id", provenance => { provenance.eventSource.eventId = "evt-forged"; }],
    ["observation-id", provenance => { provenance.eventSource.observationId = "vlmobs-forged"; }],
    ["source-id", provenance => { provenance.eventSource.sourceId = "forged-source"; }],
    ["event-source-schema", provenance => { provenance.eventSource.sourceSchema = "media-server.forged.v1"; }],
    ["candidate-id", provenance => { provenance.candidateSource.candidateId = "candidate-forged"; }],
    ["candidate-kind", provenance => { provenance.candidateSource.proposedRuleKind = "intrusion"; }],
    ["candidate-source", provenance => { provenance.candidateSource.source = "client-declared"; }],
    ["candidate-schema", provenance => { provenance.candidateSource.sourceSchema = "media-server.forged.v1"; }],
    ["candidate-route", provenance => { provenance.candidateSource.targetRoute = "/ops/forged"; }],
    ["evaluation-status", provenance => { provenance.evaluationSource.status = "passed"; }],
    ["evaluation-source", provenance => { provenance.evaluationSource.source = "client-declared"; }],
    ["provider", provenance => { provenance.evaluationSource.provider = "forged-provider"; }],
    ["model", provenance => { provenance.evaluationSource.model = "forged-model"; }],
    ["prompt-profile", provenance => { provenance.evaluationSource.promptProfile = "forged-prompt"; }],
    ["privacy-mode", provenance => { provenance.evaluationSource.privacyMode = "cloud-allowed"; }],
  ];
  let nextRuleId = 720;
  for (const [label, mutate] of mutationCases) {
    const id = String(nextRuleId++);
    const forged = buildRule(id, candidate.provenance);
    mutate(forged.vlmProvenance);
    const rejected = await request(baseUrl, "PUT", `/lab/analysis/rules/${id}`, forged);
    assert(rejected.status === 400 && rejected.text.includes("rule VLM provenance does not match server records"),
      `${label} forged provenance was not rejected: HTTP ${rejected.status} ${rejected.text}`);
    const absent = await request(baseUrl, "GET", `/lab/analysis/rules/${id}`);
    assert(absent.status === 404, `${label} forged provenance write was persisted`);
  }

  const duplicateCases = [
    ["event-id", "790", '"eventId"', candidate.eventId, '"eventId"'],
    ["provider", "791", '"provider"', candidate.provider, '"provider"'],
    ["escaped-provider", "793", '"provider"', candidate.provider, '"pr\\u006fvider"'],
  ];
  for (const [label, id, key, value, duplicateKey] of duplicateCases) {
    const raw = JSON.stringify(buildRule(id, candidate.provenance)).replace(
      `${key}:${JSON.stringify(value)}`,
      `${key}:${JSON.stringify(value)},${duplicateKey}:"forged-duplicate"`);
    const rejected = await request(baseUrl, "PUT", `/lab/analysis/rules/${id}`, raw);
    assert(rejected.status === 400 && rejected.text.includes("duplicate JSON key"),
      `${label} duplicate provenance field was not rejected`);
    assert((await request(baseUrl, "GET", `/lab/analysis/rules/${id}`)).status === 404,
      `${label} duplicate provenance field write was persisted`);
  }

  const nestedOnly = buildRule("792", candidate.provenance);
  const nestedOnlyProvenance = nestedOnly.vlmProvenance;
  delete nestedOnly.vlmProvenance;
  nestedOnly.shadow = { vlmProvenance: nestedOnlyProvenance };
  const rejectedNestedOnly = await request(baseUrl, "PUT", "/lab/analysis/rules/792", nestedOnly);
  assert(rejectedNestedOnly.status === 400 && rejectedNestedOnly.text.includes("must be top-level"),
    "nested-only vlmProvenance was treated as top-level authority");
  assert((await request(baseUrl, "GET", "/lab/analysis/rules/792")).status === 404,
    "nested-only vlmProvenance rule persisted");

  const observationBytes = fs.readFileSync(observationPath);
  fs.writeFileSync(observationPath, "");
  const deletedObservation = buildRule("770", candidate.provenance);
  const rejectedDeletedObservation = await request(baseUrl, "PUT", "/lab/analysis/rules/770", deletedObservation);
  assert(rejectedDeletedObservation.status === 400 && rejectedDeletedObservation.text.includes("rule VLM provenance does not match server records"),
    "deleted observation provenance was not rejected");
  assert((await request(baseUrl, "GET", "/lab/analysis/rules/770")).status === 404,
    "deleted observation provenance write was persisted");
  fs.writeFileSync(observationPath, observationBytes);

  const eventBytes = fs.readFileSync(eventPath);
  fs.writeFileSync(eventPath, "");
  const deletedEvent = buildRule("771", candidate.provenance);
  const rejectedDeletedEvent = await request(baseUrl, "PUT", "/lab/analysis/rules/771", deletedEvent);
  assert(rejectedDeletedEvent.status === 400 && rejectedDeletedEvent.text.includes("rule VLM provenance does not match server records"),
    "deleted EventRecord provenance was not rejected");
  assert((await request(baseUrl, "GET", "/lab/analysis/rules/771")).status === 404,
    "deleted EventRecord provenance write was persisted");
  fs.writeFileSync(eventPath, eventBytes);

  const wrongId = buildRule("780", candidate.provenance);
  wrongId.vlmProvenance.generatedRule.id = "701";
  const rejectedId = await request(baseUrl, "PUT", "/lab/analysis/rules/780", wrongId);
  assert(rejectedId.status === 400 && rejectedId.text.includes("generated rule id must match provenance"), "mismatched rule id was not rejected");
  const absentId = await request(baseUrl, "GET", "/lab/analysis/rules/780");
  assert(absentId.status === 404, "mismatched rule id write was persisted");

  const wrongRoute = buildRule("781", candidate.provenance);
  wrongRoute.vlmProvenance.generatedRule.saveApiRoute = "/lab/analysis/rules/999";
  const rejectedRoute = await request(baseUrl, "PUT", "/lab/analysis/rules/781", wrongRoute);
  assert(rejectedRoute.status === 400 && rejectedRoute.text.includes("generated rule save API route must match rule id"), "mismatched save route was not rejected");
  const absentRoute = await request(baseUrl, "GET", "/lab/analysis/rules/781");
  assert(absentRoute.status === 404, "mismatched save route write was persisted");

  const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  const persisted = registry.rules?.find(item => item.id === "701");
  assert(persisted?.vlmProvenance?.generatedRule?.saveApiRoute === "/lab/analysis/rules/701", "registry file lost save API provenance");

  await stopServer();
  fs.writeFileSync(observationPath, "");
  ports = { http: await freePort(), rtsp: await freePort() };
  serverProcess = startServer(ports);
  baseUrl = `http://127.0.0.1:${ports.http}`;
  await waitForHealth(baseUrl);
  assert((await request(baseUrl, "GET", "/lab/analysis/rules/701")).status === 404,
    "reload retained provenance after observation record deletion");
  await stopServer();
  fs.writeFileSync(observationPath, observationBytes);
  fs.writeFileSync(eventPath, "");
  ports = { http: await freePort(), rtsp: await freePort() };
  serverProcess = startServer(ports);
  baseUrl = `http://127.0.0.1:${ports.http}`;
  await waitForHealth(baseUrl);
  assert((await request(baseUrl, "GET", "/lab/analysis/rules/701")).status === 404,
    "reload retained provenance after EventRecord deletion");
  await stopServer();
  serverProcess = null;
  fs.writeFileSync(eventPath, eventBytes);

  console.log("== v3.9.0 VLM incident-to-rule provenance ==");
  console.log("- schema: media-server.vlm-incident-to-rule-provenance.v1");
  console.log("- event/candidate/evaluation source mapped: true");
  console.log("- generated rule/save API binding validator: true");
  console.log("- HTTP positive save/readback/restart cases: 3");
  console.log(`- forged field no-write cases: ${mutationCases.length}`);
  console.log(`- duplicate field no-write cases: ${duplicateCases.length}`);
  console.log("- nested-only provenance no-write cases: 1");
  console.log("- reload valid/forged/duplicate/nested cases: 5");
  console.log("- reload deleted observation/EventRecord quarantine cases: 2");
  console.log("- deleted observation/EventRecord no-write cases: 2");
  console.log("- generated rule binding no-write cases: 2");
  console.log("- failures: 0");
} finally {
  await stopServer();
  fs.rmSync(workDir, { recursive: true, force: true });
}

function prepareObservationFixture() {
  const fixture = JSON.parse(read("test/fixtures/vlm_rule_suggestion/cases.json"));
  const observations = fixture.cases?.[0]?.observations || [];
  assert(observations.length > 0, "VLM rule suggestion fixture observations are missing");
  fs.writeFileSync(observationPath, `${observations.map(item => JSON.stringify(item)).join("\n")}\n`);
  const observation = observations[0];
  const eventRecord = {
    schema: "media-server.va.event-record.v1",
    eventId: observation.eventId,
    eventType: "line-crossing",
    streamId: observation.sourceId,
    channelId: observation.sourceId,
    trackId: 1,
    classId: 0,
    className: "person",
    startTime: 1000,
    updateTime: 1100,
    endTime: 1200,
    status: "emitted",
    zoneId: "",
    lineId: "front-door-line",
    scenarioName: observation.scenarioId,
    scenarioPhase: "active",
    confidence: 0.91,
    snapshotPath: "",
    clipPath: "",
    preEventMs: 0,
    postEventMs: 0,
    metadata: { sourceId: observation.sourceId },
  };
  fs.writeFileSync(eventPath, `${JSON.stringify(eventRecord)}\n`);
}

function buildRule(id, provenance) {
  return {
    id,
    enabled: true,
    ruleKind: "event-template",
    analysis: { classes: ["person"] },
    event: { type: "line-crossing", minConfidence: 0.55, minDurationMs: 0 },
    vlmProvenance: {
      ...structuredClone(provenance),
      generatedRule: {
        id,
        saveApiRoute: `/lab/analysis/rules/${id}`,
        saveMethod: "PUT",
        manualSaveRequired: true,
      },
    },
  };
}

function startServer(ports) {
  const child = spawn("./server.sh", ["foreground"], {
    cwd: rootDir,
    env: {
      ...process.env,
      MEDIA_SERVER_SKIP_LOCAL_ENV: "1",
      MEDIA_SERVER_SKIP_BUILD: process.env.MEDIA_SERVER_SKIP_BUILD || "1",
      MEDIA_SERVER_AUTH_MODE: "off",
      MEDIA_SERVER_LISTEN_ADDRESS: "127.0.0.1",
      MEDIA_SERVER_HTTP_LISTEN_ADDRESS: "127.0.0.1",
      MEDIA_SERVER_LISTEN_PORT: String(ports.rtsp),
      MEDIA_SERVER_HTTP_LISTEN_PORT: String(ports.http),
      MEDIA_SERVER_ANALYSIS_REGISTRY: registryPath,
      MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_ENABLED: "1",
      MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_PATH: eventPath,
      MEDIA_SERVER_SOURCE_REGISTRY: path.join(workDir, "sources.json"),
      MEDIA_SERVER_PUBLISHED_VIEWS: path.join(workDir, "views.json"),
      MEDIA_SERVER_AUTH_USERS_FILE: path.join(workDir, "users.json"),
      MEDIA_SERVER_BUILD_DIR: process.env.MEDIA_SERVER_BUILD_DIR || path.join(rootDir, "build-gst-onnx"),
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
    serverLog.push(line.slice(0, 300));
    if (serverLog.length > 120) serverLog.shift();
  }
}

async function waitForHealth(baseUrl) {
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    if (serverProcess.exitCode !== null) throw new Error(`server exited early: ${serverLog.slice(-30).join(" | ")}`);
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {}
    await delay(200);
  }
  throw new Error(`server health timeout: ${serverLog.slice(-30).join(" | ")}`);
}

async function stopServer() {
  if (!serverProcess || serverProcess.exitCode !== null) return;
  serverProcess.kill("SIGTERM");
  await Promise.race([
    new Promise(resolve => serverProcess.once("exit", resolve)),
    delay(5000).then(() => { if (serverProcess.exitCode === null) serverProcess.kill("SIGKILL"); }),
  ]);
}

async function request(baseUrl, method, route, body) {
  const response = await fetch(`${baseUrl}${route}`, {
    method,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : (typeof body === "string" ? body : JSON.stringify(body)),
  });
  const text = await response.text();
  let json = {};
  try { json = JSON.parse(text); } catch {}
  return { status: response.status, text, json };
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(error => error ? reject(error) : resolve(port));
    });
  });
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
