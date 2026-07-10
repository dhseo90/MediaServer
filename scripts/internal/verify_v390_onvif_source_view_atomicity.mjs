#!/usr/bin/env node
// 파일 용도: V390-ADD1-05 ONVIF source/PublishedView paired save와 보상 rollback을 실제 HTTP/파일/재시작으로 검증한다.

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
  printUsageAndExit(`v3.9.0 ONVIF source/view atomicity verification

Usage:
  ./server.sh verify-v390-onvif-source-view-atomicity

Checks:
  - source and PublishedView are fully prevalidated before either registry write.
  - a second-file failure restores the exact pre-transaction source document.
  - failed transactions leave API memory, disk files, and restart state consistent.
  - concurrent paired saves cannot leave source/view fields from different requests mixed.
  - import draft remains notSaved and the paired route remains an explicit source:write action.
`);
}
assertKnownOptions(rawArgs, ["h", "help"]);

const fixturePath = path.join(rootDir, "test/fixtures/v390_onvif_source_view_atomicity/cases.json");
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), `media-server-v390-onvif-atomicity-${process.pid}-`));
const sourceDir = path.join(workDir, "source-registry");
const viewDir = path.join(workDir, "view-registry");
const savedViewDir = path.join(workDir, "view-registry.saved");
const sourcePath = path.join(sourceDir, "sources.json");
const viewPath = path.join(viewDir, "views.json");
const channelId = fixture.channelId;
const serverLog = [];
let serverProcess = null;
let baseUrl = "";

try {
  validateFixture();
  verifySourceContract();
  fs.mkdirSync(sourceDir, { recursive: true });
  fs.mkdirSync(viewDir, { recursive: true });
  const ports = await freePortPair();
  baseUrl = `http://127.0.0.1:${ports.http}`;
  serverProcess = startServer(ports);
  await waitForHealth();
  await request("GET", "/ops/api/sources", undefined, 200);
  await request("GET", "/ops/api/views", undefined, 200);

  const createdPayload = pairPayload("atomic-create");
  const created = await request("PUT", route(), createdPayload, 201);
  assertCommitted(created.json, "committed-create");
  await assertPair("atomic-create");
  console.log("[pass] committed-create");

  await assertPrevalidationFailure("prevalidation-missing-published-view",
    { source: createdPayload.source }, "exactly one source and publishedView", 400);
  const nonOnvif = pairPayload("invalid-non-onvif");
  nonOnvif.source.tags = ["live"];
  await assertPrevalidationFailure("prevalidation-non-onvif-source", nonOnvif,
    "requires onvif and live source tags", 400);
  const mismatched = pairPayload("invalid-view-id");
  mismatched.publishedView.viewId = "9902";
  await assertPrevalidationFailure("prevalidation-view-id-mismatch", mismatched,
    "path viewId and body viewId must match", 400);

  const sourceBeforeFailure = fs.readFileSync(sourcePath, "utf8");
  const viewBeforeFailure = fs.readFileSync(viewPath, "utf8");
  const apiBeforeFailure = await pairSnapshot();
  fs.renameSync(viewDir, savedViewDir);
  fs.writeFileSync(viewDir, "fault: view registry parent is not a directory\n");
  try {
    const failedPayload = pairPayload("should-roll-back");
    const failed = await request("PUT", route(), failedPayload, 500);
    assert(failed.json.transactionStatus === "rolled-back", "second-write failure must report rolled-back");
    assert(failed.json.failedStage === "published-view-save", "wrong failed stage");
    assert(failed.json.sourceWriteSucceeded === true, "source write should precede injected view failure");
    assert(failed.json.publishedViewWriteSucceeded === false, "view write must fail");
    assert(failed.json.sourceRollbackAttempted === true, "source rollback was not attempted");
    assert(failed.json.sourceRollbackSucceeded === true, "source rollback did not succeed");
    assert(failed.json.publishedViewRollbackAttempted === false,
      "view rollback should not run when writer reports target not replaced");
    assert(failed.json.partialSave === false, "failed transaction reported a partial save");
    assert(!failed.text.includes(sourcePath) && !failed.text.includes(viewPath),
      "failure response exposed registry storage paths");
    assert(!failed.text.includes(failedPayload.source.rtspUrl),
      "failure response exposed source locator");
    assert(fs.readFileSync(sourcePath, "utf8") === sourceBeforeFailure,
      "source document changed after rollback");
    assert(fs.readFileSync(path.join(savedViewDir, "views.json"), "utf8") === viewBeforeFailure,
      "PublishedView document changed during injected failure");
    const apiAfterFailure = await pairSnapshot();
    assert(JSON.stringify(apiAfterFailure) === JSON.stringify(apiBeforeFailure),
      "in-memory source/view pair changed after rollback");
    console.log("[pass] second-write-failure-source-rollback");
  } finally {
    fs.rmSync(viewDir, { force: true });
    fs.renameSync(savedViewDir, viewDir);
  }

  const retried = await request("PUT", route(), pairPayload("retry-committed"), 200);
  assertCommitted(retried.json, "retry-after-fault");
  await assertPair("retry-committed");
  console.log("[pass] retry-after-fault");

  const [concurrentA, concurrentB] = await Promise.all([
    request("PUT", route(), pairPayload("concurrent-a"), 200),
    request("PUT", route(), pairPayload("concurrent-b"), 200),
  ]);
  assertCommitted(concurrentA.json, "concurrent-a");
  assertCommitted(concurrentB.json, "concurrent-b");
  const concurrentSnapshot = await pairSnapshot();
  const finalName = concurrentSnapshot.source.displayName;
  assert(finalName === "ONVIF concurrent-a" || finalName === "ONVIF concurrent-b",
    `unexpected concurrent source result: ${finalName}`);
  assert(concurrentSnapshot.view.displayName === finalName,
    "concurrent paired saves left mixed source/view display names");
  console.log("[pass] concurrent-pair-no-mix");

  await stopServer();
  serverProcess = null;
  serverProcess = startServer(ports);
  await waitForHealth();
  const restartSnapshot = await pairSnapshot();
  assert(JSON.stringify(restartSnapshot) === JSON.stringify(concurrentSnapshot),
    "restart source/view pair drifted from committed disk state");
  console.log("[pass] restart-pair-consistency");

  assert(findTemporaryFiles(workDir).length === 0,
    `temporary registry files remain: ${findTemporaryFiles(workDir).join(", ")}`);
  console.log("[pass] temporary-registry-files-cleaned");

  console.log("");
  console.log("== v3.9.0 ONVIF source/view atomicity ==");
  console.log(`- schema: ${fixture.schema}`);
  console.log(`- cases: ${fixture.cases.length}`);
  console.log("- storageMode: paired-write-with-compensating-rollback");
  console.log("- partialSaveAfterInjectedFailure: false");
  console.log("- restartConsistency: true");
  console.log("- failures: 0");
} finally {
  await stopServer();
  if (fs.existsSync(savedViewDir) && !fs.existsSync(viewDir)) fs.renameSync(savedViewDir, viewDir);
  fs.rmSync(workDir, { recursive: true, force: true });
}

