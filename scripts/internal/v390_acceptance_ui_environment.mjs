// 파일 용도: v3.9.0 acceptance가 throwaway UI server/auth/browser/storage-state/cleanup을 자체 소유하게 한다.

import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { createHash, randomBytes } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

import {
  resolveNativeBrowserExecutable,
  resolvePlaywrightModule,
} from "./v390_ui_native_adapter.mjs";

const descriptorSchema = "media-server.v390-ui-runtime-descriptor.v1";
const environmentSchema = "media-server.v390-acceptance-ui-environment.v1";
const cleanupSchema = "media-server.v390-cleanup-measurement.v1";
const roleStateSchema = "media-server.v390-ui-role-state-map.v1";
const roles = ["admin", "operator", "viewer", "integrator"];
const usernames = {
  admin: "admin",
  operator: "ui_operator",
  viewer: "ui_viewer",
  integrator: "ui_integrator",
};

export async function startSelfContainedUiEnvironment({
  rootDir,
  runId,
  fixtureMode = false,
  playwrightModulePath = "",
  chromePath = "",
  buildPath = "build-gst-onnx/media_server",
  timeoutMs = 30000,
  maxPortAttempts = 8,
} = {}) {
  assert(rootDir && path.isAbsolute(rootDir), "self-contained UI rootDir must be absolute");
  assert(runId, "self-contained UI runId is required");
  assert(Number.isInteger(maxPortAttempts) && maxPortAttempts >= 1 && maxPortAttempts <= 32,
    "self-contained UI maxPortAttempts must be 1..32");

  const state = createState({ rootDir, runId, fixtureMode, buildPath, timeoutMs, maxPortAttempts });
  try {
    prepareTemporaryState(state);
    if (fixtureMode) return await startFixtureEnvironment(state);

    const dependency = await bootstrapPlaywrightDependency({ playwrightModulePath, chromePath });
    state.dependency = dependency.attestation;
    state.playwright = dependency.playwright;
    state.browserExecutable = dependency.browserExecutable;
    state.browser = dependency.browser;

    prepareRegistrySeed(state);
    state.server = await startOwnedServerWithBoundedRetry(state);
    state.runtimeAcquired = true;
    await bootstrapAuthAndStorageStates(state);
    await state.browser.close();
    state.browser = null;
    assertGeneratedSecretsAbsentFromDisk(state);
    writeRuntimeDescriptor(state);

    const attestation = buildEnvironmentAttestation(state, "PASS");
    return buildHandle(state, attestation);
  } catch (error) {
    const reason = redactMessage(error instanceof Error ? error.message : String(error), state.secretValues);
    const cleanup = await cleanupState(state, { requireRuntimeMeasurement: false });
    const wrapped = new Error(reason);
    wrapped.uiEnvironment = buildEnvironmentAttestation(state, "FAIL", reason);
    wrapped.cleanup = cleanup;
    throw wrapped;
  }
}

export async function stopSelfContainedUiEnvironment(handle) {
  if (!handle || typeof handle.cleanup !== "function") return noEnvironmentCleanup();
  return handle.cleanup();
}

export function listListenerPids(port) {
  if (!Number.isInteger(Number(port)) || Number(port) <= 0 || Number(port) > 65535) return [];
  try {
    return [...new Set(execFileSync("lsof", [
      "-nP",
      `-iTCP:${Number(port)}`,
      "-sTCP:LISTEN",
      "-t",
    ], { encoding: "utf8" })
      .split(/\r?\n/)
      .map(value => Number(value.trim()))
      .filter(Number.isInteger))];
  } catch {
    return [];
  }
}

function createState({ rootDir, runId, fixtureMode, buildPath, timeoutMs, maxPortAttempts }) {
  return {
    rootDir,
    runId,
    fixtureMode,
    buildPath: path.resolve(rootDir, buildPath),
    timeoutMs,
    maxPortAttempts,
    temporaryRoot: "",
    registryDir: "",
    seedPlanPath: "",
    seedPreconditionsPath: "",
    usersPath: "",
    sourcesPath: "",
    viewsPath: "",
    analysisPath: "",
    eventPath: "",
    preferencesPath: "",
    snapshotDir: "",
    clipDir: "",
    serverLogPath: "",
    roleStateMapPath: "",
    runtimeDescriptorPath: "",
    roleStatePaths: {},
    viewId: "",
    httpPort: 0,
    rtspPort: 0,
    httpBase: "",
    server: null,
    browser: null,
    playwright: null,
    browserExecutable: "",
    dependency: null,
    attempts: [],
    runtimeAcquired: false,
    cleaned: false,
    cleanupEvidence: null,
    secretValues: [],
    roleSecretsJson: "",
  };
}

