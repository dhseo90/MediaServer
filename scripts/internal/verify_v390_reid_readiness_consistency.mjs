#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: V390-ADD1-04 Re-ID factory/Ops 공용 readiness와 실제 HTTP false-positive 행렬을 검증한다.

import { spawn, execFileSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { extractCppFunctionBlock } from "./source_block_assertion_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 Re-ID readiness consistency verification

Usage:
  ./server.sh verify-v390-reid-readiness-consistency

Checks:
  - factory and Ops API consume one server-owned readiness inspector.
  - regular file, SHA format/read/match, trimmed provenance, OpenSSL and ONNX Runtime gates are enforced.
  - the decision route reports preflight separately from extractor session-load/execution.
  - raw model path, checksum, provenance, embedding, crop, and identity material are not exposed.
`);
}
assertKnownOptions(rawArgs, ["h", "help"]);

const fixturePath = path.join(rootDir, "test/fixtures/v390_reid_readiness_consistency/cases.json");
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), `media-server-v390-reid-readiness-${process.pid}-`));
const modelPath = path.join(workDir, "model.onnx");
const modelDirectory = path.join(workDir, "model-directory");
const missingModelPath = path.join(workDir, "missing.onnx");
const provenance = "operator-secret-provenance-v390-add1-04";
let serverProcess = null;
let serverLog = [];

try {
  validateFixture();
  verifySourceContract();
  execFileSync(path.join(scriptDir, "verify_reid_readiness_smoke.sh"), [], {
    cwd: rootDir,
    stdio: "inherit",
  });
  fs.writeFileSync(modelPath, fixture.modelBytes);
  fs.mkdirSync(modelDirectory);
  assert(crypto.createHash("sha256").update(fixture.modelBytes).digest("hex") === fixture.modelSha256,
    "fixture model digest mismatch");

  for (const item of fixture.cases) {
    const ports = await freePortPair();
    const env = buildCaseEnv(item, ports);
    serverLog = [];
    serverProcess = startServer(env);
    const baseUrl = `http://127.0.0.1:${ports.http}`;
    await waitForHealth(baseUrl);
    const response = await request(baseUrl, "/ops/api/analysis/reid-assist-decision");
    verifyCaseResponse(item, response);
    console.log(`[pass] ${item.id}: ${item.reason}`);
    await stopServer();
    serverProcess = null;
    await delay(150);
  }

  console.log("");
  console.log("== v3.9.0 Re-ID readiness consistency ==");
  console.log(`- C++ capability matrices: 2`);
  console.log(`- actual HTTP cases: ${fixture.cases.length}`);
  console.log("- server-owned shared readiness: true");
  console.log("- preflight/session execution separated: true");
  console.log("- raw model material exposed: false");
  console.log("- failures: 0");
} finally {
  await stopServer();
  fs.rmSync(workDir, { recursive: true, force: true });
}

function validateFixture() {
  assert(fixture.schema === "media-server.v390-reid-readiness-consistency-fixtures.v1", "fixture schema mismatch");
  assert(fixture.targetStep === "V390-ADD1-04", "fixture target step mismatch");
  assert(Array.isArray(fixture.cases) && fixture.cases.length >= 10, "expected at least 10 readiness cases");
  assert(fixture.cases.filter(item => item.ready === true).length === 1, "expected one positive preflight case");
}

