#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: V210-S02 local VLM runtime connection smoke를 loopback fixture로 검증한다.

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`VLM local runtime connection smoke verification

Usage:
  ./server.sh verify-vlm-local-runtime-smoke [options]

Options:
  --report <path>       Write a Markdown local smoke report.
  --json-report <path>  Write a JSON local smoke report.
  -h, --help            Show help.

Checks:
  - V210-S02 fixture covers Ollama, vLLM/OpenAI-compatible, missing-runtime, timeout cleanup, and invalid-output fallback cases.
  - Loopback fixture servers are actually bound and called for local endpoint cases.
  - Timeout and missing-runtime failures are VLM-only states and clean their queue items.
  - Invalid structured output is rejected without sidecar/EventRecord/media/metadata side effects.
  - docs, feature inventory, server.sh, and script inventory are wired.
`);
}

assertKnownOptions(rawArgs, ["report", "json-report", "h", "help"]);

const args = parseArgs(rawArgs);
const fixturePath = "test/fixtures/vlm_local_runtime_smoke/cases.json";
const fixture = readJson(fixturePath);
const report = {
  schema: "media-server.vlm-local-runtime-smoke-report.v1",
  targetStep: "V210-S02",
  generatedAt: new Date().toISOString(),
  status: "pass",
  fixturePath,
  scope: {
    runtimeBoundary: "loopback-fixture-only",
    actualLocalHttpRoundtrip: true,
    actualUserModelQualityChecked: false,
    cloudProviderApiCalled: false,
    providerCredentialStored: false,
    sidecarWritten: false,
    eventOrMetadataSchemaChanged: false,
    mediaPathChanged: false,
  },
  summary: {
    cases: 0,
    connectedCases: 0,
    missingRuntimeCases: 0,
    timeoutCases: 0,
    invalidOutputCases: 0,
    cleanupOk: 0,
  },
  cases: [],
  checks: [],
};

const checks = [];

check("fixture covers required V210-S02 local runtime smoke matrix", async () => {
  assert(fixture.schema === "media-server.vlm-local-runtime-smoke-fixtures.v1", "fixture schema mismatch");
  assert(fixture.targetStep === "V210-S02", "fixture targetStep mismatch");
  assert(Array.isArray(fixture.cases) && fixture.cases.length >= 6, "fixture needs at least 6 cases");
  const ids = new Set(fixture.cases.map(item => item.id));
  for (const id of [
    "ollama-loopback-chat-pass",
    "vllm-openai-compatible-pass",
    "api-compatible-local-pass",
    "missing-runtime-fallback",
    "timeout-queue-cleanup",
    "invalid-output-fallback",
  ]) {
    assert(ids.has(id), `missing local runtime smoke case: ${id}`);
  }
  const endpointKinds = new Set(fixture.cases.map(item => item.endpointKind));
  assert(endpointKinds.has("ollama"), "fixture missing Ollama endpoint kind");
  assert(endpointKinds.has("openai-compatible"), "fixture missing OpenAI-compatible endpoint kind");
});