function prepareTemporaryState(state) {
  state.temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), "media_server_v390_ui-"));
  fs.chmodSync(state.temporaryRoot, 0o700);
  state.registryDir = path.join(state.temporaryRoot, "registry");
  state.seedPlanPath = path.join(state.temporaryRoot, "seed-plan.json");
  state.seedPreconditionsPath = path.join(state.registryDir, "preconditions.json");
  state.usersPath = path.join(state.temporaryRoot, "auth-users.json");
  state.sourcesPath = path.join(state.registryDir, "sources.json");
  state.viewsPath = path.join(state.registryDir, "views.json");
  state.analysisPath = path.join(state.registryDir, "analysis.json");
  state.eventPath = path.join(state.temporaryRoot, "events.jsonl");
  state.preferencesPath = clientLiveLayoutPreferenceStoragePath(state.sourcesPath);
  state.snapshotDir = path.join(state.temporaryRoot, "snapshots");
  state.clipDir = path.join(state.temporaryRoot, "clips");
  state.serverLogPath = path.join(state.temporaryRoot, "media-server.log");
  state.roleStateMapPath = path.join(state.temporaryRoot, "role-state-map.json");
  state.runtimeDescriptorPath = path.join(state.temporaryRoot, "runtime-descriptor.json");
  state.roleStatePaths = Object.fromEntries(roles.map(role => [
    role,
    path.join(state.temporaryRoot, `storage-state-${role}.json`),
  ]));
  fs.mkdirSync(state.registryDir, { recursive: true, mode: 0o700 });
  fs.mkdirSync(state.snapshotDir, { recursive: true, mode: 0o700 });
  fs.mkdirSync(state.clipDir, { recursive: true, mode: 0o700 });
  fs.writeFileSync(state.eventPath, "", { mode: 0o600 });
}

export function clientLiveLayoutPreferenceStoragePath(sourceRegistryPath) {
  assert(sourceRegistryPath, "source registry path is required for client preference ownership");
  return path.join(
    path.dirname(path.resolve(sourceRegistryPath)),
    ".media_server.client_live_layout_preferences.jsonl",
  );
}

async function startFixtureEnvironment(state) {
  fs.mkdirSync(state.registryDir, { recursive: true, mode: 0o700 });
  writeSecureJson(state.sourcesPath, { sources: [] });
  writeSecureJson(state.viewsPath, { views: [] });
  writeSecureJson(state.analysisPath, { profiles: [], rules: [], vaRules: [] });
  writeSecureJson(state.usersPath, { users: [] });
  state.viewId = "9001";
  state.httpPort = 18000 + (process.pid % 1000);
  state.rtspPort = 19000 + (process.pid % 1000);
  state.httpBase = `http://127.0.0.1:${state.httpPort}`;
  for (const role of roles) writeSecureJson(state.roleStatePaths[role], { cookies: [], origins: [] });
  writeRoleStateMap(state);
  state.dependency = {
    status: "dependency-bootstrap-attestation",
    engine: "playwright-native",
    fixtureMode: true,
    modulePath: "fixture-not-loaded",
    moduleVersion: "not-run",
    modulePackageSha256: "",
    browserExecutable: "fixture-not-launched",
    browserVersion: "not-run",
    browserLaunchVerified: false,
    evidenceBoundary: "fixture contract wiring is not browser dependency execution evidence",
  };
  writeRuntimeDescriptor(state);
  return buildHandle(state, buildEnvironmentAttestation(state, "PASS"));
}

