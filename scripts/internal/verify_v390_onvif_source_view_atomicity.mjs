#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: V390-REVIEW4-55 ONVIF source/PublishedView recoverable crash transaction을 실제 HTTP/파일/재시작으로 검증한다.

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
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
  - prepared/source/view/committed process crashes recover deterministically on restart.
  - bytes, existence, mode, API readback, retry, and transaction artifact cleanup are exact.
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

  await stopServer();
  serverProcess = null;
  const sourceDocument = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  const viewDocument = JSON.parse(fs.readFileSync(viewPath, "utf8"));
  sourceDocument.vendorRootExtension = { preserved: true, order: [3, 1, 2] };
  viewDocument.vendorRootExtension = { preserved: true, note: "view extension" };
  sourceDocument.sources.find(item => item.sourceId === channelId).vendorSourceExtension = { codec: "H265", profile: 7 };
  viewDocument.views.find(item => item.viewId === channelId).vendorViewExtension = { layout: "primary" };
  fs.writeFileSync(sourcePath, customDocument("sources", sourceDocument.sources, sourceDocument.vendorRootExtension));
  fs.writeFileSync(viewPath, customDocument("views", viewDocument.views, viewDocument.vendorRootExtension));
  fs.chmodSync(sourcePath, 0o600);
  fs.chmodSync(viewPath, 0o640);
  const sourceSnapshot = fileSnapshot(sourcePath);
  const viewSnapshot = fileSnapshot(viewPath);

  serverProcess = startServer(ports, "published view registry:before-replace");
  await waitForHealth();
  const apiBeforeFailure = await pairSnapshot();
  await assertSecondWriteRollback(apiBeforeFailure, sourceSnapshot, viewSnapshot);
  console.log("[pass] byte-exact-update-second-write-failure");

  await restartServer(ports, "published view registry:before-replace");
  const sourceOnlyApi = await pairSnapshot();
  fs.rmSync(viewPath);
  const sourceOnly = await request("PUT", route(), pairPayload("source-only-rollback"), 500);
  assert(sourceOnly.json.transactionStatus === "rolled-back" && sourceOnly.json.partialSave === false,
    "source-only rollback did not restore pre-transaction existence");
  assertFileSnapshot(sourcePath, sourceSnapshot, "source-only source bytes");
  assert(!fs.existsSync(viewPath), "source-only rollback created an absent view file");
  assert(JSON.stringify(await pairSnapshot()) === JSON.stringify(sourceOnlyApi), "source-only API memory changed");
  restoreSnapshot(viewPath, viewSnapshot);
  console.log("[pass] source-only-existence-rollback");

  await restartServer(ports, "published view registry:before-replace");
  const viewOnlyApi = await pairSnapshot();
  fs.rmSync(sourcePath);
  const viewOnly = await request("PUT", route(), pairPayload("view-only-rollback"), 500);
  assert(viewOnly.json.transactionStatus === "rolled-back" && viewOnly.json.partialSave === false,
    "view-only rollback did not restore pre-transaction existence");
  assert(!fs.existsSync(sourcePath), "view-only rollback retained a newly created source file");
  assertFileSnapshot(viewPath, viewSnapshot, "view-only view bytes");
  assert(JSON.stringify(await pairSnapshot()) === JSON.stringify(viewOnlyApi), "view-only API memory changed");
  restoreSnapshot(sourcePath, sourceSnapshot);
  console.log("[pass] view-only-existence-rollback");

  await restartServer(ports, "source registry:before-replace");
  const firstFailure = await request("PUT", route(), pairPayload("first-replace-failure"), 500);
  assert(firstFailure.json.failedStage === "source-save" && firstFailure.json.transactionStatus === "aborted-before-commit",
    "first replace failure status mismatch");
  assert(firstFailure.json.sourceWriteSucceeded === false && firstFailure.json.sourceRollbackAttempted === false,
    "first replace failure must remain zero-write");
  assertFileSnapshot(sourcePath, sourceSnapshot, "first replace source bytes");
  assertFileSnapshot(viewPath, viewSnapshot, "first replace view bytes");
  console.log("[pass] first-replace-failure-zero-write");

  await restartServer(ports,
    "published view registry:before-replace,source registry rollback snapshot:before-replace");
  const rollbackFailure = await request("PUT", route(), pairPayload("rollback-failure"), 500);
  assert(rollbackFailure.json.failedStage === "published-view-save" &&
    rollbackFailure.json.transactionStatus === "rollback-failed" &&
    rollbackFailure.json.sourceRollbackAttempted === true &&
    rollbackFailure.json.sourceRollbackSucceeded === false &&
    rollbackFailure.json.partialSave === true,
  "rollback failure was not reported as manual recovery required");
  assertFileSnapshot(viewPath, viewSnapshot, "rollback failure untouched view bytes");
  assert(!fs.readFileSync(sourcePath).equals(sourceSnapshot.bytes),
    "rollback failure fixture unexpectedly restored source bytes");
  const rollbackMarkerPath = `${sourcePath}.onvif-pair.txn`;
  const rollbackSourcePath = `${sourcePath}.onvif-pair.source.rollback`;
  assert(fs.existsSync(rollbackMarkerPath), "rollback failure did not retain prepared marker");
  assert(fs.readFileSync(rollbackMarkerPath, "utf8").includes("state=prepared"),
    "rollback failure marker is not prepared");
  assert(fs.existsSync(rollbackSourcePath), "rollback failure did not retain source snapshot");
  assert(fs.readFileSync(rollbackSourcePath).equals(sourceSnapshot.bytes),
    "rollback failure source artifact does not match pre-transaction bytes");
  await restartServer(ports);
  await pairSnapshot();
  assertFileSnapshot(sourcePath, sourceSnapshot, "rollback failure restart source recovery");
  assertFileSnapshot(viewPath, viewSnapshot, "rollback failure restart view recovery");
  console.log("[pass] rollback-failure-restart-recovery");

  for (const [stage, committed] of [
    ["after-prepared", false],
    ["after-source-replace", false],
    ["after-view-replace", false],
    ["after-committed", true],
  ]) {
    await assertCrashRecovery(ports, stage, committed, sourceSnapshot, viewSnapshot);
  }
  console.log("[pass] crash-recovery-mode-preservation");
  console.log("[pass] crash-recovery-retry");

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

  assert(findTransactionArtifacts(workDir).length === 0,
    `transaction artifacts remain: ${findTransactionArtifacts(workDir).join(", ")}`);
  console.log("[pass] transaction-artifacts-cleaned");

  console.log("");
  console.log("== v3.9.0 ONVIF source/view atomicity ==");
  console.log(`- schema: ${fixture.schema}`);
  console.log(`- cases: ${fixture.cases.length}`);
  console.log("- storageMode: paired-write-with-compensating-rollback");
  console.log("- successfulRollbackPartialSave: false");
  console.log("- injectedRollbackFailureReported: true");
  console.log("- crashRecoveryStages: 4");
  console.log("- crashRecoveryModePreserved: true");
  console.log("- restartConsistency: true");
  console.log("- failures: 0");
} finally {
  await stopServer();
  fs.rmSync(workDir, { recursive: true, force: true });
}

