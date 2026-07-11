#!/usr/bin/env node
// 파일 용도: V390-REVIEW2-21 Analysis Registry 실패 전파와 persist-before-publish를 actual HTTP로 검증한다.

import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 Analysis Registry durable write verification

Usage:
  ./server.sh verify-v390-analysis-registry-durable-write

Checks:
  - profile/rule/VA rule/VLM profile create, update, and delete use persist-before-publish.
  - parent/open/short-write/flush/rename failures return HTTP 500 with a typed safe stage.
  - failed mutations preserve memory GET, registry bytes, restart state, and remove temp files.
`);
}
assertKnownOptions(rawArgs, ["h", "help"]);

const fixturePath = path.join(rootDir, "test/fixtures/v390_analysis_registry_durable_write/cases.json");
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const featureIds = ["SAFE-217", "OPS-184"];
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), `media-server-v390-analysis-durable-${process.pid}-`));
const baselinePath = path.join(workDir, "baseline", "analysis.json");
const serverLog = [];
let serverProcess = null;
let baseUrl = "";

try {
  validateFixture();
  verifySourceContract();
  const baselineBytes = await createBaseline();
  const stages = [...new Set(fixture.cases.map(item => item.faultStage))];
  for (const stage of stages) {
    await runFailureStage(stage, fixture.cases.filter(item => item.faultStage === stage), baselineBytes);
  }
  assert(findTemporaryFiles(workDir).length === 0,
    `temporary registry files remain: ${findTemporaryFiles(workDir).join(", ")}`);
  console.log("");
  console.log("== v3.9.0 Analysis Registry durable write ==");
  console.log(`- schema: ${fixture.schema}`);
  console.log(`- mutation cases: ${fixture.cases.length}`);
  console.log(`- failure stages: ${fixture.failureStages.join(",")}`);
  console.log("- http5xxOnPersistenceFailure: true");
  console.log("- memoryFileRestartNoChange: true");
  console.log("- temporaryFiles: 0");
  console.log("- failures: 0");
} finally {
  await stopServer();
  fs.rmSync(workDir, { recursive: true, force: true });
}

function validateFixture() {
  assert(fixture.schema === "media-server.v390-analysis-registry-durable-write-fixtures.v1", "fixture schema mismatch");
  assert(fixture.targetStep === "V390-REVIEW2-21", "fixture targetStep mismatch");
  assert(Array.isArray(fixture.cases) && fixture.cases.length === 12, "expected twelve mutation cases");
  assert(JSON.stringify(fixture.failureStages) === JSON.stringify(["parent", "open", "write", "flush", "rename"]),
    "failure stage set mismatch");
  assert(featureIds.length === 2, "V390-REVIEW2-21 feature mapping mismatch");
  for (const kind of ["profile", "rule", "vaRule", "vlmProfile"]) {
    for (const mutation of ["create", "update", "delete"]) {
      assert(fixture.cases.some(item => item.kind === kind && item.mutation === mutation),
        `missing ${kind} ${mutation} case`);
    }
  }
}

function verifySourceContract() {
  const server = read("src/ingress/webrtc_http_server.cpp");
  for (const snippet of [
    "AnalysisRegistryWriteResult",
    "AnalysisRegistryMutationFailure::Persistence",
    "PersistAndPublishLocked",
    "MEDIA_SERVER_ANALYSIS_REGISTRY_FAULT_STAGE",
    "analysis-registry-persistence-failed",
    "WriteAnalysisRegistryFileAtomically",
  ]) assert(server.includes(snippet), `durable write source contract missing ${snippet}`);
  assert(!/void\s+SaveLocked\s*\(/.test(server), "legacy void SaveLocked remains");
}

async function createBaseline() {
  fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
  const ports = await freePortPair();
  baseUrl = `http://127.0.0.1:${ports.http}`;
  serverProcess = startServer(ports, baselinePath, "");
  await waitForHealth();
  await expectSuccess("PUT", "/lab/analysis/profiles/601", profilePayload("601", "baseline"), 200);
  await expectSuccess("PUT", "/lab/analysis/rules/701", rulePayload("701", "baseline"), 200);
  await expectSuccess("PUT", "/lab/analysis/va-rules/801", vaRulePayload("801", "baseline"), 200);
  await expectSuccess("PUT", "/ops/api/vlm/profiles/vlm-durable-base", vlmProfilePayload("vlm-durable-base", "baseline"), 200);
  await stopServer();
  serverProcess = null;
  assert(fs.existsSync(baselinePath), "baseline registry file missing");
  return fs.readFileSync(baselinePath);
}