function validateFixture() {
  assert(fixture.schema === "media-server.v390-onvif-source-view-atomicity-fixtures.v1", "fixture schema mismatch");
  assert(fixture.targetStep === "V390-ADD1-05", "fixture target step mismatch");
  assert(fixture.routeTemplate === "/ops/api/onvif/channels/{channelId}", "route template mismatch");
  assert(Array.isArray(fixture.cases) && fixture.cases.length === 8, "expected eight atomicity cases");
}

function verifySourceContract() {
  const registryHeader = read("include/ingress/source_view_registry.h");
  const registrySource = read("src/ingress/source_view_registry.cpp");
  const server = read("src/ingress/webrtc_http_server.cpp");
  const ui = read("src/ingress/product_ui_ops_sources_script.cpp");
  for (const snippet of [
    "UpsertOnvifSourceView", "target_replaced", "paired-write-with-compensating-rollback",
    "sourceRollbackAttempted", "publishedViewRollbackAttempted", "partialSave",
  ]) assert(`${registryHeader}\n${registrySource}`.includes(snippet), `registry contract missing ${snippet}`);
  for (const snippet of [
    "/ops/api/onvif/channels/", "require_source_write_principal", "exactly one source and publishedView",
    "UpsertOnvifSourceView",
  ]) assert(server.includes(snippet), `paired route missing ${snippet}`);
  for (const snippet of [
    "saveChannelSourceViewPair", "/ops/api/onvif/channels/", "publishedView: viewPayload",
    "await saveChannelSourceViewPair(channelId, sourcePayload, viewPayload)",
    "await saveChannelSourceViewPair(id, nextSource, nextView)",
  ]) assert(ui.includes(snippet), `Ops sources paired save UI missing ${snippet}`);
  const draftSource = read("src/ingress/onvif_live_import.cpp");
  assert(draftSource.includes("\\\"notSaved\\\":true"), "import draft no longer declares notSaved:true");
}

function pairPayload(suffix) {
  const displayName = `ONVIF ${suffix}`;
  return {
    source: {
      sourceId: channelId,
      displayName,
      kind: "rtsp",
      rtspUrl: `rtsp://192.0.2.40/live/${suffix}`,
      enabled: true,
      tags: ["onvif", "live"],
      ownerGroup: "atomicity-fixture",
      site: "fixture-site",
      group: "fixture-group",
      floor: "1",
      zone: "fixture-zone",
    },
    publishedView: {
      viewId: channelId,
      displayName,
      sourceId: channelId,
      defaultRuleId: "",
      allowedRuleIds: [],
      allowedOverlayModes: ["raw", "va-overlay", "va-rule"],
      showDashboard: true,
      showEvents: true,
      showMetadataSummary: true,
      clientGroups: [],
      maxTiles: 1,
      enabled: true,
    },
  };
}