function validateFixture() {
  assert(fixture.schema === "media-server.v390-onvif-source-view-atomicity-fixtures.v2", "fixture schema mismatch");
  assert(fixture.targetStep === "V390-REVIEW4-55", "fixture target step mismatch");
  assert(fixture.routeTemplate === "/ops/api/onvif/channels/{channelId}", "route template mismatch");
  assert(Array.isArray(fixture.cases) && fixture.cases.length === 19, "expected nineteen atomicity cases");
}

function verifySourceContract() {
  const registryHeader = read("include/ingress/source_view_registry.h");
  const registrySource = read("src/ingress/source_view_registry.cpp");
  const server = readWebRtcHttpServerBundle(read);
  const ui = read("src/ingress/product_ui_ops_sources_script.cpp");
  for (const snippet of [
    "UpsertOnvifSourceView", "target_replaced", "paired-write-with-compensating-rollback",
    "sourceRollbackAttempted", "publishedViewRollbackAttempted", "partialSave",
    "RegistryFileSnapshot", "OnvifSourceViewTransaction", "PrepareOnvifSourceViewTransaction",
    "RecoverOnvifSourceViewTransaction", "media-server.onvif-source-view-transaction.v1",
    "after-source-replace", "after-view-replace", "after-committed",
    "MEDIA_SERVER_TEST_ONVIF_SOURCE_VIEW_CRASH_AT", "MEDIA_SERVER_TEST_REGISTRY_WRITE_FAILURES",
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

async function assertSecondWriteRollback(apiBeforeFailure, sourceSnapshot, viewSnapshot) {
  const failedPayload = pairPayload("should-roll-back-byte-exact");
  const failed = await request("PUT", route(), failedPayload, 500);
  assert(failed.json.transactionStatus === "rolled-back", "second-write failure must report rolled-back");
  assert(failed.json.failedStage === "published-view-save", "wrong failed stage");
  assert(failed.json.sourceWriteSucceeded === true, "source write should precede injected view failure");
  assert(failed.json.publishedViewWriteSucceeded === false, "view write must fail");
  assert(failed.json.sourceRollbackAttempted === true && failed.json.sourceRollbackSucceeded === true,
    "source byte snapshot rollback did not succeed");
  assert(failed.json.publishedViewRollbackAttempted === false,
    "view rollback should not run before target replacement");
  const partialSave = failed.json.partialSave;
  const registryWritePerformedAfterRollback = partialSave ||
    JSON.stringify(await pairSnapshot()) !== JSON.stringify(apiBeforeFailure);
  assert(registryWritePerformedAfterRollback === false && partialSave === false,
    "failed transaction reported a partial save or changed independent GET readback");
  assert(!failed.text.includes(sourcePath) && !failed.text.includes(viewPath),
    "failure response exposed registry storage paths");
  assert(!failed.text.includes(failedPayload.source.rtspUrl), "failure response exposed source locator");
  assertFileSnapshot(sourcePath, sourceSnapshot, "byte-exact source update rollback");
  assertFileSnapshot(viewPath, viewSnapshot, "unchanged view update rollback");
}

async function assertCrashRecovery(ports, stage, committed, sourceSnapshot, viewSnapshot) {
  await stopServer();
  serverProcess = null;
  restoreSnapshot(sourcePath, sourceSnapshot);
  restoreSnapshot(viewPath, viewSnapshot);
  serverProcess = startServer(ports, "", stage);
  await waitForHealth();
  const before = await pairSnapshot();
  const suffix = `crash-${stage}`;
  await requestExpectCrash(route(), pairPayload(suffix), stage);

  const crashSourceSnapshot = fileSnapshot(sourcePath);
  const crashViewSnapshot = fileSnapshot(viewPath);
  serverProcess = startServer(ports);
  await waitForHealth();
  if (committed) {
    await assertPair(suffix);
    assertFileSnapshot(sourcePath, crashSourceSnapshot, `${stage} committed source bytes`);
    assertFileSnapshot(viewPath, crashViewSnapshot, `${stage} committed view bytes`);
  } else {
    assert(JSON.stringify(await pairSnapshot()) === JSON.stringify(before),
      `${stage}: prepared transaction did not restore prior API pair`);
    assertFileSnapshot(sourcePath, sourceSnapshot, `${stage} source recovery`);
    assertFileSnapshot(viewPath, viewSnapshot, `${stage} view recovery`);
  }
  assert((fs.statSync(sourcePath).mode & 0o777) === sourceSnapshot.mode,
    `${stage}: source mode drift`);
  assert((fs.statSync(viewPath).mode & 0o777) === viewSnapshot.mode,
    `${stage}: view mode drift`);
  assert(findTransactionArtifacts(workDir).length === 0,
    `${stage}: recovery left artifacts: ${findTransactionArtifacts(workDir).join(", ")}`);
  console.log(`[pass] crash-${stage}-recovery`);

  const retrySuffix = `retry-${stage}`;
  const retry = await request("PUT", route(), pairPayload(retrySuffix), 200);
  assertCommitted(retry.json, `retry-${stage}`);
  await assertPair(retrySuffix);
  assert((fs.statSync(sourcePath).mode & 0o777) === sourceSnapshot.mode,
    `${stage}: retry source mode drift`);
  assert((fs.statSync(viewPath).mode & 0o777) === viewSnapshot.mode,
    `${stage}: retry view mode drift`);
}

async function assertPair(suffix) {
  const snapshot = await pairSnapshot();
  const uiSource = read("src/ingress/product_ui_ops_sources_script.cpp");
  const legacySequentialWrite = /await\s+requestJson\(`\/ops\/api\/sources\/[\s\S]{0,500}await\s+requestJson\(`\/ops\/api\/views\//.test(uiSource);
  assert(legacySequentialWrite === false, "ONVIF form save must not use legacy sequential source/view writes");
  assert(snapshot.source.sourceId === channelId && snapshot.view.viewId === channelId,
    "paired channelId runtime readback mismatch");
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

function customDocument(key, items, extension) {
  return `{\n\t"vendorRootExtension" : ${JSON.stringify(extension)},\n\t"${key}" : ${JSON.stringify(items, null, 3)}\n}\n\n`;
}

function fileSnapshot(filePath) {
  return {
    exists: fs.existsSync(filePath),
    bytes: fs.existsSync(filePath) ? fs.readFileSync(filePath) : Buffer.alloc(0),
    mode: fs.existsSync(filePath) ? fs.statSync(filePath).mode & 0o777 : null,
  };
}

function assertFileSnapshot(filePath, snapshot, label) {
  assert(fs.existsSync(filePath) === snapshot.exists, `${label}: existence drift`);
  if (!snapshot.exists) return;
  const actualBytes = fs.readFileSync(filePath);
  assert(actualBytes.equals(snapshot.bytes),
    `${label}: byte drift expected=${snapshot.bytes.length}/${sha256(snapshot.bytes)} actual=${actualBytes.length}/${sha256(actualBytes)}`);
  assert((fs.statSync(filePath).mode & 0o777) === snapshot.mode, `${label}: mode drift`);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function restoreSnapshot(filePath, snapshot) {
  if (!snapshot.exists) {
    fs.rmSync(filePath, { force: true });
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, snapshot.bytes);
  fs.chmodSync(filePath, snapshot.mode);
}

async function restartServer(ports, failureInjection = "") {
  await stopServer();
  serverProcess = null;
  serverProcess = startServer(ports, failureInjection);
  await waitForHealth();
}

function startServer(ports, failureInjection = "", crashAt = "") {
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
      MEDIA_SERVER_ENABLE_TEST_FAILURE_INJECTION: failureInjection || crashAt ? "1" : "0",
      MEDIA_SERVER_TEST_REGISTRY_WRITE_FAILURES: failureInjection,
      MEDIA_SERVER_TEST_ONVIF_SOURCE_VIEW_CRASH_AT: crashAt,
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

async function requestExpectCrash(requestPath, body, stage) {
  const child = serverProcess;
  assert(child && child.exitCode === null, `${stage}: server is not running before crash request`);
  const exited = new Promise(resolve => child.once("exit", (code, signal) => resolve({ code, signal })));
  try {
    await fetch(`${baseUrl}${requestPath}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {}
  const result = await Promise.race([
    exited,
    delay(10000).then(() => ({ code: null, signal: "timeout" })),
  ]);
  assert(result.code === 86 && result.signal === null,
    `${stage}: expected process exit 86, got code=${result.code} signal=${result.signal}`);
  serverProcess = null;
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

function findTransactionArtifacts(root) {
  const found = [];
  const visit = current => {
    if (!fs.existsSync(current)) return;
    const stat = fs.statSync(current);
    if (!stat.isDirectory()) {
      const name = path.basename(current);
      if (name.includes(".tmp.") || name.includes(".onvif-pair.")) found.push(current);
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
