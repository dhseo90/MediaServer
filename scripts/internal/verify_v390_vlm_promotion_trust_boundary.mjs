#!/usr/bin/env node
// 파일 용도: V390-ADD1-03 VLM 승격 신뢰 경계를 실제 auth-off HTTP round-trip으로 검증한다.

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
  printUsageAndExit(`v3.9.0 VLM promotion trust boundary verification

Usage:
  ./server.sh verify-v390-vlm-promotion-trust-boundary

Checks:
  - evaluation result API and profile save share the server-owned catalog revision/digests.
  - profile save accepts candidate reference fields only and stores server-canonical result/provenance.
  - forged passed, unknown/stale candidate, option/model/prompt mismatch, failed/review promotion are rejected.
  - rejected updates leave the original registry document unchanged.
  - runtime/provider/sidecar/event/metadata/media boundaries remain false.
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const fixturePath = path.join(rootDir, "test/fixtures/v390_vlm_promotion_trust_boundary/cases.json");
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const featureIds = ["UI-111", "LAB-123", "SAFE-206", "OPS-173"];
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), `media-server-v390-vlm-promotion-${process.pid}-`));
const registryPath = path.join(workDir, "analysis-registry.json");
const serverLog = [];
let serverProcess = null;

try {
  validateFixture();
  verifySourceContract();
  const ports = { http: await freePort(), rtsp: await freePort() };
  serverProcess = startServer(ports);
  const baseUrl = `http://127.0.0.1:${ports.http}`;
  await waitForHealth(baseUrl);
  await verifyCatalogApi(baseUrl);
  for (const item of fixture.cases) {
    await runCase(baseUrl, item);
    console.log(`[pass] ${item.id}`);
  }
  await verifyReloadQuarantine(baseUrl, ports);
  console.log("[pass] tampered-reload-profile-quarantined");
  console.log("");
  console.log("== v3.9.0 VLM promotion trust boundary ==");
  console.log(`- schema: ${fixture.schema}`);
  console.log(`- catalog revision: ${fixture.catalogRevision}`);
  console.log(`- HTTP cases: ${fixture.cases.length}`);
  console.log(`- reload quarantine cases: ${fixture.reloadCases}`);
  console.log("- client declared passed accepted: false");
  console.log("- server canonical provenance stored: true");
  console.log("- failures: 0");
} finally {
  await stopServer();
  fs.rmSync(workDir, { recursive: true, force: true });
}

function validateFixture() {
  assert(fixture.schema === "media-server.v390-vlm-promotion-trust-boundary-fixtures.v1", "fixture schema mismatch");
  assert(fixture.targetStep === "V390-ADD1-03", "fixture targetStep mismatch");
  assert(fixture.catalogRevision === "v390-add1-03-2026-07-10", "catalog revision mismatch");
  assert(Array.isArray(fixture.cases) && fixture.cases.length >= 14, "expected at least 14 trust boundary cases");
  assert(fixture.reloadCases === 9, "expected nine reload quarantine cases");
  for (const [key, value] of Object.entries(fixture.contractInvariants || {})) {
    assert(value === false, `contract invariant must remain false: ${key}`);
  }
  for (const name of ["passed", "review", "failed"]) {
    const candidate = fixture.candidates?.[name];
    assert(candidate?.id && candidate?.digest && candidate?.selectedOptionId, `missing ${name} candidate evidence`);
  }
  assert(featureIds.length === 4, "V390-ADD1-03 feature mapping mismatch");
}