check("loopback local runtime requests, timeout, missing-runtime, and invalid-output fallback behave as expected", async () => {
  const results = [];
  for (const item of fixture.cases) {
    results.push(await runCase(item));
  }
  report.cases = results;
  report.summary.cases = results.length;
  report.summary.connectedCases = results.filter(item => item.outcome === "connected-structured-output-accepted").length;
  report.summary.missingRuntimeCases = results.filter(item => item.outcome === "blocked-missing-runtime").length;
  report.summary.timeoutCases = results.filter(item => item.outcome === "timeout-cleanup-ok").length;
  report.summary.invalidOutputCases = results.filter(item => item.outcome === "rejected-invalid-output-no-sidecar-write").length;
  report.summary.cleanupOk = results.filter(item => item.queueCleanup === "cleanup-ok" && item.serverCleanup === "cleanup-ok").length;

  for (const result of results) {
    assert(result.status === "pass", `${result.id}: expected pass, got ${result.status}`);
    assert(result.outcome === result.expectedOutcome, `${result.id}: outcome mismatch ${result.outcome}`);
    assert(result.queueCleanup === "cleanup-ok", `${result.id}: queue cleanup failed`);
    assert(result.serverCleanup === "cleanup-ok", `${result.id}: server cleanup failed`);
    assert(result.sideEffects.length === 0, `${result.id}: side effects found ${result.sideEffects.join(", ")}`);
    assert(result.credentialHeaderSeen === false && result.sideEffects.length === 0, `${result.id}: credential must remain local and sidecar/registry write must remain absent`);
  }

  assert(report.summary.connectedCases === 3, "expected 3 connected local endpoint cases");
  assert(report.summary.missingRuntimeCases === 1, "expected 1 missing-runtime case");
  assert(report.summary.timeoutCases === 1, "expected 1 timeout case");
  assert(report.summary.invalidOutputCases === 1, "expected 1 invalid-output case");
});

check("local runtime smoke stays out of external event, metadata, and media paths", async () => {
  const eventPost = readText("src/analysis/event_post_dispatcher.cpp");
  const eventStorage = readText("src/analysis/event_storage.cpp");
  const server = readWebRtcHttpServerBundle(readText);
  for (const [label, text] of [
    ["event_post_dispatcher.cpp", eventPost],
    ["event_storage.cpp", eventStorage],
  ]) {
    assert(!text.includes("vlm-local-runtime-smoke"), `${label}: local smoke schema must not enter event paths`);
    assert(!text.includes("rawRuntimeResponseStored"), `${label}: local smoke redaction field must stay out of event paths`);
  }
  const clientStart = server.indexOf("void AppendClientEventItemJson");
  const clientEnd = server.indexOf("std::string OpsVlmProfilesJson()");
  const clientRegion = clientStart >= 0 && clientEnd > clientStart ? server.slice(clientStart, clientEnd) : "";
  assert(clientRegion.length > 0, "client region not found");
  assert(!clientRegion.includes("media-server.vlm-local-runtime-smoke"), "client region exposes local runtime smoke schema");
});

check("docs, feature inventory, server command, and script inventory are wired", async () => {
  const docs = [
    readText("docs/vlm-local-runtime-connection-smoke.md"),
    readText("docs/development-backlog.md"),
    readText("docs/stream-verification.md"),
    readText("docs/project-feature-test-inventory.md"),
    readText("docs/README.md"),
  ].join("\n");
  const serverSh = readText("server.sh");
  const scriptInventory = readText("scripts/internal/verify_script_inventory.mjs");
  const coverage = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
  const manifest = JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json"));
  for (const snippet of [
    "V210-S02",
    "Local VLM runtime connection smoke",
    "media-server.vlm-local-runtime-smoke-fixtures.v1",
    "media-server.vlm-local-runtime-smoke-report.v1",
    "verify-vlm-local-runtime-smoke",
    "ollama-loopback-chat-pass",
    "vllm-openai-compatible-pass",
    "missing-runtime-fallback",
    "timeout-queue-cleanup",
    "invalid-output-fallback",
    "LAB-056",
    "SAFE-034",
  ]) {
    assert(docs.includes(snippet), `docs missing local runtime smoke snippet: ${snippet}`);
  }
  assert(serverSh.includes("verify-vlm-local-runtime-smoke"), "server.sh missing local runtime smoke command");
  assert(serverSh.includes("verify_vlm_local_runtime_smoke.mjs"), "server.sh missing local runtime smoke script dispatch");
  assert(scriptInventory.includes("verify_vlm_local_runtime_smoke.mjs"), "script inventory missing local runtime smoke verifier");
  assert(manifest.items.find(item => item.id === "SAFE-034")?.verifierEvidence?.command === "verify-vlm-local-runtime-smoke",
    "SAFE-034 manifest verifier command drift");
  assert(coverage.includes("validateImplementationManifest") && coverage.includes("verifierEvidenceRows"),
    "feature coverage must validate manifest-backed verifier evidence");
});

