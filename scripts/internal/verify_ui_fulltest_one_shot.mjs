#!/usr/bin/env node
// 파일 용도: UI 풀테스트용 throwaway 서버/seed/verifier 묶음을 한 번에 실행한다.
// 요약: 30분/120분 soak는 실행하지 않고, autonomous UI click gate와 evidence scorer를 순차 실행한다.

import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`UI fulltest one-shot verifier

Usage:
  ./server.sh verify-ui-fulltest-one-shot [options]

Options:
  --output-dir <path>       Summary, seed, log, screenshot 출력 디렉터리입니다.
  --core-http-port <port>   auth off core UI 서버 HTTP port입니다. 기본은 빈 port 자동 선택.
  --core-rtsp-port <port>   auth off core UI 서버 RTSP port입니다. 기본은 빈 port 자동 선택.
  --auth-http-port <port>   auth auto UI 서버 HTTP port입니다. 기본은 빈 port 자동 선택.
  --auth-rtsp-port <port>   auth auto UI 서버 RTSP port입니다. 기본은 빈 port 자동 선택.
  --debug-port-base <port>  Chrome/CDP port 시작값입니다. 기본 14000.
  --widths <csv>            direct click viewport 폭입니다. 기본 390,1180.
  --visual-widths <csv>     screenshot viewport 폭입니다. 기본 320,390,760,1180.
  --manual-result <path>    기존 manual UI result 문서 검증 대상입니다. 지정하지 않으면 건너뜁니다.
  --browser-mode <mode>     ops/client smoke browser mode입니다. auto, in-app, chrome 중 하나입니다.
  --in-app-evidence <path>  Codex 인앱 브라우저 직접 확인 evidence JSON입니다.
  --allow-chrome-fallback[=1]
                            Codex 세션에서 Chrome/CDP wrapper 예외를 명시합니다.
  --chrome-path <path>      Chrome/Chromium 실행 파일 경로입니다.
  --timeout-ms <ms>         서버 health 대기 시간입니다. 기본 30000.
  --skip-build              사전 build를 건너뜁니다.
  --skip-manual-result      wrapper artifact만 만들고 manual result 구조 검증은 건너뜁니다.
  --keep-servers            실패/성공 후 throwaway 서버를 종료하지 않습니다.
  -h, --help                도움말 출력

Required auth env for --auth-ui-flow:
  MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD
  MEDIA_SERVER_VERIFY_AUTH_PREVIOUS_PASSWORD
  MEDIA_SERVER_VERIFY_AUTH_SECOND_PREVIOUS_PASSWORD
  MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_ONE
  MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_TWO

Boundaries:
  - verify-predev 30분/120분과 Runtime Console 120분 longrun은 실행하지 않습니다.
  - 운영 데이터가 아니라 output-dir 아래 throwaway registry/users/event path만 사용합니다.
  - Codex 세션의 기본 UI evidence는 인앱 브라우저이며, 이 Chrome/CDP wrapper는
    Codex 밖 사용자 실행 또는 --browser-mode chrome --allow-chrome-fallback 예외에만 사용합니다.
  - 실패한 step 이후 step은 실행하지 않고 summary에 남깁니다.
`);
}

assertKnownOptions(rawArgs, [
  "output-dir",
  "core-http-port",
  "core-rtsp-port",
  "auth-http-port",
  "auth-rtsp-port",
  "debug-port-base",
  "widths",
  "visual-widths",
  "manual-result",
  "browser-mode",
  "in-app-evidence",
  "allow-chrome-fallback",
  "chrome-path",
  "timeout-ms",
  "skip-build",
  "skip-manual-result",
  "keep-servers",
  "h",
  "help",
]);

const args = parseArgs(rawArgs);
const runId = `ui-fulltest-one-shot-${Date.now()}-${process.pid}`;
const outputDir = path.resolve(rootDir, args.outputDir || path.join(os.tmpdir(), `media_server_${runId}`));
const timeoutMs = numberOption(args.timeoutMs, 30000);
const debugPortBase = numberOption(args.debugPortBase, 14000);
const widths = args.widths || "390,1180";
const visualWidths = args.visualWidths || "320,390,760,1180";
const manualResult = args.manualResult || "";
const browserMode = normalizeBrowserMode(args.browserMode || "auto");
const inAppEvidence = args.inAppEvidence || "";
const allowChromeFallback = truthy(args.allowChromeFallback);
const skipBuild = Boolean(args.skipBuild);
const skipManualResult = Boolean(args.skipManualResult) || !manualResult;
const keepServers = Boolean(args.keepServers);
const chromeArgs = args.chromePath ? ["--chrome-path", args.chromePath] : [];
const opsClientBrowserArgs = buildOpsClientBrowserArgs();