async function runFailureStage(stage, cases, baselineBytes) {
  const stageDir = path.join(workDir, `stage-${stage}`);
  fs.mkdirSync(stageDir, { recursive: true });
  let registryPath = path.join(stageDir, "analysis.json");
  if (stage === "parent") {
    const blocker = path.join(stageDir, "not-a-directory");
    fs.writeFileSync(blocker, "parent-blocker\n");
    registryPath = path.join(blocker, "analysis.json");
  } else {
    fs.writeFileSync(registryPath, baselineBytes);
  }
  const ports = await freePortPair();
  baseUrl = `http://127.0.0.1:${ports.http}`;
  serverProcess = startServer(ports, registryPath, stage === "parent" ? "" : stage);
  await waitForHealth();
  const before = await registrySnapshot();
  const bytesBefore = fs.existsSync(registryPath) ? fs.readFileSync(registryPath) : null;
  for (const item of cases) {
    const response = await request(item.method, item.route, payloadFor(item));
    assert(response.status === 500, `${item.id}: expected HTTP 500, got ${response.status}: ${response.text}`);
    assert(response.json.code === "analysis-registry-persistence-failed", `${item.id}: persistence code missing`);
    assert(response.json.stage === stage, `${item.id}: expected stage ${stage}, got ${response.json.stage}`);
    assert(!response.text.includes(registryPath), `${item.id}: response exposed storage path`);
    assert(JSON.stringify(await registrySnapshot()) === JSON.stringify(before), `${item.id}: memory GET changed`);
    const bytesAfter = fs.existsSync(registryPath) ? fs.readFileSync(registryPath) : null;
    assert(equalBytes(bytesAfter, bytesBefore), `${item.id}: registry bytes changed`);
    assert(findTemporaryFiles(stageDir).length === 0, `${item.id}: temporary file remained`);
    console.log(`[pass] ${item.id}`);
  }
  await stopServer();
  serverProcess = null;
  serverProcess = startServer(ports, registryPath, "");
  await waitForHealth();
  assert(JSON.stringify(await registrySnapshot()) === JSON.stringify(before), `${stage}: restart state changed`);
  await stopServer();
  serverProcess = null;
  console.log(`[pass] ${stage}-restart-no-change`);
}

function payloadFor(item) {
  if (item.mutation === "delete") return undefined;
  const suffix = `${item.mutation}-${item.faultStage}`;
  if (item.kind === "profile") return profilePayload(item.mutation === "create" ? "602" : "601", suffix);
  if (item.kind === "rule") return rulePayload(item.mutation === "create" ? "702" : "701", suffix);
  if (item.kind === "vaRule") return vaRulePayload(item.mutation === "create" ? "802" : "801", suffix);
  return vlmProfilePayload(item.mutation === "create" ? "vlm-durable-new" : "vlm-durable-base", suffix);
}

function profilePayload(id, suffix) {
  return { id, detector: "dummy", fps: suffix === "baseline" ? 5 : 7, trackingClasses: ["person"] };
}

function rulePayload(id, suffix) {
  return {
    id, name: `durable-${suffix}`, enabled: true, ruleKind: "basic",
    analysis: { classes: ["person"], trackingPolicy: { tracker: "lite", reid: "off" } },
    event: { type: "presence", region: { type: "polygon", points: [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.1 }, { x: 0.9, y: 0.9 }] } },
  };
}

function vaRulePayload(id, suffix) {
  return {
    id, name: `durable-va-${suffix}`, enabled: true, priority: suffix === "baseline" ? 801 : 802,
    source: { kind: "file", file: "sample.mp4" },
    analysis: { profileId: "601", classes: ["person"], trackingPolicy: { tracker: "lite", reid: "off" } },
    templateStart: { ruleId: "701" },
    event: rulePayload("701", suffix).event,
  };
}

function vlmProfilePayload(id, suffix) {
  return {
    schema: "media-server.vlm-profile.v1", id, selectedOptionId: "local-qwen3-vl-8b",
    provider: "user-supplied-local-runtime", model: "Qwen/Qwen3-VL-8B-Instruct", runtime: "not-configured",
    privacyMode: "local-only", cloudOptInAcknowledged: false,
    promptProfile: { id: "event-review-default", version: "v1", language: "ko-en" },
    evaluation: { candidateId: "", expectedCatalogRevision: "", expectedProvenanceDigest: "" },
    activation: { enabled: false, status: "disabled", fallbackProfileId: "", disabledReason: `durable-${suffix}` },
    runtimeContract: {
      schema: "media-server.vlm-runtime-opt-in-contract.v1", targetStep: "V210-S01", mode: "disabled",
      status: "disabled", defaultEnabled: false, operatorOptInRequired: true,
      operatorOptInAcknowledged: false, runtimeCallAllowed: false, providerCallAllowed: false,
      providerFieldSmokeRequired: false,
      sideEffects: falseInvariantSet({ modelArtifactDownloaded: false, modelArtifactBundled: false }),
    },
    sourceStep: "V390-REVIEW2-21", storageScope: "profile-storage-only",
    contractInvariants: falseInvariantSet(),
  };
}