function verifySourceContract() {
  const moduleSource = read("src/ingress/vlm_evaluation_promotion.cpp");
  const server = read("src/ingress/webrtc_http_server.cpp");
  const client = read("src/ingress/product_ui_page_scripts.cpp");
  const shell = read("src/ingress/webrtc_http_server.cpp");
  for (const snippet of [
    "ValidateVlmEvaluationPromotion",
    "server-candidate-option-model-prompt-revision-digest-binding",
    "profileSaveAcceptsCandidateReferenceOnly",
    "serverDerivesEvaluationAndProvenance",
    fixture.catalogRevision,
    fixture.candidates.passed.digest,
    fixture.candidates.review.digest,
    fixture.candidates.failed.digest,
  ]) assert(moduleSource.includes(snippet), `promotion module missing ${snippet}`);
  for (const snippet of [
    "client_declared_result_fields",
    "expectedCatalogRevision",
    "expectedProvenanceDigest",
    "evaluation_promotion.canonical_evaluation_json",
    "ReplaceObjectField(&normalized, \"evaluation\"",
    "CanonicalizeStoredVlmProfileLocked",
    "ValidateCanonicalVlmProfileEnvelopeLocked",
    "quarantinedProfileCount",
  ]) assert(server.includes(snippet), `server validator missing ${snippet}`);
  assert(!/evaluation:\s*\{\s*status:/s.test(client), "client profile payload must not declare evaluation.status");
  assert(client.includes("expectedCatalogRevision"), "client candidate request missing catalog revision");
  assert(client.includes("expectedProvenanceDigest"), "client candidate request missing provenance digest");
  const evaluationControl = shell.match(/<label>Evaluation \(server verified\)[\s\S]*?<\/label>/)?.[0] || "";
  assert(evaluationControl.includes("readonly"), "evaluation status control must be read-only");
  assert(!evaluationControl.includes("<select"), "evaluation status must not be a selectable field");
  for (const forbidden of ["<option value=\"passed\"", "evaluationStatus = opsVlmControlValue('opsVlmEvaluationStatus'"]) {
    assert(!`${evaluationControl}\n${client}`.includes(forbidden), `client authority remains: ${forbidden}`);
  }
}

async function verifyReloadQuarantine(baseUrl, ports) {
  await stopServer();
  serverProcess = null;
  const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  const canonical = registry.vlmProfiles?.find(profile => profile?.evaluation?.status === "passed");
  assert(canonical, "reload quarantine setup missing canonical passed profile");
  const tamperedProfiles = [];
  const addTampered = (suffix, mutate) => {
    const profile = structuredClone(canonical);
    profile.id = `trust-tampered-${suffix}`;
    mutate(profile);
    tamperedProfiles.push(profile);
  };
  addTampered("digest", profile => { profile.evaluation.provenance.candidateDigest = "0".repeat(64); });
  addTampered("activation", profile => { profile.activation.enabled = false; profile.activation.status = "active"; });
  addTampered("privacy", profile => { profile.privacyMode = "cloud-allowed"; });
  addTampered("forbidden", profile => { profile.rawPrompt = "must-never-reload"; });
  addTampered("runtime-side-effect", profile => { profile.runtimeContract.sideEffects.runtimeVlmCallPerformed = true; });
  addTampered("invariant", profile => { profile.contractInvariants.runtimeVlmCallPerformed = true; });
  addTampered("schema", profile => { profile.schema = "media-server.vlm-profile.v2"; });
  addTampered("provider-model", profile => { profile.provider = "cloud-provider-api"; });
  addTampered("unsafe/id", () => {});
  registry.vlmProfiles.push(...tamperedProfiles);
  fs.writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);

  serverProcess = startServer(ports);
  await waitForHealth(baseUrl);
  const list = await request(baseUrl, "GET", "/ops/api/vlm/profiles");
  assert(list.status === 200, `reload quarantine list HTTP ${list.status}`);
  assert(list.json.quarantinedProfileCount === tamperedProfiles.length,
    `tampered reload profile quarantine count mismatch: ${list.json.quarantinedProfileCount}; profiles=${(list.json.profiles || []).map(profile => profile.id).join(",")}; logs=${serverLog.slice(-20).join(" | ")}`);
  for (const tampered of tamperedProfiles) {
    assert(!(list.json.profiles || []).some(profile => profile.id === tampered.id), `${tampered.id} remained visible`);
    const absent = await request(baseUrl, "GET", `/ops/api/vlm/profiles/${encodeURIComponent(tampered.id)}`);
    assert(absent.status === 404, `${tampered.id} remained addressable`);
  }
}

async function verifyCatalogApi(baseUrl) {
  const response = await request(baseUrl, "GET", "/ops/api/vlm/evaluation-results");
  assert(response.status === 200, `evaluation catalog HTTP ${response.status}`);
  assert(response.json.catalogRevision === fixture.catalogRevision, "evaluation catalog revision response mismatch");
  assert(response.json.selectionPolicy?.profileDraftMayCopyEvaluationStatus === false, "catalog must forbid client status copy");
  assert(response.json.selectionPolicy?.serverDerivesEvaluationAndProvenance === true, "catalog must mark server derivation");
  for (const candidate of Object.values(fixture.candidates)) {
    const actual = response.json.profileCandidates?.find(item => item.id === candidate.id);
    assert(actual, `catalog response missing ${candidate.id}`);
    assert(actual.evaluation?.status === candidate.status, `${candidate.id}: status mismatch`);
    assert(actual.selectedOptionId === candidate.selectedOptionId, `${candidate.id}: selectedOptionId mismatch`);
    assert(actual.provenanceRef?.catalogRevision === fixture.catalogRevision, `${candidate.id}: revision ref mismatch`);
    assert(actual.provenanceRef?.candidateDigest === candidate.digest, `${candidate.id}: digest ref mismatch`);
  }
}