const authEnvNames = [
  "MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD",
  "MEDIA_SERVER_VERIFY_AUTH_PREVIOUS_PASSWORD",
  "MEDIA_SERVER_VERIFY_AUTH_SECOND_PREVIOUS_PASSWORD",
  "MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_ONE",
  "MEDIA_SERVER_VERIFY_AUTH_WRONG_PASSWORD_TWO",
];

const steps = [];
const servers = [];
let failed = null;

fs.mkdirSync(outputDir, { recursive: true });

try {
  requireAuthEnv();

  const ports = {
    coreHttp: await resolvePort(args.coreHttpPort, 18097),
    coreRtsp: await resolvePort(args.coreRtspPort, 18571),
    authHttp: await resolvePort(args.authHttpPort, 18197),
    authRtsp: await resolvePort(args.authRtspPort, 18671),
  };
  writeJson("ports.json", ports);

  if (!skipBuild) {
    await runCommand("build", ["./server.sh", "build"]);
  } else {
    markSkipped("build", "--skip-build");
  }

  const coreRegistryDir = path.join(outputDir, "core-registry");
  const authRegistryDir = path.join(outputDir, "auth-registry");
  await runCommand("seed-core", [
    "./server.sh",
    "prepare-manual-ui-fulltest-seed",
    "--dry-run",
    "--emit-plan",
    path.join(outputDir, "core-seed-plan.json"),
    "--emit-registry-dir",
    coreRegistryDir,
  ]);
  await runCommand("seed-auth", [
    "./server.sh",
    "prepare-manual-ui-fulltest-seed",
    "--dry-run",
    "--emit-plan",
    path.join(outputDir, "auth-seed-plan.json"),
    "--emit-registry-dir",
    authRegistryDir,
  ]);

  const coreServer = await startServer("core-ui", {
    MEDIA_SERVER_AUTH_MODE: "off",
    MEDIA_SERVER_LISTEN_PORT: String(ports.coreRtsp),
    MEDIA_SERVER_HTTP_LISTEN_PORT: String(ports.coreHttp),
    MEDIA_SERVER_SOURCE_REGISTRY: path.join(coreRegistryDir, "sources.json"),
    MEDIA_SERVER_PUBLISHED_VIEWS: path.join(coreRegistryDir, "views.json"),
    MEDIA_SERVER_ANALYSIS_REGISTRY: path.join(coreRegistryDir, "analysis.json"),
    MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_PATH: path.join(outputDir, "core-events.jsonl"),
    MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_DIR: path.join(outputDir, "core-snapshots"),
    MEDIA_SERVER_ANALYSIS_EVENT_CLIP_DIR: path.join(outputDir, "core-clips"),
  });
  await waitForHealth("core-ui-health", `http://127.0.0.1:${ports.coreHttp}/health`);
  appendDiagnosticLogTailFixture();

  await runCommand("score-ui-evidence-runner", ["./server.sh", "verify-manual-ui-evidence-runner"]);
  await runCommand("guard-native-dialogs", ["./server.sh", "verify-product-ui-no-native-dialogs"]);
  await runCommand("guard-blocking-dialog-policy", ["./server.sh", "verify-ui-blocking-dialog-policy"]);
  await runCommand("feature-inventory-coverage", ["./server.sh", "verify-feature-inventory-coverage"]);
  await runCommand("ops-client-ui", [
    "./server.sh",
    "verify-ops-client-ui",
    "--http-base",
    `http://127.0.0.1:${ports.coreHttp}`,
    "--debug-port-base",
    String(debugPortBase + 0),
    "--output-dir",
    path.join(outputDir, "ops-client-ui"),
    ...opsClientBrowserArgs,
    ...chromeArgs,
  ]);
  await runCommand("ops-client-ui-screenshots", [
    "./server.sh",
    "verify-ops-client-ui",
    "--http-base",
    `http://127.0.0.1:${ports.coreHttp}`,
    "--screenshots",
    "--visual-widths",
    visualWidths,
    "--debug-port-base",
    String(debugPortBase + 200),
    "--output-dir",
    path.join(outputDir, "ops-client-ui-screenshots"),
    ...opsClientBrowserArgs,
    ...chromeArgs,
  ]);
  await runCommand("rule-ui", [
    "./server.sh",
    "verify-rule-ui",
    "--http-base",
    `http://127.0.0.1:${ports.coreHttp}`,
    "--debug-port",
    String(debugPortBase + 500),
    "--output-dir",
    path.join(outputDir, "rule-ui"),
    ...chromeArgs,
  ]);
  await runCommand("ops-route-boundaries", [
    "./server.sh",
    "verify-ops-route-boundaries",
    "--http-base",
    `http://127.0.0.1:${ports.coreHttp}`,
  ]);
  await runCommand("ops-rules-roundtrip", [
    "./server.sh",
    "verify-ops-rules-roundtrip",
    "--http-base",
    `http://127.0.0.1:${ports.coreHttp}`,
  ]);
  await runCommand("ops-tables-layout", [
    "./server.sh",
    "verify-ops-tables-layout",
    "--http-base",
    `http://127.0.0.1:${ports.coreHttp}`,
    "--debug-port-base",
    String(debugPortBase + 700),
    "--output-dir",
    path.join(outputDir, "ops-tables-layout"),
    ...chromeArgs,
  ]);
  await runCommand("ops-click-e2e-core", [
    "./server.sh",
    "verify-ops-click-e2e",
    "--http-base",
    `http://127.0.0.1:${ports.coreHttp}`,
    "--debug-port-base",
    String(debugPortBase + 1000),
    "--widths",
    widths,
    "--output-dir",
    path.join(outputDir, "ops-click-core"),
    ...chromeArgs,
  ], {
    MEDIA_SERVER_VERIFY_OPS_CLICK_RTSP_PORT: String(ports.coreRtsp),
  });

  const authUsersFile = path.join(outputDir, "auth-users.json");
  const authServer = await startServer("auth-ui", {
    MEDIA_SERVER_AUTH_MODE: "auto",
    MEDIA_SERVER_AUTH_USERS_FILE: authUsersFile,
    MEDIA_SERVER_LISTEN_PORT: String(ports.authRtsp),
    MEDIA_SERVER_HTTP_LISTEN_PORT: String(ports.authHttp),
    MEDIA_SERVER_SOURCE_REGISTRY: path.join(authRegistryDir, "sources.json"),
    MEDIA_SERVER_PUBLISHED_VIEWS: path.join(authRegistryDir, "views.json"),
    MEDIA_SERVER_ANALYSIS_REGISTRY: path.join(authRegistryDir, "analysis.json"),
    MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_PATH: path.join(outputDir, "auth-events.jsonl"),
    MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_DIR: path.join(outputDir, "auth-snapshots"),
    MEDIA_SERVER_ANALYSIS_EVENT_CLIP_DIR: path.join(outputDir, "auth-clips"),
  });
  await waitForHealth("auth-ui-health", `http://127.0.0.1:${ports.authHttp}/health`);
  await runCommand("ops-click-e2e-auth", [
    "./server.sh",
    "verify-ops-click-e2e",
    "--auth-ui-flow",
    "--http-base",
    `http://127.0.0.1:${ports.authHttp}`,
    "--debug-port-base",
    String(debugPortBase + 1400),
    "--widths",
    widths,
    "--auth-users-file",
    authUsersFile,
    "--output-dir",
    path.join(outputDir, "ops-click-auth"),
    ...chromeArgs,
  ]);

  if (skipManualResult) {
    markSkipped("manual-ui-result-structure", args.skipManualResult ? "--skip-manual-result" : "manual result not provided");
  } else {
    await runCommand("manual-ui-result-structure", [
      "./server.sh",
      "verify-manual-ui-evidence",
      "--result",
      manualResult,
    ]);
  }

  markSkipped("predev-30min", "one-shot UI wrapper does not run verify-predev --soak-minutes 30");
  markSkipped("predev-120min", "one-shot UI wrapper does not run verify-predev --soak-minutes 120");
  markSkipped("runtime-console-120min", "one-shot UI wrapper does not run verify-va-runtime-console-longrun --duration-minutes 120");

  await stopServers();
  writeSummary("PASS");
  console.log("");
  console.log("== UI fulltest one-shot summary ==");
  console.log("- result: PASS");
  console.log(`- outputDir: ${outputDir}`);
  console.log("- longrun: not run");
} catch (error) {
  failed = error instanceof Error ? error : new Error(String(error));
  await stopServers().catch(stopError => {
    console.log(`[warn] server cleanup failed: ${stopError instanceof Error ? stopError.message : String(stopError)}`);
  });
  writeSummary("FAIL");
  console.log("");
  console.log("== UI fulltest one-shot summary ==");
  console.log("- result: FAIL");
  console.log(`- outputDir: ${outputDir}`);
  console.log(`- failure: ${failed.message}`);
  process.exit(1);
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--skip-build") parsed.skipBuild = true;
    else if (token === "--skip-manual-result") parsed.skipManualResult = true;
    else if (token === "--keep-servers") parsed.keepServers = true;
    else if (token.startsWith("--output-dir=")) parsed.outputDir = token.slice("--output-dir=".length);
    else if (token === "--output-dir") parsed.outputDir = argv[++index];
    else if (token.startsWith("--core-http-port=")) parsed.coreHttpPort = token.slice("--core-http-port=".length);
    else if (token === "--core-http-port") parsed.coreHttpPort = argv[++index];
    else if (token.startsWith("--core-rtsp-port=")) parsed.coreRtspPort = token.slice("--core-rtsp-port=".length);
    else if (token === "--core-rtsp-port") parsed.coreRtspPort = argv[++index];
    else if (token.startsWith("--auth-http-port=")) parsed.authHttpPort = token.slice("--auth-http-port=".length);
    else if (token === "--auth-http-port") parsed.authHttpPort = argv[++index];
    else if (token.startsWith("--auth-rtsp-port=")) parsed.authRtspPort = token.slice("--auth-rtsp-port=".length);
    else if (token === "--auth-rtsp-port") parsed.authRtspPort = argv[++index];
    else if (token.startsWith("--debug-port-base=")) parsed.debugPortBase = token.slice("--debug-port-base=".length);
    else if (token === "--debug-port-base") parsed.debugPortBase = argv[++index];
    else if (token.startsWith("--widths=")) parsed.widths = token.slice("--widths=".length);
    else if (token === "--widths") parsed.widths = argv[++index];
    else if (token.startsWith("--visual-widths=")) parsed.visualWidths = token.slice("--visual-widths=".length);
    else if (token === "--visual-widths") parsed.visualWidths = argv[++index];
    else if (token.startsWith("--manual-result=")) parsed.manualResult = token.slice("--manual-result=".length);
    else if (token === "--manual-result") parsed.manualResult = argv[++index];
    else if (token.startsWith("--browser-mode=")) parsed.browserMode = token.slice("--browser-mode=".length);
    else if (token === "--browser-mode") parsed.browserMode = argv[++index];
    else if (token.startsWith("--in-app-evidence=")) parsed.inAppEvidence = token.slice("--in-app-evidence=".length);
    else if (token === "--in-app-evidence") parsed.inAppEvidence = argv[++index];
    else if (token.startsWith("--allow-chrome-fallback=")) parsed.allowChromeFallback = token.slice("--allow-chrome-fallback=".length);
    else if (token === "--allow-chrome-fallback") parsed.allowChromeFallback = argv[index + 1] && !argv[index + 1].startsWith("--") ? argv[++index] : "1";
    else if (token.startsWith("--chrome-path=")) parsed.chromePath = token.slice("--chrome-path=".length);
    else if (token === "--chrome-path") parsed.chromePath = argv[++index];
    else if (token.startsWith("--timeout-ms=")) parsed.timeoutMs = token.slice("--timeout-ms=".length);
    else if (token === "--timeout-ms") parsed.timeoutMs = argv[++index];
  }
  return parsed;
}