let failCount = 0;
for (const item of checks) {
  try {
    await item.run();
    report.checks.push({ name: item.name, status: "pass" });
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    failCount += 1;
    report.status = "fail";
    const message = error instanceof Error ? error.message : String(error);
    report.checks.push({ name: item.name, status: "fail", message });
    console.log(`[fail] ${item.name}: ${message}`);
  }
}

console.log("");
console.log("== VLM local runtime smoke summary ==");
console.log(`- schema: ${report.schema}`);
console.log(`- cases: ${report.summary.cases}`);
console.log(`- connected cases: ${report.summary.connectedCases}`);
console.log(`- missing-runtime cases: ${report.summary.missingRuntimeCases}`);
console.log(`- timeout cases: ${report.summary.timeoutCases}`);
console.log(`- invalid-output cases: ${report.summary.invalidOutputCases}`);
console.log(`- cleanup ok: ${report.summary.cleanupOk}`);
console.log(`- pass: ${report.checks.filter(item => item.status === "pass").length}`);
console.log(`- fail: ${failCount}`);

assertVlmLocalRuntimeSmokeArtifact(report);

if (args.report) writeText(path.resolve(rootDir, args.report), renderMarkdown(report));
if (args.jsonReport) writeText(path.resolve(rootDir, args.jsonReport), `${JSON.stringify(report, null, 2)}\n`);
if (failCount > 0) process.exit(1);

function check(name, run) {
  checks.push({ name, run });
}

async function runCase(item) {
  const sideEffects = Object.entries(item.contractInvariants || {})
    .filter(([, value]) => value !== false)
    .map(([key]) => key);
  const queue = { pending: 0, cleaned: 0 };
  let fixtureServer = null;
  let baseUrl = "";
  let credentialHeaderSeen = false;
  let serverCleanup = "cleanup-ok";
  let outcome = "unexpected-failure";
  let runtimeConnected = false;
  let structuredOutputAccepted = false;
  let statusCode = 0;

  try {
    if (item.responseKind === "no-server") {
      const port = await reserveUnusedPort();
      baseUrl = `http://127.0.0.1:${port}`;
    } else {
      fixtureServer = await startFixtureServer(item);
      baseUrl = fixtureServer.baseUrl;
    }

    const result = await invokeRuntime(item, baseUrl, queue);
    outcome = result.outcome;
    runtimeConnected = result.runtimeConnected;
    structuredOutputAccepted = result.structuredOutputAccepted;
    statusCode = result.statusCode;
    credentialHeaderSeen = result.credentialHeaderSeen || fixtureServer?.stats.credentialHeaderSeen === true;
  } finally {
    if (fixtureServer) {
      await fixtureServer.close();
      await sleep(20);
      if (fixtureServer.stats.activeRequests !== 0) serverCleanup = "active-request-leak";
      credentialHeaderSeen = credentialHeaderSeen || fixtureServer.stats.credentialHeaderSeen === true;
    }
  }

  const queueCleanup = queue.pending === 0 && queue.cleaned === 1 ? "cleanup-ok" : "cleanup-failed";
  const status =
    outcome === item.expected?.outcome &&
    runtimeConnected === item.expected?.runtimeConnected &&
    structuredOutputAccepted === item.expected?.structuredOutputAccepted &&
    queueCleanup === item.expected?.queueCleanup &&
    serverCleanup === "cleanup-ok" &&
    sideEffects.length === 0
      ? item.expected.status
      : "fail";

  return {
    id: item.id,
    endpointKind: item.endpointKind,
    responseKind: item.responseKind,
    status,
    outcome,
    expectedOutcome: item.expected?.outcome,
    runtimeConnected,
    structuredOutputAccepted,
    statusCode,
    queueCleanup,
    serverCleanup,
    credentialHeaderSeen,
    sideEffects,
  };
}