function verifySourceContract() {
  const header = read("include/analysis/appearance_extractor.h");
  const source = read("src/analysis/appearance_extractor.cpp");
  const applicationService = read("src/ingress/appearance_readiness_application_service.cpp");
  const readinessBlock = extractCppFunctionBlock(source, "AppearanceModelReadiness InspectAppearanceModelReadiness(");
  assert(readinessBlock.includes("model_backed_preflight_ready = true;"), "LAB-125 shared readiness model_backed_preflight_ready block readback mismatch");
  const server = readWebRtcHttpServerBundle(read);
  const ui = read("src/ingress/product_ui_page_scripts.cpp");
  for (const snippet of [
    "struct AppearanceModelReadiness",
    "InspectAppearanceModelReadiness",
    "model_file_regular",
    "checksum_format_valid",
    "openssl_runtime_available",
    "checksum_matches",
    "provenance_configured",
    "onnxruntime_available",
    "model_backed_preflight_ready",
    "fallback_reason",
  ]) assert(header.includes(snippet), `readiness header missing ${snippet}`);
  assert(source.includes("const auto readiness = InspectAppearanceModelReadiness(options);"),
    "extractor factory does not consume shared readiness");
  assert(applicationService.includes("analysis::InspectAppearanceModelReadiness(options)"),
    "application service does not consume shared readiness");
  assert(server.includes("InspectAppearanceReadiness(appearance_request)") &&
    !server.includes("analysis::AppearanceExtractorOptions appearance_options") &&
    !server.includes("analysis::InspectAppearanceModelReadiness(appearance_options)"),
  "Ops route does not consume application readiness boundary");
  for (const field of [
    "analysis_appearance_enabled", "analysis_appearance_extractor",
    "analysis_appearance_model_path", "analysis_appearance_model_sha256",
    "analysis_appearance_model_provenance", "analysis_appearance_input_width",
    "analysis_appearance_input_height", "analysis_appearance_max_embedding_dim",
    "analysis_appearance_log_enabled", "analysis_appearance_async_enabled",
    "analysis_appearance_max_queue", "analysis_appearance_global_max_queue",
    "analysis_appearance_per_stream_rate_limit_ms", "analysis_appearance_max_job_age_ms",
  ]) assert(server.includes(`config.${field}`), `Ops readiness runtime mapping missing ${field}`);
  for (const snippet of [
    "modelBackedPreflightReady",
    "modelSessionLoadValidated",
    "modelFileExists",
    "modelFileRegular",
    "modelChecksumFormatValid",
    "openSslRuntimeAvailable",
    "modelChecksumReadable",
    "modelChecksumMatches",
    "provenanceValidationScope",
    "onnxRuntimeAvailable",
    "readinessReason",
    "modelPathExposed",
    "modelChecksumExposed",
    "modelProvenanceExposed",
  ]) assert(server.includes(snippet), `Ops readiness response missing ${snippet}`);
  for (const snippet of ["preflight ready", "session not tested by route", "readinessReason", "shaMatch", "OpenSSL", "ONNX"])
    assert(ui.includes(snippet), `Ops UI readiness evidence missing ${snippet}`);
}

function buildCaseEnv(item, ports) {
  const env = {
    ...process.env,
    MEDIA_SERVER_SKIP_LOCAL_ENV: "1",
    MEDIA_SERVER_SKIP_BUILD: "1",
    MEDIA_SERVER_BUILD_DIR: process.env.MEDIA_SERVER_BUILD_DIR || path.join(rootDir, "build-gst-onnx"),
    MEDIA_SERVER_AUTH_MODE: "off",
    MEDIA_SERVER_LISTEN_ADDRESS: "127.0.0.1",
    MEDIA_SERVER_HTTP_LISTEN_ADDRESS: "127.0.0.1",
    MEDIA_SERVER_LISTEN_PORT: String(ports.rtsp),
    MEDIA_SERVER_HTTP_LISTEN_PORT: String(ports.http),
    MEDIA_SERVER_ANALYSIS_REGISTRY: path.join(workDir, `analysis-${item.id}.json`),
    MEDIA_SERVER_SOURCE_REGISTRY: path.join(workDir, `sources-${item.id}.json`),
    MEDIA_SERVER_PUBLISHED_VIEWS: path.join(workDir, `views-${item.id}.json`),
    MEDIA_SERVER_AUTH_USERS_FILE: path.join(workDir, `users-${item.id}.json`),
    MEDIA_SERVER_ANALYSIS_APPEARANCE_ENABLED: "1",
    MEDIA_SERVER_ANALYSIS_APPEARANCE_EXTRACTOR: "onnx-reid",
    MEDIA_SERVER_ANALYSIS_APPEARANCE_MODEL: modelPath,
    MEDIA_SERVER_ANALYSIS_APPEARANCE_MODEL_SHA256: fixture.modelSha256,
    MEDIA_SERVER_ANALYSIS_APPEARANCE_MODEL_PROVENANCE: provenance,
  };
  switch (item.mutation) {
    case "disabled": env.MEDIA_SERVER_ANALYSIS_APPEARANCE_ENABLED = "0"; break;
    case "noop": env.MEDIA_SERVER_ANALYSIS_APPEARANCE_EXTRACTOR = "noop"; break;
    case "empty-path": env.MEDIA_SERVER_ANALYSIS_APPEARANCE_MODEL = ""; break;
    case "missing-file": env.MEDIA_SERVER_ANALYSIS_APPEARANCE_MODEL = missingModelPath; break;
    case "directory": env.MEDIA_SERVER_ANALYSIS_APPEARANCE_MODEL = modelDirectory; break;
    case "empty-checksum": env.MEDIA_SERVER_ANALYSIS_APPEARANCE_MODEL_SHA256 = ""; break;
    case "invalid-checksum": env.MEDIA_SERVER_ANALYSIS_APPEARANCE_MODEL_SHA256 = "not-a-sha256"; break;
    case "whitespace-provenance": env.MEDIA_SERVER_ANALYSIS_APPEARANCE_MODEL_PROVENANCE = "  \t  "; break;
    case "checksum-mismatch": env.MEDIA_SERVER_ANALYSIS_APPEARANCE_MODEL_SHA256 = "0".repeat(64); break;
    case "valid": break;
    default: throw new Error(`unknown mutation ${item.mutation}`);
  }
  return env;
}

