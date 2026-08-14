#!/usr/bin/env node
// 파일 용도: REVIEW4-65 source/view numeric fixture를 실제 제품 parser와 throwaway registry에서 검증한다.

import fs from "node:fs";
import crypto from "node:crypto";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { fixtureViewerScopes } from "./v390_ui_case_runtime.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`V390 REVIEW4-65 actual product source/view fixture contract

Usage:
  ./server.sh verify-v390-review4-source-fixture-ids [--timeout-ms <ms>]

The verifier owns an isolated actual product server, ephemeral HTTP/RTSP ports, throwaway
registries, success/exception cleanup probes, and redacted status-only failure evidence.
It does not run the UI full suite.
`);
}
assertKnownOptions(rawArgs, ["timeout-ms", "h", "help"]);

const timeoutMs = numberOption("timeout-ms", 20000);
const fixtureIds = Object.freeze({
  "SRC-008": "3900008",
  "SRC-010": "3900010",
  "SRC-019": "3900019",
});
const baselineSourceId = "3900099";
const exceptionCleanupSourceId = "3900097";
const managedIds = new Set([...Object.values(fixtureIds), baselineSourceId, exceptionCleanupSourceId]);
const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), "media-server-v390-review4-source-fixtures-"));
const sourceFile = path.join(stateDir, "sources.json");
const viewFile = path.join(stateDir, "views.json");
const analysisFile = path.join(stateDir, "analysis.json");
const usersFile = path.join(stateDir, "users.json");
const eventFile = path.join(stateDir, "events.jsonl");
let httpPort = 0;
let rtspPort = 0;
let httpBase = "";
let server = null;
let adminCookie = "";
let operatorCookie = "";
const authPasswords = {
  admin: generatedPassword(),
  operator: generatedPassword(),
  viewer: generatedPassword(),
};
const authUsernames = {
  admin: "admin",
  operator: "review4_operator",
  viewer: "review4_viewer",
};
let primaryError = null;
let cleanupError = null;

try {
  writeSentinelRegistries();
  httpPort = await freePort();
  rtspPort = await freePort();
  while (rtspPort === httpPort) rtspPort = await freePort();
  httpBase = `http://127.0.0.1:${httpPort}`;
  server = startServer();
  await waitForServer();
  await bootstrapAuth();
  await runContract();
} catch (error) {
  primaryError = error;
} finally {
  try {
    await cleanupManagedRecords();
  } catch (error) {
    cleanupError = error;
  }
  try {
    await stopServer();
  } catch (error) {
    cleanupError ||= error;
  }
  try {
    fs.rmSync(stateDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    assert(!fs.existsSync(stateDir), "throwaway state root cleanup failed");
    if (httpPort) await assertPortReleased(httpPort, "http");
    if (rtspPort) await assertPortReleased(rtspPort, "rtsp");
  } catch (error) {
    cleanupError ||= error;
  }
}

if (primaryError || cleanupError) {
  const failures = [
    primaryError ? `primary=${safeError(primaryError)}` : "",
    cleanupError ? `cleanup=${safeError(cleanupError)}` : "",
  ].filter(Boolean);
  throw new Error(failures.join("; "));
}

console.log("");
console.log("== V390 REVIEW4-65 actual source/view fixture summary ==");
console.log(`- SRC-008 sourceId: ${fixtureIds["SRC-008"]}`);
console.log(`- SRC-010 sourceId/viewId: ${fixtureIds["SRC-010"]}`);
console.log(`- SRC-019 sourceId/viewId: ${fixtureIds["SRC-019"]}`);
console.log("- actual product parser: PASS");
console.log("- auth-enabled scoped viewer readback: PASS");
console.log("- users-file success/exception byte restoration: PASS");
console.log("- success cleanup: PASS");
console.log("- exception cleanup: PASS");
console.log("- pid/port/temp cleanup: PASS");
console.log("- failures: 0");

async function runContract() {
  await expectStatus("negative-source-id", "POST", "/ops/api/sources", 400, sourceFixture("not-numeric"));
  await expectStatus("negative-view-id", "POST", "/ops/api/views", 400,
    viewFixture("not-numeric", baselineSourceId));
  await expectStatus("negative-view-source-reference", "POST", "/ops/api/views", 400,
    viewFixture("3900096", "not-numeric"));

  await createSource(baselineSourceId, false, 201);
  await expectStatus("canonical-duplicate-without-opt-in", "POST", "/ops/api/sources", 409,
    sourceFixture("3900096", false));

  const src008 = fixtureIds["SRC-008"];
  assert(!(await sourceById(src008)), "SRC-008 initial source identity is not absent");
  const created008 = await createSource(src008, true, 201);
  assert(created008.status === "created" && created008.source?.sourceId === src008 &&
    created008.source?.enabled === true, "SRC-008 safe source create response drift");
  const readback008 = await sourceById(src008);
  assert(readback008?.sourceId === src008 && readback008.enabled === true,
    "SRC-008 authoritative source registry readback drift");
  await expectStatus("source-id-collision-with-opt-in", "POST", "/ops/api/sources", 409,
    sourceFixture(src008, true));
  await disableSource(src008, "SRC-008-cleanup");
  await assertSourceInactive(src008, "SRC-008");

  const src010 = fixtureIds["SRC-010"];
  await createPair(src010, "SRC-010");
  await assertUnrelatedViewerForbidden(src010, "SRC-010");
  await withFixtureScopedViewer(src010, "SRC-010", async cookie => {
    await expectStatus("SRC-010-active-client-readback", "GET",
      `/client/api/views/${encodeURIComponent(src010)}`, 200, null, { cookie });
    const disabled010 = await disableSource(src010, "SRC-010-delete-source");
    assert(disabled010.status === "disabled" && disabled010.source?.sourceId === src010 &&
      disabled010.source?.enabled === false, "SRC-010 source DELETE safe response drift");
    await assertSourceInactive(src010, "SRC-010");
    await expectStatus("SRC-010-disabled-client-readback", "GET",
      `/client/api/views/${encodeURIComponent(src010)}`, 404, null, { cookie });
  });
  assert((await enabledResidue(src010, "source")) === 0, "SRC-010 enabled source residue is not zero");
  await disableView(src010, "SRC-010-cleanup-view");

  const src019 = fixtureIds["SRC-019"];
  await createPair(src019, "SRC-019");
  await assertUnrelatedViewerForbidden(src019, "SRC-019");
  await withFixtureScopedViewer(src019, "SRC-019", async cookie => {
    await expectStatus("SRC-019-active-client-readback", "GET",
      `/client/api/views/${encodeURIComponent(src019)}`, 200, null, { cookie });
    const disabled019 = await disableView(src019, "SRC-019-delete-view");
    assert(disabled019.status === "disabled" && disabled019.view?.viewId === src019 &&
      disabled019.view?.sourceId === src019 && disabled019.view?.enabled === false,
    "SRC-019 view DELETE safe response drift");
    await assertViewInactive(src019, "SRC-019");
    await expectStatus("SRC-019-disabled-client-readback", "GET",
      `/client/api/views/${encodeURIComponent(src019)}`, 404, null, { cookie });
  });
  assert((await enabledResidue(src019, "view")) === 0, "SRC-019 enabled view residue is not zero");
  await disableSource(src019, "SRC-019-cleanup-source");

  const beforeException = fs.readFileSync(usersFile);
  let scopedReadbackFailure = "";
  try {
    await withFixtureScopedViewer(src019, "SRC-019-exception", async () => {
      throw new Error("injected-scoped-viewer-readback-failure");
    });
  } catch (error) {
    scopedReadbackFailure = safeError(error);
  }
  assert(scopedReadbackFailure === "injected-scoped-viewer-readback-failure",
    "scoped viewer exception did not preserve the primary failure");
  assert(fs.readFileSync(usersFile).equals(beforeException),
    "scoped viewer exception did not restore users file bytes");

  let injectedFailureObserved = false;
  try {
    await createSource(exceptionCleanupSourceId, true, 201);
    throw new Error("injected-cleanup-probe");
  } catch (error) {
    injectedFailureObserved = safeError(error) === "injected-cleanup-probe";
  } finally {
    await disableSource(exceptionCleanupSourceId, "exception-cleanup-probe");
  }
  assert(injectedFailureObserved, "exception cleanup did not preserve the original failure");
  await assertSourceInactive(exceptionCleanupSourceId, "exception-cleanup-probe");
}

async function createPair(id, kind) {
  assert(!(await sourceById(id)) && !(await viewById(id)), `${kind} initial source/view identity is not absent`);
  const source = await createSource(id, true, 201);
  const view = await requestJson(`${kind}-setup-view`, "POST", "/ops/api/views", [201], viewFixture(id, id));
  console.log(`[pass] ${kind}-setup-view POST /ops/api/views expected=201 actual=201`);
  assert(source.source?.sourceId === id && source.source?.enabled === true,
    `${kind} numeric source setup response drift`);
  assert(view.view?.viewId === id && view.view?.sourceId === id && view.view?.enabled === true,
    `${kind} numeric view setup response drift`);
}

async function createSource(id, allowDuplicateSource, expectedStatus) {
  const response = await requestJson(`${id}-source-setup`, "POST", "/ops/api/sources", [expectedStatus],
    sourceFixture(id, allowDuplicateSource));
  console.log(`[pass] ${id}-source-setup POST /ops/api/sources expected=${expectedStatus} actual=${expectedStatus}`);
  return response;
}

async function disableSource(id, kind) {
  const requestPath = `/ops/api/sources/${encodeURIComponent(id)}`;
  const response = await requestJson(kind, "DELETE", requestPath, [200], null);
  console.log(`[pass] ${kind} DELETE ${requestPath} expected=200 actual=200`);
  return response;
}

async function disableView(id, kind) {
  const requestPath = `/ops/api/views/${encodeURIComponent(id)}`;
  const response = await requestJson(kind, "DELETE", requestPath, [200], null);
  console.log(`[pass] ${kind} DELETE ${requestPath} expected=200 actual=200`);
  return response;
}

async function assertSourceInactive(id, kind) {
  const source = await sourceById(id);
  assert(!source || source.enabled === false, `${kind} source cleanup is neither absent nor disabled`);
}

async function assertViewInactive(id, kind) {
  const view = await viewById(id);
  assert(!view || view.enabled === false, `${kind} view cleanup is neither absent nor disabled`);
}

async function assertUnrelatedViewerForbidden(id, kind) {
  const cookie = await freshLogin("viewer");
  try {
    await expectStatus(`${kind}-unrelated-viewer`, "GET",
      `/client/api/views/${encodeURIComponent(id)}`, 403, null, { cookie });
  } finally {
    await logout(cookie);
  }
}

async function withFixtureScopedViewer(id, kind, readback) {
  const before = fs.readFileSync(usersFile);
  const scopes = fixtureViewerScopes(id);
  let cookie = "";
  let result;
  let primary = null;
  try {
    const store = JSON.parse(fs.readFileSync(usersFile, "utf8"));
    const viewer = (store.users || []).find(user => user?.username === authUsernames.viewer);
    assert(viewer?.role === "viewer", `${kind} viewer fixture is unavailable`);
    viewer.viewId = id;
    viewer.scopes = [...scopes];
    fs.writeFileSync(usersFile, `${JSON.stringify(store, null, 2)}\n`, { mode: 0o600 });
    assert(viewer.viewId === id && scopes.every(scope => viewer.scopes.includes(scope)),
      `${kind} viewer viewId/scope binding mismatch`);
    cookie = await freshLogin("viewer");
    const principal = await requestJson(
      `${kind}-viewer-whoami`, "GET", "/auth/whoami", [200], null, { cookie },
    );
    assert(principal.authenticated === true &&
      principal.username === authUsernames.viewer &&
      principal.role === "viewer" &&
      scopes.every(scope => principal.scopes?.includes(scope)),
    `${kind} fresh viewer principal scope mismatch`);
    result = await readback(cookie);
  } catch (error) {
    primary = error instanceof Error ? error : new Error(String(error));
  } finally {
    if (cookie) await logout(cookie);
    fs.writeFileSync(usersFile, before, { mode: 0o600 });
  }
  assert(fs.readFileSync(usersFile).equals(before),
    `${kind} users file byte restoration failed`);
  if (primary) throw primary;
  return result;
}

async function enabledResidue(id, recordKind) {
  const records = recordKind === "source"
    ? (await requestJson("source-list-readback", "GET", "/ops/api/sources", [200], null)).sources || []
    : (await requestJson("view-list-readback", "GET", "/ops/api/views", [200], null)).views || [];
  return records.filter(value => String(value?.[recordKind === "source" ? "sourceId" : "viewId"] || "") === id &&
    value?.enabled === true).length;
}

async function sourceById(id) {
  const payload = await requestJson("source-list-readback", "GET", "/ops/api/sources", [200], null);
  return (payload.sources || []).find(value => String(value?.sourceId || "") === id) || null;
}

async function viewById(id) {
  const payload = await requestJson("view-list-readback", "GET", "/ops/api/views", [200], null);
  return (payload.views || []).find(value => String(value?.viewId || "") === id) || null;
}

async function expectStatus(kind, method, requestPath, expected, body, options = {}) {
  await requestJson(kind, method, requestPath, [expected], body, options);
  console.log(`[pass] ${kind} ${method} ${requestPath} expected=${expected} actual=${expected}`);
}

async function requestJson(kind, method, requestPath, expectedStatuses, body, { cookie = "" } = {}) {
  const requestCookie = cookie ||
    (requestPath.startsWith("/ops/") ? operatorCookie : "");
  const response = await fetch(`${httpBase}${requestPath}`, {
    method,
    headers: {
      ...(requestCookie ? { Cookie: requestCookie } : {}),
      ...(body === null ? {} : { "content-type": "application/json" }),
    },
    ...(body === null ? {} : { body: JSON.stringify(body) }),
  });
  if (!expectedStatuses.includes(response.status)) {
    await response.body?.cancel().catch(() => {});
    throw statusFailure(kind, method, requestPath, expectedStatuses, response.status);
  }
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${kind} response JSON parse failed`);
  }
}

function sourceFixture(sourceId, allowDuplicateSource = true) {
  return {
    sourceId,
    displayName: `REVIEW4 ${sourceId} source`,
    kind: "file",
    file: "sample_h264.mp4",
    allowDuplicateSource,
    enabled: true,
    tags: ["review4", "throwaway"],
    zone: "REVIEW4",
  };
}

function viewFixture(viewId, sourceId) {
  return {
    viewId,
    sourceId,
    displayName: `REVIEW4 ${viewId} view`,
    allowedOverlayModes: ["raw", "va-overlay", "va-rule"],
    allowedRuleIds: [],
    clientGroups: ["default"],
    showDashboard: true,
    showEvents: true,
    showMetadataSummary: true,
    maxTiles: 1,
    enabled: true,
  };
}

function writeSentinelRegistries() {
  fs.writeFileSync(sourceFile, `${JSON.stringify({ sources: [{
    sourceId: "900000",
    displayName: "REVIEW4 disabled sentinel",
    kind: "file",
    file: "__review4_disabled_sentinel__.mp4",
    enabled: false,
  }] })}\n`);
  fs.writeFileSync(viewFile, `${JSON.stringify({ views: [{
    viewId: "900000",
    sourceId: "900000",
    displayName: "REVIEW4 disabled sentinel",
    allowedOverlayModes: ["raw"],
    allowedRuleIds: [],
    clientGroups: [],
    showDashboard: false,
    showEvents: false,
    showMetadataSummary: false,
    maxTiles: 1,
    enabled: false,
  }] })}\n`);
}

function startServer() {
  return spawn("./server.sh", ["foreground"], {
    cwd: rootDir,
    env: {
      ...process.env,
      MEDIA_SERVER_SKIP_LOCAL_ENV: "1",
      MEDIA_SERVER_SKIP_BUILD: "1",
      MEDIA_SERVER_AUTH_MODE: "auto",
      MEDIA_SERVER_SOURCE_REGISTRY: sourceFile,
      MEDIA_SERVER_PUBLISHED_VIEWS: viewFile,
      MEDIA_SERVER_ANALYSIS_REGISTRY: analysisFile,
      MEDIA_SERVER_AUTH_USERS_FILE: usersFile,
      MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_ENABLED: "0",
      MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_PATH: eventFile,
      MEDIA_SERVER_LISTEN_ADDRESS: "127.0.0.1",
      MEDIA_SERVER_HTTP_LISTEN_ADDRESS: "127.0.0.1",
      MEDIA_SERVER_LISTEN_PORT: String(rtspPort),
      MEDIA_SERVER_HTTP_LISTEN_PORT: String(httpPort),
      MEDIA_SERVER_FORCE_RTSP_TCP: "1",
    },
    stdio: ["ignore", "ignore", "ignore"],
  });
}

async function bootstrapAuth() {
  const setup = await postForm("/setup", {
    username: authUsernames.admin,
    password: authPasswords.admin,
    confirm: authPasswords.admin,
  });
  assert(setup.status === 302, `auth setup failed HTTP ${setup.status}`);
  adminCookie = await login("admin");
  await requestJson("operator-create", "POST", "/ops/api/users", [201], {
    username: authUsernames.operator,
    displayName: "REVIEW4 operator",
    role: "operator",
    password: authPasswords.operator,
    enabled: true,
    mustChangePassword: false,
  }, { cookie: adminCookie });
  await requestJson("viewer-create", "POST", "/ops/api/users", [201], {
    username: authUsernames.viewer,
    displayName: "REVIEW4 viewer",
    role: "viewer",
    viewId: baselineSourceId,
    password: authPasswords.viewer,
    enabled: true,
    mustChangePassword: false,
  }, { cookie: adminCookie });
  operatorCookie = await login("operator");
  const operator = await requestJson(
    "operator-whoami", "GET", "/auth/whoami", [200], null, { cookie: operatorCookie },
  );
  assert(operator.authenticated === true && operator.role === "operator",
    "operator credential readback failed");
  const viewerCookie = await freshLogin("viewer");
  try {
    const viewer = await requestJson(
      "viewer-whoami", "GET", "/auth/whoami", [200], null, { cookie: viewerCookie },
    );
    assert(viewer.authenticated === true && viewer.role === "viewer" &&
      fixtureViewerScopes(baselineSourceId).every(scope => viewer.scopes?.includes(scope)),
    "baseline viewer credential readback failed");
  } finally {
    await logout(viewerCookie);
  }
}

async function freshLogin(role) {
  return login(role);
}

async function login(role) {
  const response = await postForm("/login", {
    username: authUsernames[role],
    password: authPasswords[role],
  });
  assert(response.status === 302, `${role} login failed HTTP ${response.status}`);
  return cookieFromResponse(response);
}

async function logout(cookie) {
  await postForm("/logout", {}, { cookie }).catch(() => {});
}

async function postForm(requestPath, values, { cookie = "" } = {}) {
  return fetch(`${httpBase}${requestPath}`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: new URLSearchParams(values),
  });
}

function cookieFromResponse(response) {
  const pair = String(response.headers.get("set-cookie") || "").split(";", 1)[0];
  assert(/^[^=]+=.+/.test(pair), "auth login session cookie missing");
  return pair;
}

function generatedPassword() {
  const random = crypto.randomBytes(24).toString("base64url");
  return `V390!aA7-${random}`;
}

async function waitForServer() {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (server?.exitCode !== null) throw new Error("product server exited before readiness");
    try {
      const response = await fetch(`${httpBase}/health`);
      if (response.ok) return;
    } catch {
      // 제한된 횟수 안에서 readiness polling을 계속한다.
    }
    await delay(100);
  }
  throw new Error("product server readiness timeout");
}

async function cleanupManagedRecords() {
  if (!httpBase || server?.exitCode !== null) return;
  for (const id of managedIds) {
    await requestJson("cleanup-view", "DELETE", `/ops/api/views/${encodeURIComponent(id)}`, [200, 404], null)
      .catch(error => { throw new Error(`view cleanup failed: ${safeError(error)}`); });
    await requestJson("cleanup-source", "DELETE", `/ops/api/sources/${encodeURIComponent(id)}`, [200, 404], null)
      .catch(error => { throw new Error(`source cleanup failed: ${safeError(error)}`); });
  }
  const sources = readJsonIfPresent(sourceFile).sources || [];
  const views = readJsonIfPresent(viewFile).views || [];
  assert(!sources.some(value => managedIds.has(String(value?.sourceId || "")) && value?.enabled === true),
    "managed source cleanup retained enabled residue");
  assert(!views.some(value => managedIds.has(String(value?.viewId || "")) && value?.enabled === true),
    "managed view cleanup retained enabled residue");
}

async function stopServer() {
  if (!server || server.exitCode !== null) return;
  const exited = new Promise(resolve => server.once("exit", resolve));
  server.kill("SIGTERM");
  await Promise.race([
    exited,
    delay(5000).then(() => { throw new Error("product server termination timeout"); }),
  ]);
}

async function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" && address ? address.port : 0;
      probe.close(error => error ? reject(error) : resolve(port));
    });
  });
}

async function assertPortReleased(port, kind) {
  const probe = net.createServer();
  await new Promise((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(port, "127.0.0.1", resolve);
  }).catch(() => { throw new Error(`${kind} port cleanup failed`); });
  await new Promise((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
}

function statusFailure(kind, method, requestPath, expected, actual) {
  return new Error(JSON.stringify({
    kind,
    method,
    path: requestPath,
    expected: expected.length === 1 ? expected[0] : expected,
    actual,
  }));
}

function readJsonIfPresent(file) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
}

function numberOption(name, fallback) {
  const index = rawArgs.findIndex(value => value === `--${name}` || value.startsWith(`--${name}=`));
  if (index < 0) return fallback;
  const raw = rawArgs[index].includes("=")
    ? rawArgs[index].slice(rawArgs[index].indexOf("=") + 1)
    : rawArgs[index + 1];
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`--${name} must be positive`);
  return value;
}

function safeError(error) {
  return error instanceof Error ? error.message : String(error);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