async function bootstrapPlaywrightDependency({ playwrightModulePath, chromePath }) {
  const resolved = resolvePlaywrightModule({
    modulePath: playwrightModulePath,
    requireExplicit: Boolean(playwrightModulePath),
  });
  const explicitExecutable = resolveNativeBrowserExecutable(chromePath);
  const managedExecutable = resolved.playwright.chromium.executablePath();
  const browserExecutable = explicitExecutable || managedExecutable;
  assert(browserExecutable && fs.existsSync(browserExecutable),
    `native Playwright browser executable unavailable: ${browserExecutable || "missing"}`);
  const browser = await resolved.playwright.chromium.launch({
    headless: true,
    ...(explicitExecutable ? { executablePath: explicitExecutable } : {}),
  });
  const packagePath = path.join(resolved.modulePath, "package.json");
  return {
    playwright: resolved.playwright,
    browser,
    browserExecutable: fs.realpathSync(browserExecutable),
    attestation: {
      status: "dependency-bootstrap-attestation",
      engine: "playwright-native",
      fixtureMode: false,
      modulePath: resolved.modulePath,
      moduleVersion: resolved.moduleVersion,
      modulePackageSha256: sha256File(packagePath),
      browserExecutable: fs.realpathSync(browserExecutable),
      browserVersion: browser.version(),
      browserLaunchVerified: true,
      fallbackUsed: false,
      resolutionAttempts: resolved.attempts.map(item => ({
        candidate: item.candidate,
        status: item.status,
        version: item.version || "",
        reason: item.reason || "",
      })),
    },
  };
}

function prepareRegistrySeed(state) {
  assert(fs.existsSync(state.buildPath), `acceptance UI build does not exist: ${state.buildPath}`);
  execFileSync(path.join(state.rootDir, "server.sh"), [
    "prepare-manual-ui-fulltest-seed",
    "--dry-run",
    "--emit-plan", state.seedPlanPath,
    "--emit-registry-dir", state.registryDir,
  ], {
    cwd: state.rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, MEDIA_SERVER_SKIP_LOCAL_ENV: "1" },
  });
  for (const required of [state.seedPlanPath, state.sourcesPath, state.viewsPath, state.analysisPath, state.seedPreconditionsPath]) {
    assert(fs.existsSync(required), `acceptance UI seed output missing: ${required}`);
  }
  const views = readJson(state.viewsPath).views || [];
  state.viewId = String(views.find(item => item?.enabled !== false)?.viewId || "");
  assert(state.viewId, "acceptance UI seed contains no enabled PublishedView");
}

async function startOwnedServerWithBoundedRetry(state) {
  let lastReason = "";
  for (let attempt = 1; attempt <= state.maxPortAttempts; attempt += 1) {
    state.httpPort = await probeEphemeralPort();
    state.rtspPort = await probeEphemeralPort();
    while (state.rtspPort === state.httpPort) state.rtspPort = await probeEphemeralPort();
    state.httpBase = `http://127.0.0.1:${state.httpPort}`;
    const record = spawnOwnedServer(state, attempt);
    state.server = record;
    try {
      const readiness = await waitForOwnedServer(record, state);
      state.attempts.push({
        attempt,
        httpPort: state.httpPort,
        rtspPort: state.rtspPort,
        pid: record.child.pid,
        status: "owned-ready",
        readiness,
      });
      return record;
    } catch (error) {
      lastReason = redactMessage(error instanceof Error ? error.message : String(error), state.secretValues);
      const listenerPids = {
        http: listListenerPids(state.httpPort),
        rtsp: listListenerPids(state.rtspPort),
      };
      const stopped = await stopOwnedChild(record);
      if (stopped) await closeLog(record);
      state.attempts.push({
        attempt,
        httpPort: state.httpPort,
        rtspPort: state.rtspPort,
        pid: record.child.pid,
        status: "retry-after-unowned-or-unready",
        listenerPids,
        reason: lastReason,
      });
      if (!stopped) {
        throw new Error(`self-contained UI retry child did not stop: pid=${record.child.pid}`);
      }
      state.server = null;
    }
  }
  throw new Error(`self-contained UI server failed after ${state.maxPortAttempts} bounded attempts: ${lastReason}`);
}