function numberOption(value, fallback) {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`invalid positive number option: ${value}`);
  }
  return parsed;
}

function normalizeBrowserMode(value) {
  const mode = String(value || "auto").trim().toLowerCase();
  if (["auto", "in-app", "chrome"].includes(mode)) return mode;
  throw new Error(`invalid browser mode: ${value}`);
}

function truthy(value) {
  if (value === undefined || value === null || value === "") return false;
  return !["0", "false", "no", "off"].includes(String(value).trim().toLowerCase());
}

function buildOpsClientBrowserArgs() {
  if (inAppEvidence) {
    return ["--browser-mode", "in-app", "--in-app-evidence", inAppEvidence];
  }
  if (browserMode === "chrome") {
    const argsList = ["--browser-mode", "chrome"];
    if (allowChromeFallback) argsList.push("--allow-chrome-fallback", "1");
    return argsList;
  }
  return [];
}

function browserFallbackEnv() {
  if (browserMode === "chrome" && allowChromeFallback) {
    return {
      MEDIA_SERVER_UI_BROWSER_MODE: "chrome",
      MEDIA_SERVER_ALLOW_CHROME_FALLBACK: "1",
    };
  }
  return {};
}

function requireAuthEnv() {
  const missing = authEnvNames.filter(name => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`missing auth verifier env for one-shot UI fulltest: ${missing.join(", ")}`);
  }
}