function falseInvariantSet(extra = {}) {
  return {
    runtimeVlmCallPerformed: false, sidecarStored: false, cloudProviderApiCalled: false,
    credentialStored: false, eventPostPayloadChanged: false, webrtcDataChannelSchemaChanged: false,
    sseMetadataSchemaChanged: false, wsMetadataSchemaChanged: false,
    rtspOrWebrtcMediaPathChanged: false, viewerClientExposureAdded: false, ...extra,
  };
}

async function registrySnapshot() {
  const [profiles, rules, vaRules, vlmProfiles] = await Promise.all([
    request("GET", "/lab/analysis/profiles"), request("GET", "/lab/analysis/rules"),
    request("GET", "/lab/analysis/va-rules"), request("GET", "/ops/api/vlm/profiles"),
  ]);
  for (const response of [profiles, rules, vaRules, vlmProfiles]) assert(response.status === 200, "registry snapshot GET failed");
  return {
    profiles: profiles.json.profiles || [], rules: rules.json.rules || [],
    vaRules: vaRules.json.vaRules || [], vlmProfiles: vlmProfiles.json.profiles || [],
  };
}

async function expectSuccess(method, route, body, status) {
  const response = await request(method, route, body);
  assert(response.status === status, `${method} ${route}: expected ${status}, got ${response.status}: ${response.text}`);
}

function startServer(ports, registryPath, faultStage) {
  const child = spawn("./server.sh", ["foreground"], {
    cwd: rootDir,
    env: {
      ...process.env,
      MEDIA_SERVER_SKIP_LOCAL_ENV: "1", MEDIA_SERVER_SKIP_BUILD: "1",
      MEDIA_SERVER_BUILD_DIR: process.env.MEDIA_SERVER_BUILD_DIR || path.join(rootDir, "build-gst-onnx"),
      MEDIA_SERVER_AUTH_MODE: "off", MEDIA_SERVER_LISTEN_ADDRESS: "127.0.0.1",
      MEDIA_SERVER_HTTP_LISTEN_ADDRESS: "127.0.0.1", MEDIA_SERVER_LISTEN_PORT: String(ports.rtsp),
      MEDIA_SERVER_HTTP_LISTEN_PORT: String(ports.http), MEDIA_SERVER_ANALYSIS_REGISTRY: registryPath,
      MEDIA_SERVER_ANALYSIS_REGISTRY_FAULT_STAGE: faultStage,
      MEDIA_SERVER_SOURCE_REGISTRY: path.join(workDir, "sources.json"),
      MEDIA_SERVER_PUBLISHED_VIEWS: path.join(workDir, "views.json"),
      MEDIA_SERVER_AUTH_USERS_FILE: path.join(workDir, "users.json"),
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
    if (serverLog.length > 180) serverLog.shift();
  }
}

async function waitForHealth() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (serverProcess.exitCode !== null) throw new Error(`server exited early: ${serverLog.slice(-30).join(" | ")}`);
    try { const response = await fetch(`${baseUrl}/health`); if (response.ok) return; } catch {}
    await delay(100);
  }
  throw new Error(`server health timeout: ${serverLog.slice(-30).join(" | ")}`);
}

async function request(method, requestPath, body) {
  const response = await fetch(`${baseUrl}${requestPath}`, {
    method, headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let json = {};
  try { json = JSON.parse(text); } catch {}
  return { status: response.status, text, json };
}

async function stopServer() {
  if (!serverProcess || serverProcess.exitCode !== null) return;
  const child = serverProcess;
  const exited = new Promise(resolve => child.once("exit", resolve));
  child.kill("SIGTERM");
  const terminated = await Promise.race([exited.then(() => true), delay(3000).then(() => false)]);
  if (!terminated && child.exitCode === null) { child.kill("SIGKILL"); await Promise.race([exited, delay(3000)]); }
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
    server.unref(); server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address(); const port = typeof address === "object" && address ? address.port : 0;
      server.close(error => error ? reject(error) : resolve(port));
    });
  });
}

function findTemporaryFiles(root) {
  const found = [];
  const visit = current => {
    if (!fs.existsSync(current)) return;
    const stat = fs.statSync(current);
    if (!stat.isDirectory()) { if (path.basename(current).includes(".tmp.")) found.push(current); return; }
    for (const entry of fs.readdirSync(current)) visit(path.join(current, entry));
  };
  visit(root); return found;
}

function equalBytes(left, right) {
  if (left === null || right === null) return left === right;
  return Buffer.compare(left, right) === 0;
}

function read(relativePath) { return fs.readFileSync(path.join(rootDir, relativePath), "utf8"); }
function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function assert(condition, message) { if (!condition) throw new Error(message); }
