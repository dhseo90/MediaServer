#!/usr/bin/env node
// 파일 용도: V390-REVIEW4-54 Analysis Registry failure atomicity와 crash recovery를 actual HTTP로 검증한다.

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
  - all 12 mutations cross all 9 parent/file/directory failure stages.
  - new targets use mode 0640, existing target modes are preserved, and parent directory fsync completes before success.
  - all failures keep the previous state and allow one fault-cleared retry.
  - all mutations recover deterministically across four injected crash points.
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
  await runMissingTargetMode();
  await runMissingTargetFailureAndRetry();
  const baseline = await createBaseline();
  await runModePreservationMatrix(baseline);
  await runSuccessMatrix(fixture.mutationCases, baseline);
  for (const stage of fixture.failureStages) {
    await runFailureStage(stage, fixture.mutationCases, baseline);
  }
  for (const crash of fixture.crashStages) {
    for (const item of fixture.mutationCases) {
      await runCrashCase(crash, item, baseline);
    }
  }
  assert(findTemporaryFiles(workDir).length === 0,
    `temporary registry files remain: ${findTemporaryFiles(workDir).join(", ")}`);
  assert(findTransactionArtifacts(workDir).length === 0,
    `transaction artifacts remain: ${findTransactionArtifacts(workDir).join(", ")}`);
  console.log("");
  console.log("== v3.9.0 Analysis Registry durable write ==");
  console.log(`- schema: ${fixture.schema}; mutations/success: ${fixture.mutationCases.length}/${fixture.mutationCases.length}`);
  console.log(`- failure/retry/crash: ${fixture.mutationCases.length * fixture.failureStages.length}/${fixture.mutationCases.length * fixture.retryableFailureStages.length}/${fixture.mutationCases.length * fixture.crashStages.length}`);
  console.log(`- mode preserved/new: ${fixture.preservedMode}/${fixture.newTargetMode}; commitPoint: ${fixture.commitPoint}; HTTP 500=previous; restart rollback=true; retry once=true; artifacts=0; failures=0`);
} finally {
  await stopServer();
  fs.rmSync(workDir, { recursive: true, force: true });
}

