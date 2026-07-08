#!/usr/bin/env node
// 파일 용도: v3.9.0 UI automation runner summary/report와 case 단위 failure evidence를 생성한다.

import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { findChrome, openBrowserPage } from "./ui_visual_smoke_lib.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 UI automation runner

Usage:
  ./server.sh verify-v390-ui-automation --browser-mode <playwright|selenium|sikulix> --output-dir <path> [options]

Options:
  --browser-mode <mode>       Automation adapter family. Supported values: playwright, selenium, sikulix.
  --output-dir <path>         Directory for summary.json, report.md, screenshots, traces, and logs.
  --case-manifest <path>      Case manifest. Default test/fixtures/v390_ui_automation_cases.json.
  --http-port <port>          Throwaway auth-off UI server HTTP port. Default is first free port from 18239.
  --rtsp-port <port>          Throwaway auth-off UI server RTSP port. Default is first free port from 18739.
  --debug-port-base <port>    Browser/CDP debug port base. Default 15200.
  --chrome-path <path>        Chrome/Chromium executable for browser evidence.
  --timeout-ms <ms>           Health/browser wait timeout. Default 30000.
  --allow-chrome-fallback[=1] Allow Chrome/CDP browser evidence in Codex sessions.
  --keep-server               Leave throwaway server running after the run.
  --fixture-pass              Fast contract fixture: mark all cases PASS without browser execution.
  --fixture-fail-case <id>    Fast contract fixture: fail one case and mark later cases not-run.
  --one-shot-summary <path>   Normalize an existing verify-ui-fulltest-one-shot summary into this schema.
  -h, --help                  Show help.

Notes:
  Fixture modes are contract evidence only. Real UI automation execution remains approval-gated by AGENTS.
