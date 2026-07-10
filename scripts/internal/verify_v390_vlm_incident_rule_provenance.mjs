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
]) assert(files.server.includes(snippet), `rule save validator missing ${snippet}`);

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

try {
  prepareObservationFixture();
  const ports = { http: await freePort(), rtsp: await freePort() };
  serverProcess = startServer(ports);
  const baseUrl = `http://127.0.0.1:${ports.http}`;
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

  const wrongId = buildRule("702", candidate.provenance);
  wrongId.vlmProvenance.generatedRule.id = "701";
  const rejectedId = await request(baseUrl, "PUT", "/lab/analysis/rules/702", wrongId);
  assert(rejectedId.status === 400 && rejectedId.text.includes("generated rule id must match provenance"), "mismatched rule id was not rejected");
  const absentId = await request(baseUrl, "GET", "/lab/analysis/rules/702");
  assert(absentId.status === 404, "mismatched rule id write was persisted");

  const wrongRoute = buildRule("703", candidate.provenance);
  wrongRoute.vlmProvenance.generatedRule.saveApiRoute = "/lab/analysis/rules/999";
  const rejectedRoute = await request(baseUrl, "PUT", "/lab/analysis/rules/703", wrongRoute);
  assert(rejectedRoute.status === 400 && rejectedRoute.text.includes("generated rule save API route must match rule id"), "mismatched save route was not rejected");
  const absentRoute = await request(baseUrl, "GET", "/lab/analysis/rules/703");
  assert(absentRoute.status === 404, "mismatched save route write was persisted");

  const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  const persisted = registry.rules?.find(item => item.id === "701");
  assert(persisted?.vlmProvenance?.generatedRule?.saveApiRoute === "/lab/analysis/rules/701", "registry file lost save API provenance");

  console.log("== v3.9.0 VLM incident-to-rule provenance ==");
  console.log("- schema: media-server.vlm-incident-to-rule-provenance.v1");
  console.log("- event/candidate/evaluation source mapped: true");
  console.log("- generated rule/save API binding validator: true");
  console.log("- HTTP positive cases: 1");
  console.log("- HTTP negative no-write cases: 2");
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
    body: body === undefined ? undefined : JSON.stringify(body),
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