function validateFixture() {
  assert(fixture.schema === "media-server.v390-analysis-registry-failure-atomicity-fixtures.v3", "fixture schema mismatch");
  assert(fixture.targetStep === "V390-REVIEW4-54", "fixture targetStep mismatch");
  assert(fixture.preservedMode === "0640", "preserved mode mismatch");
  validateReview454FixtureContract();
  assert(Array.isArray(fixture.mutationCases) && fixture.mutationCases.length === 12, "expected twelve mutation cases");
  assert(JSON.stringify(fixture.failureStages) === JSON.stringify([
    "parent", "open", "mode", "write", "flush", "close", "directory-open", "rename", "directory-flush",
  ]),
    "failure stage set mismatch");
  assert(JSON.stringify(fixture.crashStages.map(item => item.stage)) === JSON.stringify([
    "after-temp-fsync", "after-rename", "after-directory-fsync", "during-rollback",
  ]), "crash stage set mismatch");
  assert(featureIds.length === 2, "V390-REVIEW4-54 feature mapping mismatch");
  for (const kind of ["profile", "rule", "vaRule", "vlmProfile"]) {
    for (const mutation of ["create", "update", "delete"]) {
      assert(fixture.mutationCases.some(item => item.kind === kind && item.mutation === mutation),
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
    "RecoverAnalysisRegistryTemporaryFiles",
    "WriteAnalysisRegistryTransactionMarker",
    "RestoreAnalysisRegistryPreviousState",
    "media-server.analysis-registry-transaction.v1",
    "fchmod",
    "O_DIRECTORY",
    "after-directory-fsync",
  ]) assert(server.includes(snippet), `durable write source contract missing ${snippet}`);
  assert(/fsync\(directory_fd\)/.test(server), "parent directory fsync missing");
  assert(server.includes("mode_t target_mode = 0640;"), "new registry target mode is not 0640");
  assert(!/if \(write_result\.target_replaced\) \{[\s\S]{0,500}?profiles_\s*=/.test(server),
    "persistence failure still publishes a post-rename candidate");
  assert(!/void\s+SaveLocked\s*\(/.test(server), "legacy void SaveLocked remains");
}

async function createBaseline() {
  fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
  const ports = await freePortPair();
  baseUrl = `http://127.0.0.1:${ports.http}`;
  serverProcess = startServer(ports, baselinePath, "", "");
  await waitForHealth();
  await expectSuccess("PUT", "/lab/analysis/profiles/601", profilePayload("601", "baseline"), 200);
  await expectSuccess("PUT", "/lab/analysis/rules/701", rulePayload("701", "baseline"), 200);
  await expectSuccess("PUT", "/lab/analysis/va-rules/801", vaRulePayload("801", "baseline"), 200);
  await expectSuccess("PUT", "/ops/api/vlm/profiles/vlm-durable-base", vlmProfilePayload("vlm-durable-base", "baseline"), 200);
  const snapshot = await registrySnapshot();
  await stopServer();
  serverProcess = null;
  assert(fs.existsSync(baselinePath), "baseline registry file missing");
  fs.chmodSync(baselinePath, Number.parseInt(fixture.preservedMode, 8));
  return { bytes: fs.readFileSync(baselinePath), snapshot };
}

async function runFailureStage(stage, cases, baseline) {
  const stageDir = path.join(workDir, `stage-${stage}`);
  fs.mkdirSync(stageDir, { recursive: true });
  const registryPath = path.join(stageDir, "analysis.json");
  writeBaseline(registryPath, baseline.bytes);
  const ports = await freePortPair();
  baseUrl = `http://127.0.0.1:${ports.http}`;
  serverProcess = startServer(ports, registryPath, stage, "");
  await waitForHealth();
  for (const item of cases) {
    const caseId = `${item.id}-${stage}`;
    const before = await registrySnapshot();
    const bytesBefore = fs.readFileSync(registryPath);
    const response = await request(item.method, item.route, payloadFor(item, stage));
    const persistenceFailureCode = response.json.code || "";
    assert(response.status === 500, `${caseId}: expected HTTP 500, got ${response.status}: ${response.text}`);
    assert(persistenceFailureCode === "analysis-registry-persistence-failed", `${caseId}: persistence code missing`);
    assert(response.json.stage === stage, `${caseId}: expected stage ${stage}, got ${response.json.stage}`);
    assert(!response.text.includes(registryPath), `${caseId}: response exposed storage path`);
    const after = await registrySnapshot();
    const bytesAfter = fs.existsSync(registryPath) ? fs.readFileSync(registryPath) : null;
    const registryWritePerformedAfterFailure = persistenceFailureCode !== "analysis-registry-persistence-failed" || JSON.stringify(after) !== JSON.stringify(before);
    assert(registryWritePerformedAfterFailure === false &&
      persistenceFailureCode === "analysis-registry-persistence-failed", `${caseId}: memory GET changed`);
    assert(equalBytes(bytesAfter, bytesBefore), `${caseId}: registry bytes changed`);
    assert(fileMode(registryPath) === fixture.preservedMode, `${caseId}: file mode drift`);
    assert(findTemporaryFiles(stageDir).length === 0, `${caseId}: temporary file remained`);
    assert(findTransactionArtifacts(stageDir).length === 0, `${caseId}: transaction artifact remained`);
    console.log(`[pass] ${caseId}`);
  }
  const beforeRestart = await registrySnapshot();
  await stopServer();
  serverProcess = null;
  const restartPorts = await freePortPair();
  baseUrl = `http://127.0.0.1:${restartPorts.http}`;
  serverProcess = startServer(restartPorts, registryPath, "", "");
  await waitForHealth();
  assert(JSON.stringify(await registrySnapshot()) === JSON.stringify(beforeRestart), `${stage}: restart state changed`);
  assert(fileMode(registryPath) === fixture.preservedMode, `${stage}: restart mode drift`);
  await runFaultClearedRetry(stage, cases, registryPath, stageDir);
  await stopServer();
  serverProcess = null;
  console.log(`[pass] ${stage}-restart-consistent`);
}

async function runSuccessMatrix(cases, baseline) {
  const successDir = path.join(workDir, "success-matrix");
  const registryPath = path.join(successDir, "analysis.json");
  writeBaseline(registryPath, baseline.bytes);
  const ports = await freePortPair();
  baseUrl = `http://127.0.0.1:${ports.http}`;
  serverProcess = startServer(ports, registryPath, "", "");
  await waitForHealth();
  for (const item of cases) {
    const before = await registrySnapshot();
    const bytesBefore = fs.readFileSync(registryPath);
    const response = await request(item.method, item.route, payloadFor(item, "success"));
    assert(response.status >= 200 && response.status < 300,
      `${item.id}-success: expected HTTP 2xx, got ${response.status}: ${response.text}`);
    const after = await registrySnapshot();
    assertMutationApplied(before, after, item, `${item.id}-success: mutation not applied`);
    assert(!equalBytes(fs.readFileSync(registryPath), bytesBefore), `${item.id}-success: bytes did not change`);
    assert(fileMode(registryPath) === fixture.preservedMode, `${item.id}-success: file mode drift`);
    assert(findTemporaryFiles(successDir).length === 0, `${item.id}-success: temporary file remained`);
    console.log(`[pass] ${item.id}-success`);
  }
  const beforeRestart = await registrySnapshot();
  await stopServer();
  serverProcess = null;
  const restartPorts = await freePortPair();
  baseUrl = `http://127.0.0.1:${restartPorts.http}`;
  serverProcess = startServer(restartPorts, registryPath, "", "");
  await waitForHealth();
  assert(JSON.stringify(await registrySnapshot()) === JSON.stringify(beforeRestart),
    "success matrix restart state changed");
  assert(fileMode(registryPath) === fixture.preservedMode, "success matrix restart mode drift");
  await stopServer();
  serverProcess = null;
  console.log("[pass] success-matrix-restart-consistent");
}

async function runCrashCase(crash, item, baseline) {
  const caseId = `${item.id}-${crash.stage}`;
  const caseDir = path.join(workDir, `crash-${caseId}`);
  const registryPath = path.join(caseDir, "analysis.json");
  writeBaseline(registryPath, baseline.bytes);
  const ports = await freePortPair();
  baseUrl = `http://127.0.0.1:${ports.http}`;
  serverProcess = startServer(ports, registryPath,
    crash.stage === "during-rollback" ? "directory-flush" : "", crash.stage);
  await waitForHealth();
  const before = await registrySnapshot();
  await expectMutationCrash(item, crash.stage);
  const staleBeforeRestart = findTemporaryFiles(caseDir);
  assert((staleBeforeRestart.length > 0) === crash.staleTempBeforeRestart,
    `${caseId}: stale temp pre-restart contract drift`);
  const transactionBeforeRestart = findTransactionArtifacts(caseDir);
  assert((transactionBeforeRestart.length > 0) === crash.transactionRecoveryRequired,
    `${caseId}: transaction recovery artifact contract drift`);
  const crashedBytes = fs.readFileSync(registryPath);
  if (crash.expectedPreRecoveryFileState === "previous") {
    assert(equalBytes(crashedBytes, baseline.bytes), `${caseId}: pre-rename crash changed target`);
  } else {
    assert(!equalBytes(crashedBytes, baseline.bytes), `${caseId}: post-rename crash did not replace target`);
    JSON.parse(crashedBytes.toString("utf8"));
  }
  assert(fileMode(registryPath) === fixture.preservedMode, `${caseId}: crash mode drift`);

  const restartPorts = await freePortPair();
  baseUrl = `http://127.0.0.1:${restartPorts.http}`;
  serverProcess = startServer(restartPorts, registryPath, "", "");
  await waitForHealth();
  const afterRestart = await registrySnapshot();
  if (crash.expectedRestartState === "previous") {
    assert(JSON.stringify(afterRestart) === JSON.stringify(before), `${caseId}: previous state not recovered`);
  } else {
    assertMutationApplied(before, afterRestart, item, `${caseId}: candidate state not recovered`);
  }
  assert(findTemporaryFiles(caseDir).length === 0, `${caseId}: stale temp not recovered`);
  assert(findTransactionArtifacts(caseDir).length === 0, `${caseId}: transaction artifacts not recovered`);
  assert(fileMode(registryPath) === fixture.preservedMode, `${caseId}: restart mode drift`);
  await stopServer();
  serverProcess = null;
  console.log(`[pass] ${caseId}`);
}

function payloadFor(item, suffixTag) {
  if (item.mutation === "delete") return undefined;
  const suffix = `${item.mutation}-${suffixTag}`;
  if (item.kind === "profile") return profilePayload(item.mutation === "create" ? "602" : "601", suffix);
  if (item.kind === "rule") return rulePayload(item.mutation === "create" ? "702" : "701", suffix);
  if (item.kind === "vaRule") return vaRulePayload(item.mutation === "create" ? "802" : "801", suffix);
  return vlmProfilePayload(item.mutation === "create" ? "vlm-durable-new" : "vlm-durable-base", suffix);
}

async function expectMutationCrash(item, crashStage) {
  try {
    await request(item.method, item.route, payloadFor(item, crashStage));
  } catch {
    // The injected _exit closes the socket before an HTTP response is available.
  }
  const child = serverProcess;
  const exited = await waitForProcessExit(child, 10000);
  assert(exited, `${item.id}-${crashStage}: server did not crash`);
  assert(child.exitCode === 86, `${item.id}-${crashStage}: unexpected crash exit ${child.exitCode}`);
  serverProcess = null;
}

function assertMutationApplied(before, after, item, message) {
  const collectionName = {
    profile: "profiles", rule: "rules", vaRule: "vaRules", vlmProfile: "vlmProfiles",
  }[item.kind];
  const id = mutationId(item);
  const beforeItems = before[collectionName];
  const afterItems = after[collectionName];
  const beforeItem = beforeItems.find(entry => String(entry.id) === id);
  const afterItem = afterItems.find(entry => String(entry.id) === id);
  if (item.mutation === "create") {
    assert(!beforeItem && afterItem && afterItems.length === beforeItems.length + 1, message);
  } else if (item.mutation === "update") {
    assert(beforeItem && afterItem && afterItems.length === beforeItems.length &&
      JSON.stringify(beforeItem) !== JSON.stringify(afterItem), message);
  } else {
    assert(beforeItem && !afterItem && afterItems.length === beforeItems.length - 1, message);
  }
  for (const [name, items] of Object.entries(after)) {
    if (name === collectionName) continue;
    assert(JSON.stringify(items) === JSON.stringify(before[name]), `${message}: unrelated ${name} changed`);
  }
}

function mutationId(item) {
  if (item.kind === "profile") return item.mutation === "create" ? "602" : "601";
  if (item.kind === "rule") return item.mutation === "create" ? "702" : "701";
  if (item.kind === "vaRule") return item.mutation === "create" ? "802" : "801";
  return item.mutation === "create" ? "vlm-durable-new" : "vlm-durable-base";
}

function writeBaseline(registryPath, bytes) {
  fs.mkdirSync(path.dirname(registryPath), { recursive: true });
  fs.writeFileSync(registryPath, bytes);
  fs.chmodSync(registryPath, Number.parseInt(fixture.preservedMode, 8));
  assert(fileMode(registryPath) === fixture.preservedMode, "baseline mode setup failed");
}

function fileMode(filePath) {
  return (fs.statSync(filePath).mode & 0o7777).toString(8).padStart(4, "0");
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
    id, name: `durable-va-${suffix}`, enabled: true, priority: Number(id),
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

function startServer(ports, registryPath, faultStage, crashStage) {
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
      MEDIA_SERVER_ANALYSIS_REGISTRY_CRASH_STAGE: crashStage,
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

function waitForProcessExit(child, timeoutMs) {
  if (!child || child.exitCode !== null) return Promise.resolve(true);
  return Promise.race([
    new Promise(resolve => child.once("exit", () => resolve(true))),
    delay(timeoutMs).then(() => false),
  ]);
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

function findTransactionArtifacts(root) {
  const found = [];
  const visit = current => {
    if (!fs.existsSync(current)) return;
    const stat = fs.statSync(current);
    if (!stat.isDirectory()) {
      if (/\.(?:txn|rollback)$/.test(path.basename(current))) found.push(current);
      return;
    }
    for (const entry of fs.readdirSync(current)) visit(path.join(current, entry));
  };
  visit(root);
  return found;
}

function equalBytes(left, right) {
  if (left === null || right === null) return left === right;
  return Buffer.compare(left, right) === 0;
}

function read(relativePath) { return fs.readFileSync(path.join(rootDir, relativePath), "utf8"); }
function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function assert(condition, message) { if (!condition) throw new Error(message); }

async function runMissingTargetMode() {
  const caseDir = path.join(workDir, "missing-target-mode");
  const registryPath = path.join(caseDir, "analysis.json");
  assert(!fs.existsSync(registryPath), "missing-target mode case unexpectedly has a registry file");
  const ports = await freePortPair();
  baseUrl = `http://127.0.0.1:${ports.http}`;
  serverProcess = startServer(ports, registryPath, "", "");
  await waitForHealth();
  const response = await request("PUT", "/lab/analysis/profiles/601", profilePayload("601", "missing-target"));
  assert(response.status === 200, `missing-target mutation failed ${response.status}: ${response.text}`);
  const snapshot = await registrySnapshot();
  assert(snapshot.profiles.some(item => String(item.id) === "601"), "missing-target mutation was not published");
  assert(fileMode(registryPath) === fixture.newTargetMode, "missing-target registry mode is not 0640");
  assert(findTemporaryFiles(caseDir).length === 0, "missing-target mutation left a temporary file");
  await stopServer();
  serverProcess = null;
  const restartPorts = await freePortPair();
  baseUrl = `http://127.0.0.1:${restartPorts.http}`;
  serverProcess = startServer(restartPorts, registryPath, "", "");
  await waitForHealth();
  assert(JSON.stringify(await registrySnapshot()) === JSON.stringify(snapshot), "missing-target restart state changed");
  assert(fileMode(registryPath) === fixture.newTargetMode, "missing-target restart mode drift");
  await stopServer();
  serverProcess = null;
  console.log("[pass] missing-target-mode-0640-restart-consistent");
}

function validateReview454FixtureContract() {
  assert(fixture.newTargetMode === "0640", "new target mode mismatch");
  assert(fixture.commitPoint === "parent-directory-fsync-and-commit-marker", "registry commit point mismatch");
  assert(JSON.stringify(fixture.retryableFailureStages) === JSON.stringify(fixture.failureStages),
    "retryable failure stage mismatch");
  assert(JSON.stringify(fixture.postRenameFailureStages) === JSON.stringify(["directory-flush"]),
    "post-rename failure stage mismatch");
  assert(fixture.retryContract?.faultedAttemptState === "previous" &&
    fixture.retryContract?.faultClearedRetryState === "candidate-success" &&
    fixture.retryContract?.maxMutationRetriesPerCase === 1, "retry contract mismatch");
  for (const crash of fixture.crashStages) {
    assert(["previous", "candidate"].includes(crash.expectedPreRecoveryFileState),
      `${crash.stage}: pre-recovery state missing`);
    assert(["previous", "candidate"].includes(crash.expectedRestartState),
      `${crash.stage}: restart state missing`);
    assert(typeof crash.transactionRecoveryRequired === "boolean",
      `${crash.stage}: transaction recovery flag missing`);
  }
}

async function runFaultClearedRetry(stage, cases, registryPath, stageDir) {
  for (const item of cases) {
    const caseId = `${item.id}-${stage}-retry`;
    const before = await registrySnapshot();
    const bytesBefore = fs.readFileSync(registryPath);
    const response = await request(item.method, item.route, payloadFor(item, `retry-${stage}`));
    assert(response.status >= 200 && response.status < 300,
      `${caseId}: fault-cleared retry failed ${response.status}: ${response.text}`);
    const after = await registrySnapshot();
    assertMutationApplied(before, after, item, `${caseId}: mutation was not applied exactly once`);
    assert(!equalBytes(fs.readFileSync(registryPath), bytesBefore), `${caseId}: bytes did not change`);
    assert(fileMode(registryPath) === fixture.preservedMode, `${caseId}: mode drift`);
    assert(findTemporaryFiles(stageDir).length === 0, `${caseId}: temporary file remained`);
    assert(findTransactionArtifacts(stageDir).length === 0, `${caseId}: transaction artifact remained`);
    console.log(`[pass] ${caseId}`);
  }
  const afterRetry = await registrySnapshot();
  await stopServer();
  serverProcess = null;
  const restartPorts = await freePortPair();
  baseUrl = `http://127.0.0.1:${restartPorts.http}`;
  serverProcess = startServer(restartPorts, registryPath, "", "");
  await waitForHealth();
  assert(JSON.stringify(await registrySnapshot()) === JSON.stringify(afterRetry), `${stage}: retry restart state changed`);
  assert(fileMode(registryPath) === fixture.preservedMode, `${stage}: retry restart mode drift`);
}

async function runMissingTargetFailureAndRetry() {
  const caseDir = path.join(workDir, "missing-target-directory-flush");
  const registryPath = path.join(caseDir, "analysis.json");
  const ports = await freePortPair();
  baseUrl = `http://127.0.0.1:${ports.http}`;
  serverProcess = startServer(ports, registryPath, "directory-flush", "");
  await waitForHealth();
  const before = await registrySnapshot();
  const failed = await request("PUT", "/lab/analysis/profiles/601", profilePayload("601", "missing-failure"));
  assert(failed.status === 500 && failed.json.code === "analysis-registry-persistence-failed" &&
    failed.json.stage === "directory-flush", "missing-target directory-flush did not return typed HTTP 500");
  assert(JSON.stringify(await registrySnapshot()) === JSON.stringify(before), "missing-target failure changed memory");
  assert(!fs.existsSync(registryPath), "missing-target failure left a target file");
  assert(findTemporaryFiles(caseDir).length === 0, "missing-target failure left a temporary file");
  assert(findTransactionArtifacts(caseDir).length === 0, "missing-target failure left a transaction artifact");
  await stopServer();
  serverProcess = null;
  const retryPorts = await freePortPair();
  baseUrl = `http://127.0.0.1:${retryPorts.http}`;
  serverProcess = startServer(retryPorts, registryPath, "", "");
  await waitForHealth();
  assert(JSON.stringify(await registrySnapshot()) === JSON.stringify(before), "missing-target restart changed previous state");
  const retried = await request("PUT", "/lab/analysis/profiles/601", profilePayload("601", "missing-retry"));
  assert(retried.status === 200, `missing-target retry failed ${retried.status}: ${retried.text}`);
  const afterRetry = await registrySnapshot();
  assert(before.profiles.length === 0 && afterRetry.profiles.length === 1 &&
    String(afterRetry.profiles[0].id) === "601", "missing-target retry was not applied exactly once");
  assert(fileMode(registryPath) === fixture.newTargetMode, "missing-target retry mode is not 0640");
  await stopServer();
  serverProcess = null;
  const restartPorts = await freePortPair();
  baseUrl = `http://127.0.0.1:${restartPorts.http}`;
  serverProcess = startServer(restartPorts, registryPath, "", "");
  await waitForHealth();
  assert(JSON.stringify(await registrySnapshot()) === JSON.stringify(afterRetry), "missing-target retry restart changed state");
  assert(findTransactionArtifacts(caseDir).length === 0, "missing-target retry restart left transaction artifacts");
  await stopServer();
  serverProcess = null;
  console.log("[pass] missing-target-directory-flush-rollback-retry");
}

async function runModePreservationMatrix(baseline) {
  for (const mode of ["0600", "0644"]) {
    const caseDir = path.join(workDir, `mode-${mode}`);
    const registryPath = path.join(caseDir, "analysis.json");
    writeBaseline(registryPath, baseline.bytes);
    fs.chmodSync(registryPath, Number.parseInt(mode, 8));
    const ports = await freePortPair();
    baseUrl = `http://127.0.0.1:${ports.http}`;
    serverProcess = startServer(ports, registryPath, "", "");
    await waitForHealth();
    const response = await request("PUT", "/lab/analysis/profiles/601", profilePayload("601", `mode-${mode}`));
    assert(response.status === 200, `mode ${mode}: update failed ${response.status}: ${response.text}`);
    const snapshot = await registrySnapshot();
    assert(fileMode(registryPath) === mode, `mode ${mode}: existing target mode changed`);
    await stopServer();
    serverProcess = null;
    const restartPorts = await freePortPair();
    baseUrl = `http://127.0.0.1:${restartPorts.http}`;
    serverProcess = startServer(restartPorts, registryPath, "", "");
    await waitForHealth();
    assert(JSON.stringify(await registrySnapshot()) === JSON.stringify(snapshot), `mode ${mode}: restart state changed`);
    assert(fileMode(registryPath) === mode, `mode ${mode}: restart mode changed`);
    assert(findTransactionArtifacts(caseDir).length === 0, `mode ${mode}: transaction artifacts remain`);
    await stopServer();
    serverProcess = null;
    console.log(`[pass] existing-target-mode-${mode}-preserved`);
  }
}