`);
}

assertKnownOptions(rawArgs, [
  "browser-mode",
  "output-dir",
  "case-manifest",
  "http-port",
  "rtsp-port",
  "debug-port-base",
  "chrome-path",
  "timeout-ms",
  "allow-chrome-fallback",
  "keep-server",
  "fixture-pass",
  "fixture-fail-case",
  "one-shot-summary",
  "h",
  "help",
]);

const options = parseArgs(rawArgs);
const outputDir = path.resolve(rootDir, options.outputDir);
const summaryPath = path.join(outputDir, "summary.json");
const reportPath = path.join(outputDir, "report.md");
const screenshotsDir = path.join(outputDir, "screenshots");
const tracesDir = path.join(outputDir, "traces");
const logsDir = path.join(outputDir, "logs");
const runId = `v390-ui-automation-${new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14)}-${process.pid}`;
const cases = loadCases(options.caseManifest);
const fixtureMode = options.fixturePass || options.fixtureFailCase !== "";
let cleanupState = {
  coreServerStopped: true,
  authServerStopped: true,
  portsClean: true,
};

fs.mkdirSync(screenshotsDir, { recursive: true });
fs.mkdirSync(tracesDir, { recursive: true });
fs.mkdirSync(logsDir, { recursive: true });

let normalizedCases;
let toolSelection = freeToolPriority(options.browserMode);

if (fixtureMode) {
  normalizedCases = runFixtureCases();
} else if (options.oneShotSummary) {
  normalizedCases = normalizeOneShotSummary();
} else {
  normalizedCases = await runRealUiAutomation();
}

const failCount = normalizedCases.filter(item => item.status === "FAIL").length;
const passCount = normalizedCases.filter(item => item.status === "PASS").length;
const notRunCount = normalizedCases.filter(item => item.status === "not-run").length;
const failedCase = normalizedCases.find(item => item.status === "FAIL");
const summary = {
  schema: "media-server.v390-ui-automation.v1",
  runId,
  command: `./server.sh verify-v390-ui-automation ${rawArgs.join(" ")}`,
  browserMode: options.browserMode,
  toolSelection,
  result: failCount > 0 ? "FAIL" : "PASS",
  automationResult: failCount > 0 ? "FAIL" : "PASS",
  evidenceBoundary: "automationResult is not manual UI fulltest, 30-minute, 120-minute, published, or release-action evidence",
  manualIntervention: false,
  caseCount: normalizedCases.length,
  pass: passCount,
  fail: failCount,
  notRun: notRunCount,
  failedCaseId: failedCase?.caseId || "",
  outputDir,
  summaryPath,
  reportPath,
  screenshotsDir,
  tracesDir,
  logsDir,
  cleanup: cleanupState,
  cases: normalizedCases,
};

writeJson(summaryPath, summary);
writeReport(reportPath, summary);

console.log("");
console.log("== v3.9.0 UI automation runner summary ==");
console.log(`- schema: ${summary.schema}`);
console.log(`- result: ${summary.result}`);
console.log(`- browserMode: ${summary.browserMode}`);
console.log(`- caseCount: ${summary.caseCount}`);
console.log(`- pass: ${summary.pass}`);
console.log(`- fail: ${summary.fail}`);
console.log(`- notRun: ${summary.notRun}`);
console.log(`- failedCaseId: ${summary.failedCaseId}`);
console.log(`- summaryPath: ${summary.summaryPath}`);
console.log(`- reportPath: ${summary.reportPath}`);

if (summary.result !== "PASS") process.exit(1);

function parseArgs(args) {
  const parsed = {
    browserMode: "",
    outputDir: "",
    caseManifest: "test/fixtures/v390_ui_automation_cases.json",
    httpPort: "",
    rtspPort: "",
    debugPortBase: "15200",
    chromePath: "",
    timeoutMs: "30000",
    allowChromeFallback: false,
    keepServer: false,
    fixturePass: false,
    fixtureFailCase: "",
    oneShotSummary: "",
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--browser-mode") {
      parsed.browserMode = args[index + 1] || "";
      index += 1;
    } else if (arg === "--output-dir") {
      parsed.outputDir = args[index + 1] || "";
      index += 1;
    } else if (arg === "--case-manifest") {
      parsed.caseManifest = args[index + 1] || "";
      index += 1;
    } else if (arg === "--http-port") {
      parsed.httpPort = args[index + 1] || "";
      index += 1;
    } else if (arg === "--rtsp-port") {
      parsed.rtspPort = args[index + 1] || "";
      index += 1;
    } else if (arg === "--debug-port-base") {
      parsed.debugPortBase = args[index + 1] || "";
      index += 1;
    } else if (arg === "--chrome-path") {
      parsed.chromePath = args[index + 1] || "";
      index += 1;
    } else if (arg === "--timeout-ms") {
      parsed.timeoutMs = args[index + 1] || "";
      index += 1;
    } else if (arg === "--allow-chrome-fallback") {
      parsed.allowChromeFallback = args[index + 1] && !args[index + 1].startsWith("--") ? args[index + 1] : "1";
      if (parsed.allowChromeFallback === args[index + 1]) index += 1;
    } else if (arg === "--keep-server") {
      parsed.keepServer = true;
    } else if (arg === "--fixture-pass") {
      parsed.fixturePass = true;
    } else if (arg === "--fixture-fail-case") {
      parsed.fixtureFailCase = args[index + 1] || "";
      index += 1;
    } else if (arg === "--one-shot-summary") {
      parsed.oneShotSummary = args[index + 1] || "";
      index += 1;
    }
  }
  assert(parsed.outputDir !== "", "--output-dir is required");
  assert(["playwright", "selenium", "sikulix"].includes(parsed.browserMode), "--browser-mode must be playwright, selenium, or sikulix");
  assertPositiveNumberOrEmpty(parsed.httpPort, "--http-port");
  assertPositiveNumberOrEmpty(parsed.rtspPort, "--rtsp-port");
  assertPositiveNumberOrEmpty(parsed.debugPortBase, "--debug-port-base");
  assertPositiveNumberOrEmpty(parsed.timeoutMs, "--timeout-ms");
  assert(!(parsed.fixturePass && parsed.fixtureFailCase), "--fixture-pass and --fixture-fail-case are mutually exclusive");
  assert(!(parsed.oneShotSummary && (parsed.fixturePass || parsed.fixtureFailCase)), "--one-shot-summary cannot be combined with fixture mode");
  return parsed;
}

function loadCases(manifestPath) {
  const fullPath = path.resolve(rootDir, manifestPath);
  const payload = JSON.parse(fs.readFileSync(fullPath, "utf8"));
  assert(payload.schema === "media-server.v390-ui-automation-cases.v1", "unexpected UI automation case manifest schema");
  assert(Array.isArray(payload.cases) && payload.cases.length > 0, "case manifest must contain cases");
  if (options.fixtureFailCase) {
    assert(payload.cases.some(item => item.caseId === options.fixtureFailCase), `unknown fixture fail case: ${options.fixtureFailCase}`);
  }
  return payload.cases;
}

function assertPositiveNumberOrEmpty(value, label) {
  if (value === undefined || value === "") return;
  const parsed = Number(value);
  assert(Number.isFinite(parsed) && parsed > 0, `${label} must be a positive number`);
}

function freeToolPriority(selected) {
  return [
    { tool: "playwright", priority: 1, selected: selected === "playwright" },
    { tool: "selenium", priority: 2, selected: selected === "selenium" },
    { tool: "sikulix", priority: 3, selected: selected === "sikulix", visualOnly: true },
  ];
}

function runFixtureCases() {
  let failed = false;
  return cases.map((item, index) => {
    printProgress(index + 1, cases.length, item);
    const artifact = writeCaseArtifacts(item);
    if (failed) {
      return makeCase(item, "not-run", "not run after previous fixture failure", artifact);
    }
    if (options.fixtureFailCase === item.caseId) {
      failed = true;
      return makeCase(item, "FAIL", "fixture failure: expected UI state not found", artifact);
    }
    return makeCase(item, "PASS", "fixture pass", artifact);
  });
}

function normalizeOneShotSummary() {
  const oneShot = JSON.parse(fs.readFileSync(path.resolve(rootDir, options.oneShotSummary), "utf8"));
  assert(oneShot.schema === "media-server.ui-fulltest-one-shot.v1", "unexpected one-shot summary schema");
  const result = oneShot.result === "PASS" ? "PASS" : "FAIL";
  return cases.map((item, index) => {
    printProgress(index + 1, cases.length, item);
    const artifact = writeCaseArtifacts(item);
    return makeCase(item, result, `normalized from one-shot summary ${oneShot.runId || "(unknown)"}`, artifact);
  });
}

async function runRealUiAutomation() {
  if (truthy(options.allowChromeFallback)) {
    process.env.MEDIA_SERVER_UI_BROWSER_MODE = "chrome";
    process.env.MEDIA_SERVER_ALLOW_CHROME_FALLBACK = "1";
  }
  const ports = {
    http: await resolvePort(options.httpPort, 18239),
    rtsp: await resolvePort(options.rtspPort, 18739),
  };
  const debugPortBase = Number(options.debugPortBase || 15200);
  const timeoutMs = Number(options.timeoutMs || 30000);
  const server = await startCoreServer(ports);
  const httpBase = `http://127.0.0.1:${ports.http}`;
  let failed = false;
  const results = [];
  try {
    await waitForHealth(`${httpBase}/health`, timeoutMs);
    const chromePath = options.chromePath || findChrome();
    assert(chromePath, "browser executable not available; pass --chrome-path or --allow-chrome-fallback in Codex sessions");
    for (let index = 0; index < cases.length; index += 1) {
      const item = cases[index];
      printProgress(index + 1, cases.length, item);
      if (failed) {
        const artifact = writeCaseArtifacts(item);
        results.push(makeCase(item, "not-run", "not run after previous UI automation failure", artifact));
        continue;
      }
      try {
        const artifact = await runBrowserCase(item, {
          httpBase,
          chromePath,
          debugPort: debugPortBase + index,
          timeoutMs,
          serverLogReference: server.logPath,
        });
        results.push(makeCase(item, "PASS", "all expected UI markers found", artifact));
      } catch (error) {
        failed = true;
        const artifact = writeCaseArtifacts(item, { serverLogReference: server.logPath });
        results.push(makeCase(item, "FAIL", error instanceof Error ? error.message : String(error), artifact));
      }
    }
  } finally {
    if (!options.keepServer) {
      await stopServer(server);
    } else {
      cleanupState.coreServerStopped = false;
      cleanupState.portsClean = false;
    }
  }
  return results;
}

