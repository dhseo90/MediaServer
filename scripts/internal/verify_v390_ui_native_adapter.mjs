#!/usr/bin/env node
// 파일 용도: native Playwright adapter의 wait/click/fill/select/screenshot 동작과 provenance를 독립 재현한다.

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import { createNativePlaywrightAdapter, nativeCapabilities } from "./v390_ui_native_adapter.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 native UI adapter verification

Usage:
  ./server.sh verify-v390-ui-native-adapter --output-dir <path> [options]

Options:
  --output-dir <path>              summary/report/screenshot/trace output directory.
  --playwright-module-path <path>  Explicit Playwright package directory.
  --chrome-path <path>             Explicit Chrome/Chromium executable.
  -h, --help                       Show help.

The verifier serves a local reproduction page and performs native wait, fill/type,
select, click, state wait, and screenshot actions. Missing native Playwright fails
preflight; Chrome/CDP fallback is not used.
`);
}

assertKnownOptions(rawArgs, ["output-dir", "playwright-module-path", "chrome-path", "h", "help"]);
const options = parseArgs(rawArgs);
const outputDir = path.resolve(rootDir, options.outputDir);
const summaryPath = path.join(outputDir, "summary.json");
const reportPath = path.join(outputDir, "report.md");
const screenshotPath = path.join(outputDir, "native-adapter.png");
const tracePath = path.join(outputDir, "trace.json");
fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

let server;
let page;
const actions = [];
let adapterSummary = {};
let adapterAttempts = [];
let result = "FAIL";
let failureReason = "";
let finalState = "";
let navigationCorrelation = {};

try {
  const adapter = await createNativePlaywrightAdapter({
    modulePath: options.playwrightModulePath,
    chromePath: options.chromePath,
  });
  adapterSummary = adapter.summary;
  adapterAttempts = adapter.attempts;
  assert(adapterSummary.engine === "playwright-native", "native Playwright engine not selected");
  assert(adapterSummary.fallbackUsed === false, "native adapter must not use fallback");
  assert(nativeCapabilities.every(capability => adapterSummary.capabilities.includes(capability)), "native capability set incomplete");

  server = await startReproductionServer();
  const address = server.address();
  const httpBase = `http://127.0.0.1:${address.port}`;
  const navigationCorrelationId = "NATIVE-ADAPTER:navigation";
  page = await adapter.openPage({
    httpBase,
    pagePath: "/",
    timeoutMs: 15000,
    width: 720,
    height: 640,
    navigationCorrelationId,
  });
  const navigationEntry = page.networkEntries().find(entry =>
    entry.correlationId === navigationCorrelationId && new URL(entry.url).pathname === "/");
  assert(navigationEntry?.correlationSource === "request-header", "navigation request header correlation missing");
  assert(navigationEntry?.requestId && navigationEntry.method === "GET" && navigationEntry.status === 200,
    "navigation request identity/method/status mismatch");
  navigationCorrelation = navigationEntry;

  await step("wait", "#native-name", () => page.waitForSelector("#native-name"));
  await step("fill", "#native-name", () => page.fill("#native-name", "native-adapter"));
  await step("type", "#native-note", () => page.type("#native-note", "typed"));
  await step("select", "#native-mode=ready", () => page.select("#native-mode", "ready"));
  await step("click", "#native-apply", () => page.click("#native-apply"));
  finalState = await step("wait", "#native-status=native-adapter:ready:typed", () =>
    page.waitForText("#native-status", "native-adapter:ready:typed"));
  await step("screenshot", screenshotPath, () => page.screenshot(screenshotPath));
  assert(String(finalState).includes("native-adapter:ready:typed"), `unexpected final state: ${finalState}`);
  result = "PASS";
} catch (error) {
  failureReason = error instanceof Error ? error.message : String(error);
  if (Array.isArray(error?.attempts)) adapterAttempts = error.attempts;
} finally {
  await page?.close().catch(() => {});
  if (server) await new Promise(resolve => server.close(resolve));
}