async function runCase(baseUrl, item) {
  const profileId = `trust-${item.id}`;
  if (item.mutation === "rejected-update") {
    const original = buildProfile({ id: profileId, candidateName: "none", activation: "disabled" });
    const created = await request(baseUrl, "PUT", `/ops/api/vlm/profiles/${profileId}`, original);
    assert(created.status === 200, `${item.id}: setup write HTTP ${created.status}`);
    const forged = buildProfile({ id: profileId, candidateName: "none", activation: "active", mutation: "declare-passed" });
    const rejected = await request(baseUrl, "PUT", `/ops/api/vlm/profiles/${profileId}`, forged);
    assertRejected(item, rejected);
    const readback = await request(baseUrl, "GET", `/ops/api/vlm/profiles/${profileId}`);
    assert(readback.status === 200, `${item.id}: original profile missing after rejected update`);
    assert(readback.json.vlmProfile?.evaluation?.status === item.expectedStoredStatus, `${item.id}: rejected update changed evaluation`);
    assert(readback.json.vlmProfile?.activation?.status === "disabled", `${item.id}: rejected update changed activation`);
    return;
  }
  const profile = buildProfile({
    id: profileId,
    candidateName: item.candidate,
    activation: item.activation,
    mutation: item.mutation,
  });
  const response = await request(baseUrl, "PUT", `/ops/api/vlm/profiles/${profileId}`, profile);
  assert(response.status === item.expectedHttp, `${item.id}: expected HTTP ${item.expectedHttp}, got ${response.status}: ${response.text}`);
  if (item.expectedHttp !== 200) {
    assertRejected(item, response);
    const absent = await request(baseUrl, "GET", `/ops/api/vlm/profiles/${profileId}`);
    assert(absent.status === 404, `${item.id}: rejected profile was persisted`);
    return;
  }
  const stored = response.json.vlmProfile;
  assert(stored?.evaluation?.status === item.expectedStoredStatus, `${item.id}: canonical status mismatch`);
  assert(stored?.evaluation?.source === "server-verified-evaluation-catalog", `${item.id}: source is not server canonical`);
  assert(stored?.evaluation?.provenance?.authority === "media-server", `${item.id}: provenance authority mismatch`);
  assert(stored?.evaluation?.provenance?.catalogRevision === fixture.catalogRevision, `${item.id}: provenance revision mismatch`);
  assert(stored?.evaluation?.provenance?.verification, `${item.id}: provenance verification missing`);
  assert(stored.evaluation.expectedCatalogRevision === undefined, `${item.id}: request revision leaked into canonical result`);
  assert(stored.evaluation.expectedProvenanceDigest === undefined, `${item.id}: request digest leaked into canonical result`);
  const readback = await request(baseUrl, "GET", `/ops/api/vlm/profiles/${profileId}`);
  assert(readback.status === 200, `${item.id}: stored profile readback failed`);
  assert(readback.json.vlmProfile?.evaluation?.status === item.expectedStoredStatus, `${item.id}: readback status mismatch`);
}

function assertRejected(item, response) {
  assert(response.status === item.expectedHttp, `${item.id}: expected HTTP ${item.expectedHttp}, got ${response.status}`);
  assert(response.text.includes(item.expectedError), `${item.id}: error missing '${item.expectedError}': ${response.text}`);
}