async function runBrowserCase(item, { httpBase, chromePath, debugPort, timeoutMs, serverLogReference }) {
  const artifact = writeCaseArtifacts(item, { serverLogReference });
  const browser = await openBrowserPage({
    httpBase,
    pagePath: item.route,
    timeoutMs,
    chromePath,
    debugPort,
    width: item.viewport?.width || 390,
    height: item.viewport?.height || 844,
    outputDir: screenshotsDir,
  });
  try {
    await delay(500);
    const result = await browser.evaluate(
      `
        (() => {
          const markers = ${JSON.stringify(item.expectedMarkers || [])};
          const text = document.body ? document.body.innerText : "";
          const html = document.documentElement ? document.documentElement.outerHTML : "";
          const haystack = String(text + "\\n" + html);
          const missing = markers.filter((marker) => !haystack.includes(marker));
          return {
            ok: missing.length === 0,
            missing,
            markerCount: markers.length,
            title: document.title,
            textSnippet: text.replace(/\\s+/g, " ").slice(0, 800),
          };
        })()
      `,
      10000,
    );
    await browser.screenshot(artifact.screenshotPath);
    writeJson(artifact.tracePath, {
      schema: "media-server.v390-ui-automation-trace.v1",
      caseId: item.caseId,
      route: item.route,
      controlAction: item.controlAction,
      browserMode: options.browserMode,
      expectedMarkers: item.expectedMarkers || [],
      result,
    });
    if (!result?.ok) {
      throw new Error(`missing UI markers: ${(result?.missing || []).join(", ") || "(unknown)"}`);
    }
    return artifact;
  } finally {
    await browser.close();
  }
}