const summary = {
  schema: "media-server.v390-ui-native-adapter.v1",
  result,
  command: `./server.sh verify-v390-ui-native-adapter ${rawArgs.join(" ")}`,
  selectedAdapter: adapterSummary,
  adapterAttempts,
  capabilities: nativeCapabilities,
  actions,
  finalState,
  navigationCorrelation,
  failureReason,
  screenshotPath,
  tracePath,
  cleanup: {
    pageClosed: true,
    serverStopped: true,
    fallbackUsed: adapterSummary.fallbackUsed ?? false,
  },
  reproduction: {
    command: "./server.sh verify-v390-ui-native-adapter --output-dir <path>",
    explicitModuleCommand: "./server.sh verify-v390-ui-native-adapter --output-dir <path> --playwright-module-path <package-dir>",
  },
};
fs.writeFileSync(tracePath, `${JSON.stringify({
  schema: "media-server.v390-ui-native-adapter-trace.v1",
  actions,
  finalState,
  navigationCorrelation,
}, null, 2)}\n`);
fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
fs.writeFileSync(reportPath, renderReport(summary));

console.log("");
console.log("== v3.9.0 native UI adapter summary ==");
console.log(`- result: ${summary.result}`);
console.log(`- engine: ${summary.selectedAdapter.engine || "unavailable"}`);
console.log(`- moduleVersion: ${summary.selectedAdapter.moduleVersion || "unavailable"}`);
console.log(`- actions: ${summary.actions.filter(action => action.status === "PASS").length}/${summary.actions.length}`);
console.log(`- fallbackUsed: ${summary.cleanup.fallbackUsed}`);
console.log(`- summaryPath: ${summaryPath}`);
if (result !== "PASS") process.exit(1);

function parseArgs(args) {
  const parsed = { outputDir: "", playwrightModulePath: "", chromePath: "" };
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === "--output-dir") parsed.outputDir = args[++index] || "";
    else if (token.startsWith("--output-dir=")) parsed.outputDir = token.slice("--output-dir=".length);
    else if (token === "--playwright-module-path") parsed.playwrightModulePath = args[++index] || "";
    else if (token.startsWith("--playwright-module-path=")) parsed.playwrightModulePath = token.slice("--playwright-module-path=".length);
    else if (token === "--chrome-path") parsed.chromePath = args[++index] || "";
    else if (token.startsWith("--chrome-path=")) parsed.chromePath = token.slice("--chrome-path=".length);
  }
  assert(parsed.outputDir, "--output-dir is required");
  return parsed;
}

async function step(kind, target, action) {
  const startedAt = Date.now();
  try {
    const value = await action();
    actions.push({ kind, target, status: "PASS", durationMs: Date.now() - startedAt });
    return value;
  } catch (error) {
    actions.push({
      kind,
      target,
      status: "FAIL",
      durationMs: Date.now() - startedAt,
      reason: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

async function startReproductionServer() {
  const instance = http.createServer((request, response) => {
    if (request.url !== "/") {
      response.writeHead(404).end("not found");
      return;
    }
    response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    response.end(`<!doctype html><html><head><meta charset="utf-8"><title>Native Adapter</title></head>
<body><main><h1>Native Playwright Adapter</h1>
<label>Name <input id="native-name"></label>
<label>Note <input id="native-note"></label>
<label>Mode <select id="native-mode"><option value="pending">Pending</option><option value="ready">Ready</option></select></label>
<button id="native-apply" type="button">Apply</button><p id="native-status" aria-live="polite">pending</p></main>
<script>document.getElementById('native-apply').addEventListener('click', () => {
  const name = document.getElementById('native-name').value;
  const mode = document.getElementById('native-mode').value;
  const note = document.getElementById('native-note').value;
  document.getElementById('native-status').textContent = name + ':' + mode + ':' + note;
});</script></body></html>`);
  });
  await new Promise((resolve, reject) => {
    instance.once("error", reject);
    instance.listen(0, "127.0.0.1", resolve);
  });
  return instance;
}

function renderReport(payload) {
  return [
    "# v3.9.0 Native UI Adapter Report",
    "",
    `result: ${payload.result}`,
    `engine: ${payload.selectedAdapter.engine || "unavailable"}`,
    `moduleVersion: ${payload.selectedAdapter.moduleVersion || "unavailable"}`,
    `fallbackUsed: ${payload.cleanup.fallbackUsed}`,
    `finalState: ${payload.finalState}`,
    `navigationCorrelation: ${payload.navigationCorrelation.correlationId || "unavailable"}`,
    "",
    "| action | target | status | durationMs |",
    "| --- | --- | --- | --- |",
    ...payload.actions.map(action => `| ${action.kind} | ${action.target} | ${action.status} | ${action.durationMs} |`),
  ].join("\n") + "\n";
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