async function resolvePort(raw, startAt) {
  if (raw !== undefined && raw !== "") return numberOption(raw, startAt);
  return findFreePort(startAt);
}

async function findFreePort(startAt) {
  let lastError = "";
  for (let port = startAt; port < startAt + 200; port += 1) {
    const probe = await canListen(port);
    if (probe.ok) return port;
    if (probe.error) lastError = `${port}: ${probe.error}`;
  }
  const suffix = lastError ? `; last bind error: ${lastError}` : "";
  throw new Error(`no free port found from ${startAt}${suffix}`);
}

function canListen(port) {
  return new Promise(resolve => {
    const server = net.createServer();
    server.once("error", error => {
      const code = error && typeof error === "object" && "code" in error ? error.code : "ERROR";
      const message = error instanceof Error ? error.message : String(error);
      resolve({ ok: false, error: `${code}: ${message}` });
    });
    server.once("listening", () => {
      server.close(() => resolve({ ok: true }));
    });
    server.listen(port, "127.0.0.1");
  });
}

async function startServer(id, extraEnv) {
  const logPath = path.join(outputDir, `${id}.server.log`);
  const log = fs.createWriteStream(logPath, { flags: "a" });
  const child = spawn("./server.sh", ["foreground"], {
    cwd: rootDir,
    env: {
      ...process.env,
      ...baseServerEnv(),
      ...extraEnv,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", chunk => log.write(chunk));
  child.stderr.on("data", chunk => log.write(chunk));
  servers.push({ id, child, log, logPath });
  markPass(`start-${id}`, `server log: ${path.relative(rootDir, logPath)}`);
  return child;
}

function baseServerEnv() {
  return {
    MEDIA_SERVER_SKIP_LOCAL_ENV: "1",
    MEDIA_SERVER_SKIP_BUILD: "1",
    MEDIA_SERVER_LISTEN_ADDRESS: "127.0.0.1",
    MEDIA_SERVER_HTTP_LISTEN_ADDRESS: "127.0.0.1",
    MEDIA_SERVER_FORCE_RTSP_TCP: "1",
    MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_ENABLED: "1",
    MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_HOOK_ENABLED: "1",
    MEDIA_SERVER_ANALYSIS_EVENT_CLIP_HOOK_ENABLED: "1",
  };
}

function appendDiagnosticLogTailFixture() {
  const logPath = path.join(rootDir, ".media_server.log");
  const line = `[ui-fulltest] source health cleanup event storage auth ICE reconnect cid=${runId}`;
  fs.appendFileSync(logPath, `${line}\n`);
  markPass("diagnostic-log-tail-fixture", "safe log-tail UI pattern appended");
}

async function waitForHealth(id, url) {
  const startedAt = Date.now();
  let lastError = "";
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (response.ok) {
        markPass(id, url);
        return;
      }
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await delay(250);
  }
  throw new Error(`${id} did not become healthy: ${lastError}`);
}

async function runCommand(id, command, extraEnv = {}) {
  const logPath = path.join(outputDir, `${id}.log`);
  const log = fs.createWriteStream(logPath, { flags: "a" });
  const startedAt = Date.now();
  console.log(`[run] ${id}: ${command.join(" ")}`);
  const child = spawn(command[0], command.slice(1), {
    cwd: rootDir,
    env: {
      ...process.env,
      ...browserFallbackEnv(),
      ...extraEnv,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", chunk => {
    process.stdout.write(chunk);
    log.write(chunk);
  });
  child.stderr.on("data", chunk => {
    process.stderr.write(chunk);
    log.write(chunk);
  });
  const code = await new Promise(resolve => {
    child.once("exit", resolve);
  });
  log.end();
  const elapsedMs = Date.now() - startedAt;
  if (code !== 0) {
    steps.push({ id, status: "FAIL", command: command.join(" "), exitCode: code, elapsedMs, log: logPath });
    throw new Error(`${id} failed with exit code ${code}`);
  }
  steps.push({ id, status: "PASS", command: command.join(" "), exitCode: code, elapsedMs, log: logPath });
}

async function stopServers() {
  if (keepServers) {
    for (const item of servers) markSkipped(`stop-${item.id}`, "--keep-servers");
    return;
  }
  for (const item of servers.reverse()) {
    await stopServer(item);
  }
}

async function stopServer(item) {
  if (item.child.exitCode !== null || item.child.signalCode !== null) {
    item.log.end();
    markPass(`stop-${item.id}`, "already exited");
    return;
  }
  item.child.kill("SIGTERM");
  const exited = await Promise.race([
    new Promise(resolve => item.child.once("exit", () => resolve(true))),
    delay(3000).then(() => false),
  ]);
  if (!exited) {
    item.child.kill("SIGKILL");
    await new Promise(resolve => item.child.once("exit", resolve));
  }
  item.log.end();
  markPass(`stop-${item.id}`, "stopped");
}

function markPass(id, detail) {
  steps.push({ id, status: "PASS", detail });
  console.log(`[pass] ${id}: ${detail}`);
}

function markSkipped(id, reason) {
  steps.push({ id, status: "SKIPPED", reason });
  console.log(`[skip] ${id}: ${reason}`);
}

function writeSummary(result) {
  const summary = {
    schema: "media-server.ui-fulltest-one-shot.v1",
    runId,
    generatedAt: new Date().toISOString(),
    result,
    outputDir,
    widths,
    visualWidths,
    manualResult,
    browserMode,
    inAppEvidence,
    allowChromeFallback,
    failure: failed ? failed.message : "",
    longrun: {
      predev30: "not-run",
      predev120: "not-run",
      runtimeConsole120: "not-run",
    },
    steps: steps.map(item => ({
      ...item,
      log: item.log ? path.relative(rootDir, item.log).replaceAll(path.sep, "/") : undefined,
    })),
  };
  writeJson("summary.json", summary);
  fs.writeFileSync(path.join(outputDir, "summary.md"), renderMarkdown(summary));
}

function renderMarkdown(summary) {
  const lines = [
    "# UI Fulltest One-Shot Summary",
    "",
    `- schema: ${summary.schema}`,
    `- runId: ${summary.runId}`,
    `- generatedAt: ${summary.generatedAt}`,
    `- result: ${summary.result}`,
    `- outputDir: ${summary.outputDir}`,
    `- widths: ${summary.widths}`,
    `- visualWidths: ${summary.visualWidths}`,
    `- browserMode: ${summary.browserMode}`,
    `- inAppEvidence: ${summary.inAppEvidence || "not-provided"}`,
    `- allowChromeFallback: ${summary.allowChromeFallback ? "yes" : "no"}`,
    `- 30분 predev: ${summary.longrun.predev30}`,
    `- 120분 predev: ${summary.longrun.predev120}`,
    `- 120분 runtime console: ${summary.longrun.runtimeConsole120}`,
  ];
  if (summary.failure) lines.push(`- failure: ${summary.failure}`);
  lines.push("", "## Steps", "", "| step | status | detail | log |", "| --- | --- | --- | --- |");
  for (const step of summary.steps) {
    lines.push(`| ${escapeCell(step.id)} | ${escapeCell(step.status)} | ${escapeCell(step.detail || step.command || step.reason || "")} | ${escapeCell(step.log || "")} |`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function writeJson(relativePath, payload) {
  fs.writeFileSync(path.join(outputDir, relativePath), `${JSON.stringify(payload, null, 2)}\n`);
}

function escapeCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}