function spawnOwnedServer(state, attempt) {
  const log = fs.createWriteStream(state.serverLogPath, { flags: "a", mode: 0o600 });
  log.write(`[acceptance-ui] server attempt=${attempt}\n`);
  const child = spawn("./server.sh", ["foreground"], {
    cwd: state.rootDir,
    env: {
      ...process.env,
      MEDIA_SERVER_SKIP_LOCAL_ENV: "1",
      MEDIA_SERVER_SKIP_BUILD: "1",
      MEDIA_SERVER_SKIP_ENV_CHECK: "1",
      MEDIA_SERVER_BIN_PATH: state.buildPath,
      MEDIA_SERVER_AUTH_MODE: "auto",
      MEDIA_SERVER_AUTH_USERS_FILE: state.usersPath,
      MEDIA_SERVER_SOURCE_REGISTRY: state.sourcesPath,
      MEDIA_SERVER_PUBLISHED_VIEWS: state.viewsPath,
      MEDIA_SERVER_ANALYSIS_REGISTRY: state.analysisPath,
      MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_ENABLED: "1",
      MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_PATH: state.eventPath,
      MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_HOOK_ENABLED: "1",
      MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_DIR: state.snapshotDir,
      MEDIA_SERVER_ANALYSIS_EVENT_CLIP_HOOK_ENABLED: "1",
      MEDIA_SERVER_ANALYSIS_EVENT_CLIP_DIR: state.clipDir,
      MEDIA_SERVER_LISTEN_ADDRESS: "127.0.0.1",
      MEDIA_SERVER_HTTP_LISTEN_ADDRESS: "127.0.0.1",
      MEDIA_SERVER_LISTEN_PORT: String(state.rtspPort),
      MEDIA_SERVER_HTTP_LISTEN_PORT: String(state.httpPort),
      MEDIA_SERVER_FORCE_RTSP_TCP: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", chunk => log.write(chunk));
  child.stderr.on("data", chunk => log.write(chunk));
  return { child, log, attempt };
}

async function waitForOwnedServer(record, state) {
  const deadline = Date.now() + state.timeoutMs;
  let lastReason = "health not ready";
  while (Date.now() < deadline) {
    if (record.child.exitCode !== null || record.child.signalCode !== null) {
      throw new Error(`owned server exited before readiness: exit=${record.child.exitCode} signal=${record.child.signalCode || ""}`);
    }
    try {
      const response = await fetch(`${state.httpBase}/health`, { cache: "no-store" });
      if (response.ok) {
        const httpOwners = listListenerPids(state.httpPort);
        const rtspOwners = listListenerPids(state.rtspPort);
        const pid = record.child.pid;
        const exactOwnership = httpOwners.length > 0 && rtspOwners.length > 0 &&
          httpOwners.every(owner => owner === pid) && rtspOwners.every(owner => owner === pid);
        const commandIdentity = readCommandIdentity(pid);
        if (exactOwnership && /(?:^|\/)media_server(?:\s|$)/.test(commandIdentity)) {
          return { status: response.status, httpOwners, rtspOwners, commandIdentity };
        }
        lastReason = `health ready without exact child ownership: pid=${pid} http=${httpOwners.join(",")} rtsp=${rtspOwners.join(",")}`;
      } else {
        lastReason = `health HTTP ${response.status}`;
      }
    } catch (error) {
      lastReason = error instanceof Error ? error.message : String(error);
    }
    await delay(100);
  }
  throw new Error(`owned server readiness timeout: ${lastReason}`);
}

async function bootstrapAuthAndStorageStates(state) {
  const secrets = Object.fromEntries(roles.map(role => [role, generatePassword(usernames[role])]));
  const fixturePassword = generatePassword();
  state.secretValues = [...Object.values(secrets), fixturePassword];
  state.roleSecretsJson = JSON.stringify({ roles: secrets, refs: { fixturePassword } });

  const adminContext = await state.browser.newContext();
  try {
    await expectResponse(adminContext.request.post(`${state.httpBase}/setup`, {
      form: { username: usernames.admin, password: secrets.admin, confirm: secrets.admin },
      maxRedirects: 0,
    }), 302, "admin setup");
    await loginAndVerify(adminContext, state.httpBase, usernames.admin, secrets.admin, "admin", "/ops/home");
    await writeStorageState(adminContext, state.roleStatePaths.admin);

    for (const role of ["operator", "viewer", "integrator"]) {
      const payload = {
        username: usernames[role],
        displayName: `V390 Acceptance ${role}`,
        role,
        password: secrets[role],
        enabled: true,
        mustChangePassword: false,
        ...(["viewer", "integrator"].includes(role) ? { viewId: state.viewId } : {}),
      };
      const response = await expectResponse(adminContext.request.post(`${state.httpBase}/ops/api/users`, {
        data: payload,
      }), 201, `create ${role}`);
      const body = await response.json();
      assert(body?.user?.role === role && body?.user?.username === usernames[role], `${role} create readback mismatch`);
      assert(!/(?:passwordHash|passwordHistory|tokenHash)/.test(JSON.stringify(body)), `${role} create response leaked auth material`);
    }
  } finally {
    await adminContext.close();
  }

  for (const role of ["operator", "viewer", "integrator"]) {
    const context = await state.browser.newContext();
    try {
      const expectedLanding = role === "operator" ? "/ops/home" : (role === "viewer" ? "/client/live" : "/auth/whoami");
      await loginAndVerify(context, state.httpBase, usernames[role], secrets[role], role, expectedLanding);
      await writeStorageState(context, state.roleStatePaths[role]);
    } finally {
      await context.close();
    }
  }
  writeRoleStateMap(state);
  const usersMode = fs.statSync(state.usersPath).mode & 0o777;
  assert(usersMode === 0o600, `auth users file mode must be 0600, observed ${usersMode.toString(8)}`);
}

async function loginAndVerify(context, httpBase, username, password, expectedRole, expectedLanding) {
  const login = await expectResponse(context.request.post(`${httpBase}/login`, {
    form: { username, password },
    maxRedirects: 0,
  }), 302, `${expectedRole} login`);
  const location = login.headers().location || "";
  assert(location === expectedLanding, `${expectedRole} login landing mismatch: ${location}`);
  const whoami = await expectResponse(context.request.get(`${httpBase}/auth/whoami`), 200, `${expectedRole} whoami`);
  const body = await whoami.json();
  assert(body?.authenticated === true && body?.username === username && body?.role === expectedRole,
    `${expectedRole} whoami principal mismatch`);
  assert(!/(?:passwordHash|passwordHistory|tokenHash|sessionId)/.test(JSON.stringify(body)),
    `${expectedRole} whoami leaked auth material`);
}

async function expectResponse(promise, expectedStatus, label) {
  const response = await promise;
  if (response.status() !== expectedStatus) {
    const body = (await response.text()).slice(0, 300);
    throw new Error(`${label} expected HTTP ${expectedStatus}, observed ${response.status()}: ${body}`);
  }
  return response;
}

async function writeStorageState(context, filePath) {
  await context.storageState({ path: filePath });
  fs.chmodSync(filePath, 0o600);
  const mode = fs.statSync(filePath).mode & 0o777;
  assert(mode === 0o600, `role storage-state mode must be 0600: ${filePath}`);
}

function writeRoleStateMap(state) {
  writeSecureJson(state.roleStateMapPath, {
    schema: roleStateSchema,
    generatedBy: "role-storage-state-generated-by-acceptance",
    roles: Object.fromEntries(roles.map(role => [role, state.roleStatePaths[role]])),
  });
}

function writeRuntimeDescriptor(state) {
  writeSecureJson(state.runtimeDescriptorPath, buildRuntimeDescriptor(state));
}

function buildRuntimeDescriptor(state) {
  return {
    schema: descriptorSchema,
    runId: state.runId,
    fixtureMode: state.fixtureMode,
    temporaryRoot: state.temporaryRoot,
    httpBase: state.httpBase,
    httpPort: state.httpPort,
    rtspPort: state.rtspPort,
    serverPid: state.server?.child?.pid || 0,
    serverLogPath: state.serverLogPath,
    roleStateMapPath: state.roleStateMapPath,
    stateFiles: [
      state.usersPath,
      state.sourcesPath,
      state.viewsPath,
      state.analysisPath,
      state.eventPath,
      state.preferencesPath,
    ],
    auth: {
      usersFile: state.usersPath,
      defaultViewId: state.viewId,
      usernames: { ...usernames },
      storageStatePaths: { ...state.roleStatePaths },
      generatedBy: "role-storage-state-generated-by-acceptance",
    },
    registrySeedPayloadPaths: {
      plan: state.seedPlanPath,
      preconditions: state.seedPreconditionsPath,
      sources: state.sourcesPath,
      views: state.viewsPath,
      analysis: state.analysisPath,
    },
    eventStoragePath: state.eventPath,
    artifactPaths: {
      snapshots: state.snapshotDir,
      clips: state.clipDir,
    },
    ownership: "self-contained-pid-port-artifact-ownership",
  };
}

function buildEnvironmentAttestation(state, result, failureReason = "") {
  return {
    schema: environmentSchema,
    result,
    fixtureMode: state.fixtureMode,
    dependency: state.dependency || {
      status: "dependency-bootstrap-attestation",
      engine: "playwright-native",
      browserLaunchVerified: false,
      reason: "dependency bootstrap did not complete",
    },
    secretHandling: "generated-secret-memory-only",
    secretSerialization: false,
    ownership: {
      serverStartedByAcceptance: true,
      portsAllocatedByAcceptance: true,
      rolesSeededByAcceptance: true,
      storageStatesGeneratedByAcceptance: true,
      boundary: "self-contained-pid-port-artifact-ownership",
    },
    runtimeDescriptor: buildRuntimeDescriptor(state),
    runtimeDescriptorPath: state.runtimeDescriptorPath,
    roles: roles.map(role => ({
      role,
      username: usernames[role],
      storageStatePath: state.roleStatePaths[role],
      storageStateMode: fs.existsSync(state.roleStatePaths[role])
        ? (fs.statSync(state.roleStatePaths[role]).mode & 0o777).toString(8).padStart(4, "0")
        : "",
      status: state.fixtureMode ? "fixture-contract-only" : (fs.existsSync(state.roleStatePaths[role]) ? "actual-whoami-verified" : "not-generated"),
    })),
    portAllocation: {
      strategy: "ephemeral-probe-bounded-retry-with-exact-child-listener-ownership",
      maxAttempts: state.maxPortAttempts,
      attempts: state.attempts,
    },
    actualRuntimeEvidence: !state.fixtureMode && state.runtimeAcquired && result === "PASS",
    evidenceBoundary: state.fixtureMode
      ? "fixture orchestration attestation is not server, browser, exact-424, or Policy v4 execution evidence"
      : "runtime environment attestation does not substitute for exact-424 or Policy v4 case evidence",
    failureReason,
  };
}

function buildHandle(state, attestation) {
  return {
    attestation,
    runtime: buildRuntimeDescriptor(state),
    runtimeDescriptorPath: state.runtimeDescriptorPath,
    exactCaseEnv: state.fixtureMode ? {} : {
      MEDIA_SERVER_V390_UI_ROLE_SECRETS: state.roleSecretsJson,
    },
    releaseSecrets() {
      state.roleSecretsJson = "";
      state.secretValues = [];
      this.exactCaseEnv = {};
    },
    async cleanup() {
      const cleanup = await cleanupState(state, { requireRuntimeMeasurement: !state.fixtureMode && state.runtimeAcquired });
      this.releaseSecrets();
      return cleanup;
    },
  };
}

async function cleanupState(state, { requireRuntimeMeasurement }) {
  if (state.cleaned && state.cleanupEvidence) return state.cleanupEvidence;
  if (state.browser) {
    await state.browser.close().catch(() => {});
    state.browser = null;
  }
  if (!state.temporaryRoot) {
    state.cleaned = true;
    state.cleanupEvidence = noEnvironmentCleanup();
    return state.cleanupEvidence;
  }

  const existedBefore = fs.existsSync(state.temporaryRoot);
  let bytesBefore = 0;
  const pid = state.server?.child?.pid || 0;
  const childRunningBefore = Boolean(state.server && state.server.child.exitCode === null && state.server.child.signalCode === null);
  const aliveBefore = childRunningBefore && processIsAlive(pid);
  const commandIdentity = aliveBefore ? readCommandIdentity(pid) : "";
  const portsBefore = [state.httpPort, state.rtspPort]
    .filter(port => Number.isInteger(port) && port > 0)
    .map(port => ({ port, listenerPidsBefore: listListenerPids(port) }));
  const exactOwnedBefore = aliveBefore && portsBefore.length === 2 && portsBefore.every(item =>
    item.listenerPidsBefore.length > 0 && item.listenerPidsBefore.every(owner => owner === pid));

  if (state.server) {
    const stopped = await stopOwnedChild(state.server);
    if (stopped) await closeLog(state.server);
  }
  const aliveAfter = state.server ? processIsAlive(pid) : false;
  const ports = [];
  for (const item of portsBefore) {
    ports.push({
      ...item,
      listenerPidsAfter: listListenerPids(item.port),
      bindableAfter: await canListenPort(item.port),
    });
  }
  bytesBefore = fs.existsSync(state.temporaryRoot) ? directoryBytes(state.temporaryRoot) : 0;
  if (existedBefore && !aliveAfter) fs.rmSync(state.temporaryRoot, { recursive: true, force: true });
  const existsAfter = fs.existsSync(state.temporaryRoot);
  const bytesAfter = existsAfter ? directoryBytes(state.temporaryRoot) : 0;

  if (state.fixtureMode || !requireRuntimeMeasurement) {
    const checks = [
      { check: "fixture-or-partial-temporary-root-contained", status: isAllowedTemporaryRoot(state.temporaryRoot) ? "PASS" : "FAIL" },
      { check: "fixture-or-partial-temporary-root-removed", status: existedBefore && !existsAfter && bytesAfter === 0 ? "PASS" : "FAIL", bytesBefore, bytesAfter },
      { check: "foreign-listener-preservation", status: "PASS", action: "no listener PID outside the spawned child was signalled" },
    ];
    state.cleaned = true;
    state.cleanupEvidence = {
      status: checks.every(item => item.status === "PASS") ? "PASS" : "FAIL",
      runtimeEvidence: false,
      fixtureMode: state.fixtureMode,
      verificationSource: "fixture-or-partial-filesystem-measurement-not-runtime-evidence",
      serversStopped: state.server ? !aliveAfter : true,
      portsClean: state.fixtureMode ? true : ports.every(item => item.listenerPidsAfter.length === 0 && item.bindableAfter),
      temporaryArtifactsRemoved: existedBefore && !existsAfter && bytesAfter === 0,
      removedTemporaryArtifacts: existedBefore && !existsAfter ? [state.temporaryRoot] : [],
      checks,
      measurement: null,
    };
    return state.cleanupEvidence;
  }

  const measurement = {
    schema: cleanupSchema,
    processes: [{
      pid,
      commandIdentity,
      aliveBefore,
      aliveAfter,
      ownedPorts: portsBefore.filter(item => item.listenerPidsBefore.includes(pid)).map(item => item.port),
    }],
    ports,
    artifacts: [{
      path: state.temporaryRoot,
      contained: isAllowedTemporaryRoot(state.temporaryRoot),
      existedBefore,
      bytesBefore,
      existsAfter,
      bytesAfter,
      removedBytes: bytesBefore - bytesAfter,
    }],
  };
  const checks = [
    { check: "throwaway-process-identity", status: /(?:^|\/)media_server(?:\s|$)/.test(commandIdentity) ? "PASS" : "FAIL", pid, commandIdentity },
    { check: "throwaway-process-alive-before", status: aliveBefore ? "PASS" : "FAIL", pid, observed: aliveBefore },
    { check: "throwaway-port-ownership-before", status: exactOwnedBefore ? "PASS" : "FAIL", pid, ports: portsBefore },
    { check: "throwaway-server-stopped", status: aliveBefore && !aliveAfter ? "PASS" : "FAIL", pid, observed: !aliveAfter },
    ...ports.map(item => ({
      check: `throwaway-port-${item.port}-clean`,
      status: item.listenerPidsAfter.length === 0 && item.bindableAfter ? "PASS" : "FAIL",
      ...item,
    })),
    { check: "throwaway-temporary-root-removed", status: existedBefore && !existsAfter && bytesAfter === 0 ? "PASS" : "FAIL", path: state.temporaryRoot, bytesBefore, bytesAfter },
    { check: "foreign-listener-preservation", status: "PASS", action: "only the spawned child PID was signalled" },
  ];
  state.cleaned = true;
  state.cleanupEvidence = {
    status: checks.every(item => item.status === "PASS") ? "PASS" : "FAIL",
    runtimeEvidence: true,
    fixtureMode: false,
    verificationSource: "pid-port-artifact-before-after-observation",
    serversStopped: aliveBefore && !aliveAfter,
    coreServerStopped: aliveBefore && !aliveAfter,
    portsClean: ports.every(item => item.listenerPidsAfter.length === 0 && item.bindableAfter),
    temporaryArtifactsRemoved: existedBefore && !existsAfter && bytesAfter === 0,
    removedTemporaryArtifacts: existedBefore && !existsAfter ? [state.temporaryRoot] : [],
    measurement,
    checks,
  };
  return state.cleanupEvidence;
}

async function stopOwnedChild(record) {
  if (!record?.child || record.child.exitCode !== null || record.child.signalCode !== null) return true;
  record.child.kill("SIGTERM");
  if (await waitForExit(record.child, 10000)) return true;
  record.child.kill("SIGKILL");
  return waitForExit(record.child, 3000);
}

async function waitForExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode !== null) return true;
  return Promise.race([
    new Promise(resolve => child.once("exit", () => resolve(true))),
    delay(timeoutMs).then(() => false),
  ]);
}

async function closeLog(record) {
  if (!record?.log || record.log.closed) return;
  await new Promise(resolve => record.log.end(resolve));
}

function assertGeneratedSecretsAbsentFromDisk(state) {
  for (const filePath of listFiles(state.temporaryRoot)) {
    const stat = fs.statSync(filePath);
    if (!stat.isFile() || stat.size > 16 * 1024 * 1024) continue;
    const content = fs.readFileSync(filePath);
    for (const secret of state.secretValues) {
      assert(!content.includes(Buffer.from(secret)), `generated auth secret persisted to disk: ${filePath}`);
    }
  }
}

function noEnvironmentCleanup() {
  return {
    status: "PASS",
    runtimeEvidence: false,
    fixtureMode: false,
    verificationSource: "no-environment-acquired-no-cleanup-required",
    serversStopped: true,
    portsClean: true,
    temporaryArtifactsRemoved: true,
    removedTemporaryArtifacts: [],
    measurement: null,
    checks: [{ check: "no-environment-acquired", status: "PASS" }],
  };
}

async function probeEphemeralPort() {
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

function canListenPort(port) {
  return new Promise(resolve => {
    const probe = net.createServer();
    probe.once("error", () => resolve(false));
    probe.listen(port, "127.0.0.1", () => probe.close(() => resolve(true)));
  });
}

function readCommandIdentity(pid) {
  try {
    return execFileSync("ps", ["-p", String(pid), "-o", "command="], { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

function processIsAlive(pid) {
  if (!Number.isInteger(Number(pid)) || Number(pid) <= 1) return false;
  try {
    process.kill(Number(pid), 0);
    return true;
  } catch {
    return false;
  }
}

function isAllowedTemporaryRoot(candidate) {
  if (!candidate || !path.isAbsolute(candidate)) return false;
  const resolved = path.resolve(candidate);
  const allowedRoots = [...new Set([os.tmpdir(), "/tmp", "/private/tmp"].map(value => path.resolve(value)))];
  if (!path.basename(resolved).startsWith("media_server_v390_ui-")) return false;
  return allowedRoots.some(root => {
    const relative = path.relative(root, resolved);
    return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
  });
}

function directoryBytes(root) {
  if (!fs.existsSync(root)) return 0;
  let total = 0;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) total += directoryBytes(entryPath);
    else if (entry.isFile()) total += fs.statSync(entryPath).size;
  }
  return total;
}

function listFiles(root) {
  if (!root || !fs.existsSync(root)) return [];
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(entryPath));
    else if (entry.isFile()) files.push(entryPath);
  }
  return files;
}

function generatePassword(username = "") {
  for (let attempt = 0; attempt < 64; attempt += 1) {
    const candidate = `V390-${randomBytes(24).toString("base64url")}-aA9!`;
    const lower = candidate.toLowerCase();
    if (username && lower.includes(username.toLowerCase())) continue;
    if (/(.)\1\1/.test(candidate)) continue;
    if (containsSequentialDigits(candidate)) continue;
    if (["qwertyuiop", "poiuytrewq", "asdfghjkl", "lkjhgfdsa", "zxcvbnm", "mnbvcxz"]
      .some(row => [...Array(row.length - 3).keys()].some(index => lower.includes(row.slice(index, index + 4))))) continue;
    return candidate;
  }
  throw new Error("failed to generate a password satisfying the runtime policy");
}

function containsSequentialDigits(value) {
  for (let index = 0; index + 3 < value.length; index += 1) {
    const chunk = value.slice(index, index + 4);
    if (!/^\d{4}$/.test(chunk)) continue;
    const digits = [...chunk].map(Number);
    if (digits.every((digit, offset) => offset === 0 || digit === digits[0] + offset)) return true;
    if (digits.every((digit, offset) => offset === 0 || digit === digits[0] - offset)) return true;
  }
  return false;
}

function writeSecureJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o600 });
  fs.chmodSync(filePath, 0o600);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sha256File(filePath) {
  return createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function redactMessage(message, secrets) {
  let redacted = String(message || "");
  for (const secret of secrets || []) {
    if (secret) redacted = redacted.split(secret).join("[REDACTED]");
  }
  return redacted
    .replace(/(authorization\s*[:=]\s*)([^\s,;]+)/ig, "$1[REDACTED]")
    .replace(/((?:password|cookie|token|session)\s*[:=]\s*)([^\s,;]+)/ig, "$1[REDACTED]");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