function startServer(env) {
  const child = spawn("./server.sh", ["foreground"], { cwd: rootDir, env, stdio: ["ignore", "pipe", "pipe"] });
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
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (serverProcess.exitCode !== null) throw new Error(`server exited early: ${serverLog.join(" | ")}`);
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) return;
    } catch {}
    await delay(100);
  }
  throw new Error(`server health timeout: ${serverLog.join(" | ")}`);
}

async function request(baseUrl, route) {
  const response = await fetch(`${baseUrl}${route}`);
  const text = await response.text();
  return { status: response.status, text, json: JSON.parse(text) };
}

function verifyCaseResponse(item, response) {
  assert(response.status === 200, `${item.id}: HTTP ${response.status}`);
  const gate = response.json.reidAssistRuntimeGate || {};
  const summary = response.json.reidAssistDecisionSummary || {};
  const ready = item.ready === true;
  assert(gate.readinessAuthority === "analysis::InspectAppearanceModelReadiness", `${item.id}: wrong authority`);
  assert(gate.readinessReason === item.reason, `${item.id}: expected ${item.reason}, got ${gate.readinessReason}`);
  assert(gate.modelBackedPreflightReady === ready, `${item.id}: wrong preflight result`);
  assert(summary.modelBackedPreflightReady === ready, `${item.id}: summary preflight drift`);
  assert(gate.modelSessionLoadValidated === false, `${item.id}: route claimed session validation`);
  assert(gate.modelBackedExecutionReady === false, `${item.id}: route claimed execution readiness`);
  assert(summary.modelBackedExecutionReady === false, `${item.id}: summary claimed execution readiness`);
  const modelBackedExecutionPerformed = response.json.boundaries?.modelBackedExecutionPerformed;
  const modelBackedExecutionPrevented = modelBackedExecutionPerformed === false;
  const eventPostPayloadChanged = response.json.boundaries?.eventPostPayloadChanged;
  const clientViewerExposureAdded = response.json.boundaries?.clientViewerExposureAdded;
  const rawMaterialExposed = [modelPath, modelDirectory, missingModelPath, fixture.modelSha256,
    ...fixture.forbiddenResponseValues].some((forbidden) => response.text.includes(forbidden));
  assert(modelBackedExecutionPrevented && modelBackedExecutionPerformed === false &&
    eventPostPayloadChanged === false && clientViewerExposureAdded === false && rawMaterialExposed === false,
  `${item.id}: execution/privacy boundary drift`);
  assert(response.json.boundaries?.modelSessionLoadPerformed === false, `${item.id}: session boundary drift`);
  assert(response.json.boundaries?.modelPathExposed === false, `${item.id}: path boundary drift`);
  assert(response.json.boundaries?.modelChecksumExposed === false, `${item.id}: checksum boundary drift`);
  assert(response.json.boundaries?.modelProvenanceExposed === false, `${item.id}: provenance boundary drift`);
  for (const forbidden of [modelPath, modelDirectory, missingModelPath, fixture.modelSha256, ...fixture.forbiddenResponseValues])
    assert(!response.text.includes(forbidden), `${item.id}: raw model material exposed`);
  if (ready) {
    for (const field of [
      "appearanceEnabled", "onnxReidExtractorSelected", "modelPathConfigured", "modelFileExists",
      "modelFileRegular", "modelChecksumConfigured", "modelChecksumFormatValid", "openSslRuntimeAvailable",
      "modelChecksumReadable", "modelChecksumMatches", "modelProvenanceConfigured", "onnxRuntimeAvailable",
    ]) assert(gate[field] === true, `${item.id}: ${field} must be true`);
    assert(gate.fallbackMode === "preflight-ready-session-not-validated", `${item.id}: wrong ready mode`);
  } else {
    assert(gate.fallbackMode === "no-op-visible", `${item.id}: false-ready fallback drift`);
  }
}

async function stopServer() {
  if (!serverProcess || serverProcess.exitCode !== null) return;
  const child = serverProcess;
  const exited = new Promise(resolve => child.once("exit", resolve));
  serverProcess.kill("SIGTERM");
  const terminated = await Promise.race([exited.then(() => true), delay(3000).then(() => false)]);
  if (!terminated && child.exitCode === null) {
    child.kill("SIGKILL");
    await Promise.race([exited, delay(3000)]);
  }
}

async function freePortPair() {
  const http = await freePort();
  let rtsp = await freePort();
  while (rtsp === http) rtsp = await freePort();
  return { http, rtsp };
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

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