function buildProfile({ id, candidateName, activation, mutation = "" }) {
  const candidate = candidateName === "none" ? null : fixture.candidates[candidateName];
  const active = activation === "active";
  const disabled = activation === "disabled";
  const profile = {
    schema: "media-server.vlm-profile.v1",
    id,
    selectedOptionId: candidate?.selectedOptionId || "local-qwen3-vl-8b",
    provider: "user-supplied-local-runtime",
    model: candidate?.model || "Qwen/Qwen3-VL-8B-Instruct",
    runtime: active ? "ollama" : "not-configured",
    privacyMode: "local-only",
    cloudOptInAcknowledged: false,
    promptProfile: candidate?.promptProfile || { id: "event-review-default", version: "v1", language: "ko-en" },
    evaluation: {
      candidateId: candidate?.id || "",
      expectedCatalogRevision: candidate ? fixture.catalogRevision : "",
      expectedProvenanceDigest: candidate?.digest || "",
    },
    activation: {
      enabled: active,
      status: active ? "active" : (disabled ? "disabled" : "pending-evaluation"),
      fallbackProfileId: "",
      disabledReason: active ? "" : (disabled ? "operator-disabled" : "operator-pending-activation"),
    },
    runtimeContract: runtimeContract({ active, disabled }),
    sourceStep: "V390-ADD1-03",
    storageScope: "profile-storage-only",
    contractInvariants: {
      runtimeVlmCallPerformed: false,
      sidecarStored: false,
      cloudProviderApiCalled: false,
      credentialStored: false,
      eventPostPayloadChanged: false,
      webrtcDataChannelSchemaChanged: false,
      sseMetadataSchemaChanged: false,
      wsMetadataSchemaChanged: false,
      rtspOrWebrtcMediaPathChanged: false,
      viewerClientExposureAdded: false,
    },
  };
  if (mutation === "declare-passed") profile.evaluation.status = "passed";
  if (mutation === "unknown-candidate") profile.evaluation.candidateId = "eval-attacker-passed";
  if (mutation === "stale-revision") profile.evaluation.expectedCatalogRevision = "v390-stale";
  if (mutation === "stale-digest") profile.evaluation.expectedProvenanceDigest = "0".repeat(64);
  if (mutation === "wrong-option") profile.selectedOptionId = "local-qwen3-vl-4b";
  if (mutation === "wrong-model") profile.model = "Qwen/Qwen3-VL-4B-Instruct";
  if (mutation === "wrong-prompt") profile.promptProfile.id = "false-positive-review";
  return profile;
}

function runtimeContract({ active, disabled }) {
  const mode = disabled ? "disabled" : "local-runtime";
  const status = disabled ? "disabled" : (active ? "local-runtime" : "missing-model");
  return {
    schema: "media-server.vlm-runtime-opt-in-contract.v1",
    targetStep: "V210-S01",
    mode,
    status,
    defaultEnabled: false,
    operatorOptInRequired: true,
    operatorOptInAcknowledged: active,
    runtimeCallAllowed: false,
    providerCallAllowed: false,
    providerFieldSmokeRequired: false,
    sideEffects: {
      runtimeVlmCallPerformed: false,
      cloudProviderApiCalled: false,
      modelArtifactDownloaded: false,
      modelArtifactBundled: false,
      credentialStored: false,
      sidecarStored: false,
      eventPostPayloadChanged: false,
      webrtcDataChannelSchemaChanged: false,
      sseMetadataSchemaChanged: false,
      wsMetadataSchemaChanged: false,
      rtspOrWebrtcMediaPathChanged: false,
      viewerClientExposureAdded: false,
    },
  };
}

function startServer(ports) {
  const child = spawn("./server.sh", ["foreground"], {
    cwd: rootDir,
    env: {
      ...process.env,
      MEDIA_SERVER_SKIP_LOCAL_ENV: "1",
      MEDIA_SERVER_AUTH_MODE: "off",
      MEDIA_SERVER_LISTEN_ADDRESS: "127.0.0.1",
      MEDIA_SERVER_HTTP_LISTEN_ADDRESS: "127.0.0.1",
      MEDIA_SERVER_LISTEN_PORT: String(ports.rtsp),
      MEDIA_SERVER_HTTP_LISTEN_PORT: String(ports.http),
      MEDIA_SERVER_ANALYSIS_REGISTRY: registryPath,
      MEDIA_SERVER_SOURCE_REGISTRY: path.join(workDir, "sources.json"),
      MEDIA_SERVER_PUBLISHED_VIEWS: path.join(workDir, "views.json"),
      MEDIA_SERVER_AUTH_USERS_FILE: path.join(workDir, "users.json"),
      MEDIA_SERVER_BUILD_DIR: process.env.MEDIA_SERVER_BUILD_DIR || path.join(rootDir, "build-gst-onnx"),
      MEDIA_SERVER_SKIP_BUILD: process.env.MEDIA_SERVER_SKIP_BUILD || "0",
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

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