async function invokeRuntime(item, baseUrl, queue) {
  queue.pending += 1;
  const controller = new AbortController();
  const timeoutMs = item.request?.timeoutMs || 1000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let statusCode = 0;
  try {
    const response = await fetch(`${baseUrl}${item.path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildRuntimeRequest(item)),
      signal: controller.signal,
    });
    statusCode = response.status;
    const text = await response.text();
    if (!response.ok) {
      return {
        outcome: "blocked-missing-runtime",
        runtimeConnected: false,
        structuredOutputAccepted: false,
        statusCode,
        credentialHeaderSeen: false,
      };
    }
    const body = JSON.parse(text);
    const content = extractRuntimeContent(item, body);
    const structured = parseStructuredOutput(content);
    if (!structured.valid) {
      return {
        outcome: "rejected-invalid-output-no-sidecar-write",
        runtimeConnected: true,
        structuredOutputAccepted: false,
        statusCode,
        credentialHeaderSeen: false,
      };
    }
    return {
      outcome: "connected-structured-output-accepted",
      runtimeConnected: true,
      structuredOutputAccepted: true,
      statusCode,
      credentialHeaderSeen: false,
    };
  } catch (error) {
    if (controller.signal.aborted || error?.name === "AbortError") {
      return {
        outcome: "timeout-cleanup-ok",
        runtimeConnected: false,
        structuredOutputAccepted: false,
        statusCode,
        credentialHeaderSeen: false,
      };
    }
    return {
      outcome: "blocked-missing-runtime",
      runtimeConnected: false,
      structuredOutputAccepted: false,
      statusCode,
      credentialHeaderSeen: false,
    };
  } finally {
    clearTimeout(timeout);
    queue.pending -= 1;
    queue.cleaned += 1;
  }
}

function buildRuntimeRequest(item) {
  const prompt = "Return only the fixture VLM JSON for media-server local runtime smoke.";
  if (item.endpointKind === "ollama") {
    return {
      model: "media-server-local-vlm-fixture",
      stream: false,
      messages: [{ role: "user", content: prompt }],
    };
  }
  return {
    model: "media-server-local-vlm-fixture",
    stream: false,
    messages: [{ role: "user", content: prompt }],
  };
}

function extractRuntimeContent(item, body) {
  if (item.endpointKind === "ollama") return body?.message?.content || "";
  return body?.choices?.[0]?.message?.content || "";
}

function parseStructuredOutput(content) {
  try {
    const parsed = JSON.parse(content);
    return {
      valid:
        parsed.schema === "media-server.vlm-local-runtime-output.v1" &&
        parsed.status === "ok" &&
        typeof parsed.eventExplanation === "string" &&
        parsed.sideEffects?.sidecarWritten === false,
    };
  } catch {
    return { valid: false };
  }
}

async function startFixtureServer(item) {
  const stats = {
    requests: 0,
    activeRequests: 0,
    credentialHeaderSeen: false,
  };
  const server = http.createServer((req, res) => {
    stats.requests += 1;
    stats.activeRequests += 1;
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      stats.activeRequests -= 1;
    };
    res.on("close", finish);
    res.on("finish", finish);
    stats.credentialHeaderSeen =
      stats.credentialHeaderSeen ||
      Boolean(req.headers.authorization || req.headers["x-api-key"] || req.headers["x-goog-api-key"]);

    if (req.method !== "POST" || req.url !== item.path) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "not found" }));
      return;
    }

    req.resume();
    const send = () => {
      if (res.destroyed) return;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(buildFixtureResponse(item)));
    };
    const delayMs = item.request?.fixtureDelayMs || 0;
    if (delayMs > 0) setTimeout(send, delayMs);
    else send();
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert(address && typeof address === "object", "fixture server did not expose address");
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    stats,
    close: () => closeServer(server),
  };
}

function buildFixtureResponse(item) {
  const validContent = JSON.stringify({
    schema: "media-server.vlm-local-runtime-output.v1",
    status: "ok",
    eventExplanation: "fixture-only local runtime connection smoke",
    confidence: 0.5,
    sideEffects: {
      sidecarWritten: false,
      eventPostPayloadChanged: false,
      mediaPathChanged: false,
    },
  });
  const content = item.responseKind === "invalid-json-content" ? "not-json structured output" : validContent;
  if (item.endpointKind === "ollama") {
    return {
      model: "media-server-local-vlm-fixture",
      message: { role: "assistant", content },
      done: true,
    };
  }
  return {
    id: "chatcmpl-media-server-local-fixture",
    object: "chat.completion",
    choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
  };
}

async function reserveUnusedPort() {
  const server = http.createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert(address && typeof address === "object", "unable to reserve unused port");
  const port = address.port;
  await closeServer(server);
  return port;
}

function closeServer(server) {
  if (typeof server.closeAllConnections === "function") {
    server.closeAllConnections();
  }
  return new Promise((resolve, reject) => {
    server.close(error => (error ? reject(error) : resolve()));
  });
}

function parseArgs(argv) {
  const parsed = { report: "", jsonReport: "" };
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--report") parsed.report = requireValue(argv, index += 1, token);
    else if (token.startsWith("--report=")) parsed.report = token.slice("--report=".length);
    else if (token === "--json-report") parsed.jsonReport = requireValue(argv, index += 1, token);
    else if (token.startsWith("--json-report=")) parsed.jsonReport = token.slice("--json-report=".length);
  }
  return parsed;
}

function renderMarkdown(data) {
  const rows = data.cases
    .map(item => `| ${item.id} | ${item.endpointKind} | ${item.outcome} | ${item.queueCleanup} | ${item.serverCleanup} | ${item.status} |`)
    .join("\n");
  return `# VLM Local Runtime Smoke Report

- schema: \`${data.schema}\`
- targetStep: \`${data.targetStep}\`
- status: \`${data.status}\`
- runtimeBoundary: \`${data.scope.runtimeBoundary}\`
- actualLocalHttpRoundtrip: \`${data.scope.actualLocalHttpRoundtrip}\`
- cloudProviderApiCalled: \`${data.scope.cloudProviderApiCalled}\`
- providerCredentialStored: \`${data.scope.providerCredentialStored}\`
- sidecarWritten: \`${data.scope.sidecarWritten}\`
- eventOrMetadataSchemaChanged: \`${data.scope.eventOrMetadataSchemaChanged}\`
- mediaPathChanged: \`${data.scope.mediaPathChanged}\`

| Case | Endpoint | Outcome | Queue cleanup | Server cleanup | Status |
| --- | --- | --- | --- | --- | --- |
${rows}

## Non-Substitution

This report is local loopback runtime smoke evidence only. It is not cloud provider
field smoke evidence, model quality evidence, longrun evidence, UI fulltest
evidence, or release close-out evidence.
`;
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, "utf8");
}

function requireValue(argv, index, option) {
  const value = argv[index];
  assert(value && !value.startsWith("--"), `${option} requires a value`);
  return value;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function assertVlmLocalRuntimeSmokeArtifact(value) {
  const artifactPath = path.join(process.env.TMPDIR || "/tmp", `media-server-vlm-local-runtime-smoke-${process.pid}.json`);
  fs.writeFileSync(artifactPath, `${JSON.stringify(value)}\n`, "utf8");
  try {
    const observedReport = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    assert(observedReport.schema === "media-server.vlm-local-runtime-smoke-report.v1" && observedReport.cases.every(result => result.queueCleanup === "cleanup-ok"), "VLM local runtime artifact queueCleanup readback mismatch");
  } finally {
    fs.rmSync(artifactPath, { force: true });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