async function assertPrevalidationFailure(label, payload, expectedError, expectedStatus) {
  const before = await pairSnapshot();
  const sourceBytes = fs.readFileSync(sourcePath, "utf8");
  const viewBytes = fs.readFileSync(viewPath, "utf8");
  const response = await request("PUT", route(), payload, expectedStatus);
  assert(response.text.includes(expectedError), `${label}: missing error ${expectedError}: ${response.text}`);
  assert(JSON.stringify(await pairSnapshot()) === JSON.stringify(before), `${label}: API pair changed`);
  assert(fs.readFileSync(sourcePath, "utf8") === sourceBytes, `${label}: source file changed`);
  assert(fs.readFileSync(viewPath, "utf8") === viewBytes, `${label}: view file changed`);
  console.log(`[pass] ${label}`);
}

function assertCommitted(payload, label) {
  assert(payload.ok === true, `${label}: response not ok`);
  assert(payload.transactionStatus === "committed", `${label}: transaction not committed`);
  assert(payload.consistencyStatus === "source-view-pair-committed", `${label}: consistency status mismatch`);
  assert(payload.sourceWriteSucceeded === true && payload.publishedViewWriteSucceeded === true,
    `${label}: paired write flags mismatch`);
  assert(payload.rollbackAttempted === false, `${label}: unexpected rollback`);
  assert(payload.partialSave === false, `${label}: partial save reported`);
}

async function assertPair(suffix) {
  const snapshot = await pairSnapshot();
  assert(snapshot.source.displayName === `ONVIF ${suffix}`, `source display mismatch for ${suffix}`);
  assert(snapshot.view.displayName === snapshot.source.displayName, `source/view display mismatch for ${suffix}`);
  assert(snapshot.view.sourceId === snapshot.source.sourceId, `source/view id mismatch for ${suffix}`);
}

async function pairSnapshot() {
  const sources = (await request("GET", "/ops/api/sources", undefined, 200)).json.sources || [];
  const views = (await request("GET", "/ops/api/views", undefined, 200)).json.views || [];
  return {
    source: sources.find(item => item.sourceId === channelId) || null,
    view: views.find(item => item.viewId === channelId) || null,
  };
}

function route() {
  return fixture.routeTemplate.replace("{channelId}", encodeURIComponent(channelId));
}

function startServer(ports) {
  const child = spawn("./server.sh", ["foreground"], {
    cwd: rootDir,
    env: {
      ...process.env,
      MEDIA_SERVER_SKIP_LOCAL_ENV: "1",
      MEDIA_SERVER_SKIP_BUILD: "1",
      MEDIA_SERVER_BUILD_DIR: process.env.MEDIA_SERVER_BUILD_DIR || path.join(rootDir, "build-gst-onnx"),
      MEDIA_SERVER_AUTH_MODE: "off",
      MEDIA_SERVER_LISTEN_ADDRESS: "127.0.0.1",
      MEDIA_SERVER_HTTP_LISTEN_ADDRESS: "127.0.0.1",
      MEDIA_SERVER_LISTEN_PORT: String(ports.rtsp),
      MEDIA_SERVER_HTTP_LISTEN_PORT: String(ports.http),
      MEDIA_SERVER_SOURCE_REGISTRY: sourcePath,
      MEDIA_SERVER_PUBLISHED_VIEWS: viewPath,
      MEDIA_SERVER_ANALYSIS_REGISTRY: path.join(workDir, "analysis.json"),
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
    if (serverLog.length > 160) serverLog.shift();
  }
}

async function waitForHealth() {
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

async function request(method, requestPath, body, expectedStatus) {
  const response = await fetch(`${baseUrl}${requestPath}`, {
    method,
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let json = {};
  try { json = JSON.parse(text); } catch {}
  assert(response.status === expectedStatus,
    `${method} ${requestPath}: expected HTTP ${expectedStatus}, got ${response.status}: ${text}`);
  return { status: response.status, text, json };
}

async function stopServer() {
  if (!serverProcess || serverProcess.exitCode !== null) return;
  const child = serverProcess;
  const exited = new Promise(resolve => child.once("exit", resolve));
  child.kill("SIGTERM");
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

function findTemporaryFiles(root) {
  const found = [];
  const visit = current => {
    if (!fs.existsSync(current)) return;
    const stat = fs.statSync(current);
    if (!stat.isDirectory()) {
      if (path.basename(current).includes(".tmp.")) found.push(current);
      return;
    }
    for (const entry of fs.readdirSync(current)) visit(path.join(current, entry));
  };
  visit(root);
  return found;
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