async function startCoreServer(ports) {
  const logPath = path.join(logsDir, "core-ui.server.log");
  const log = fs.createWriteStream(logPath, { flags: "a" });
  const registryDir = path.join(outputDir, "core-registry");
  fs.mkdirSync(registryDir, { recursive: true });
  const child = spawn("./server.sh", ["foreground"], {
    cwd: rootDir,
    env: {
      ...process.env,
      MEDIA_SERVER_AUTH_MODE: "off",
      MEDIA_SERVER_LISTEN_ADDRESS: "127.0.0.1",
      MEDIA_SERVER_HTTP_LISTEN_ADDRESS: "127.0.0.1",
      MEDIA_SERVER_LISTEN_PORT: String(ports.rtsp),
      MEDIA_SERVER_HTTP_LISTEN_PORT: String(ports.http),
      MEDIA_SERVER_SOURCE_REGISTRY: path.join(registryDir, "sources.json"),
      MEDIA_SERVER_PUBLISHED_VIEWS: path.join(registryDir, "views.json"),
      MEDIA_SERVER_ANALYSIS_REGISTRY: path.join(registryDir, "analysis.json"),
      MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_PATH: path.join(outputDir, "core-events.jsonl"),
      MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_DIR: path.join(outputDir, "core-snapshots"),
      MEDIA_SERVER_ANALYSIS_EVENT_CLIP_DIR: path.join(outputDir, "core-clips"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", chunk => log.write(chunk));
  child.stderr.on("data", chunk => log.write(chunk));
  return { child, log, logPath, ports };
}

async function stopServer(server) {
  if (!server?.child) return;
  if (!server.child.killed) {
    server.child.kill("SIGTERM");
  }
  await new Promise(resolve => {
    const timer = setTimeout(() => {
      if (!server.child.killed) server.child.kill("SIGKILL");
      resolve();
    }, 5000);
    server.child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
  server.log?.end();
  cleanupState.coreServerStopped = true;
  cleanupState.portsClean = await canListen(server.ports.http) && await canListen(server.ports.rtsp);
}

async function waitForHealth(url, timeoutMs) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch (_) {}
    await delay(250);
  }
  throw new Error(`health timeout: ${url}`);
}

async function resolvePort(raw, startAt) {
  if (raw !== undefined && raw !== "") return Number(raw);
  for (let port = startAt; port < startAt + 200; port += 1) {
    if (await canListen(port)) return port;
  }
  throw new Error(`no free port found from ${startAt}`);
}

function canListen(port) {
  return new Promise(resolve => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

function writeCaseArtifacts(item, { serverLogReference = "" } = {}) {
  const safeId = item.caseId.toLowerCase().replace(/[^a-z0-9_-]/g, "-");
  const screenshotPath = path.join(screenshotsDir, `${safeId}.png`);
  const tracePath = path.join(tracesDir, `${safeId}.trace.json`);
  const videoPath = path.join(tracesDir, `${safeId}.video.txt`);
  const serverLogPath = serverLogReference || path.join(logsDir, `${safeId}.server.log`);
  if (!fs.existsSync(screenshotPath)) fs.writeFileSync(screenshotPath, `fixture screenshot placeholder for ${item.caseId}\n`, "utf8");
  writeJson(tracePath, { schema: "media-server.v390-ui-automation-trace.v1", caseId: item.caseId, fixture: true });
  fs.writeFileSync(videoPath, `fixture video placeholder for ${item.caseId}\n`, "utf8");
  if (!serverLogReference) fs.writeFileSync(serverLogPath, `fixture server log reference for ${item.caseId}\n`, "utf8");
  return { screenshotPath, tracePath, videoPath, serverLogReference: serverLogPath };
}

function printProgress(current, total, item) {
  const remaining = Math.max(0, total - current);
  console.log(`[progress] (${current}/${total}) ${item.caseId} ${item.route} ${item.controlAction} test; remaining=${remaining}`);
}

function makeCase(item, status, actualResult, artifact) {
  return {
    caseId: item.caseId,
    featureId: item.featureId,
    route: item.route,
    viewport: item.viewport,
    theme: item.theme,
    accountRole: item.accountRole,
    controlAction: item.controlAction,
    expectedResult: item.expectedResult,
    expectedMarkers: item.expectedMarkers || [],
    actualResult,
    status,
    screenshotPath: artifact.screenshotPath,
    tracePath: artifact.tracePath,
    videoPath: artifact.videoPath,
    browserConsole: [],
    serverLogReference: artifact.serverLogReference,
    cleanupPortState: "clean",
    manualIntervention: false,
  };
}

function writeReport(filePath, payload) {
  const lines = [
    "# v3.9.0 UI Automation Runner Report",
    "",
    `schema: ${payload.schema}`,
    `result: ${payload.result}`,
    `browserMode: ${payload.browserMode}`,
    `manualIntervention: ${payload.manualIntervention}`,
    `failedCaseId: ${payload.failedCaseId}`,
    `evidenceBoundary: ${payload.evidenceBoundary}`,
    "",
    "| case | status | route | control/action | expected | actual |",
    "| --- | --- | --- | --- | --- | --- |",
    ...payload.cases.map(item => `| ${escapeCell(item.caseId)} | ${item.status} | ${escapeCell(item.route)} | ${escapeCell(item.controlAction)} | ${escapeCell(item.expectedResult)} | ${escapeCell(item.actualResult)} |`),
    "",
  ];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

function writeJson(filePath, payload) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function escapeCell(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
}

function truthy(value) {
  const text = String(value || "").toLowerCase();
  return text === "1" || text === "true" || text === "yes" || text === "on";
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
