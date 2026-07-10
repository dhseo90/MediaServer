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
import { createNativePlaywrightAdapter } from "./v390_ui_native_adapter.mjs";
import {
  evaluateVisibleAssertions,
  validateVisibleAssertionSchema,
  visibleDomAssertionModel,
} from "./v390_visible_dom_assertions.mjs";
import {
  collectSourceProvenance,
  deduplicateScreenshotArtifacts,
  scanArtifactTree,
} from "./evidence_integrity_lib.mjs";

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
  --playwright-module-path <path>
                              Explicit native Playwright package directory.
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
  "playwright-module-path",
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
const registryDir = path.join(outputDir, "core-registry");
const eventStoragePath = path.join(outputDir, "core-events.jsonl");
const eventSnapshotDir = path.join(outputDir, "core-snapshots");
const eventClipDir = path.join(outputDir, "core-clips");
const runId = `v390-ui-automation-${new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14)}-${process.pid}`;
const requiredCaseIds = ["UI-108", "UI-109", "UI-110", "UI-111", "UI-112", "UI-113", "UI-114", "UI-115"];
const cases = loadCases(options.caseManifest);
const fixtureMode = options.fixturePass || options.fixtureFailCase !== "";
const adapterPlan = buildAdapterPlan(options.browserMode);
let selectedAdapter = selectSyntheticAdapter(fixtureMode ? "fixture" : (options.oneShotSummary ? "one-shot-summary" : "pending"));
let adapterAttempts = [makeAdapterAttempt(selectedAdapter.tool, selectedAdapter.engine, "pending", "runtime adapter not resolved yet")];
let cleanupState = {
  status: "pending",
  verificationSource: "filesystem-and-port-observation",
  coreServerStarted: false,
  coreServerStopped: false,
  authServerStarted: false,
  authServerStopped: true,
  portsClean: false,
  temporaryArtifactsRemoved: false,
  removedTemporaryArtifacts: [],
  checks: [],
};

prepareOutputDir();

let normalizedCases;

if (fixtureMode) {
  normalizedCases = runFixtureCases();
} else if (options.oneShotSummary) {
  normalizedCases = normalizeOneShotSummary();
} else {
  normalizedCases = await runRealUiAutomation();
}

if (cleanupState.status === "pending") finalizeNoServerCleanup();
const screenshotIntegrity = deduplicateScreenshotArtifacts(normalizedCases);
const artifactScan = scanArtifactTree(outputDir);
const artifactIntegrity = {
  referencedScreenshots: screenshotIntegrity.referencedScreenshots,
  uniqueScreenshotFiles: screenshotIntegrity.uniqueScreenshotFiles,
  duplicateScreenshotFilesRemoved: screenshotIntegrity.duplicateScreenshotFilesRemoved,
  removedDuplicateScreenshots: screenshotIntegrity.removed,
  placeholderVideoFiles: artifactScan.placeholderVideoFiles.length,
  placeholderVideoPaths: artifactScan.placeholderVideoFiles,
};
for (const item of normalizedCases) {
  item.cleanupPortState = cleanupState.portsClean ? "clean" : "not-clean";
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
  toolSelection: adapterPlan,
  adapterPlan,
  selectedAdapter,
  adapterAttempts,
  nativeAdapterRequired: options.browserMode === "playwright" && !fixtureMode && !options.oneShotSummary,
  sourceProvenance: collectSourceProvenance(rootDir),
  result: failCount > 0 || cleanupState.status !== "PASS" || artifactIntegrity.placeholderVideoFiles > 0 ? "FAIL" : "PASS",
  automationResult: failCount > 0 ? "FAIL" : "PASS",
  evidenceBoundary: "automationResult is not manual UI fulltest, 30-minute, 120-minute, published, or release-action evidence",
  manualIntervention: false,
  failedInteractionCount: failCount,
  requiredCaseIds,
  caseManifestSchema: "media-server.v390-ui-automation-cases.v3",
  assertionModel: visibleDomAssertionModel,
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
  artifactIntegrity,
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
    playwrightModulePath: "",
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
    } else if (arg.startsWith("--playwright-module-path=")) {
      parsed.playwrightModulePath = arg.slice("--playwright-module-path=".length);
    } else if (arg === "--playwright-module-path") {
      parsed.playwrightModulePath = args[index + 1] || "";
      index += 1;
    } else if (arg === "--timeout-ms") {
      parsed.timeoutMs = args[index + 1] || "";
      index += 1;
    } else if (arg.startsWith("--allow-chrome-fallback=")) {
      parsed.allowChromeFallback = arg.slice("--allow-chrome-fallback=".length) || "1";
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
  assert(payload.schema === "media-server.v390-ui-automation-cases.v3", "unexpected UI automation case manifest schema");
  assert(Array.isArray(payload.cases) && payload.cases.length > 0, "case manifest must contain cases");
  const actualCaseIds = payload.cases.map(item => item.caseId);
  assert(JSON.stringify(actualCaseIds) === JSON.stringify(requiredCaseIds),
    `case manifest must contain exact ordered IDs ${requiredCaseIds.join(", ")}`);
  const implementationManifest = JSON.parse(fs.readFileSync(
    path.join(rootDir, "test/fixtures/project_feature_implementation_evidence.json"),
    "utf8",
  ));
  const implementationById = new Map((implementationManifest.items || []).map(item => [item.id, item]));
  for (const item of payload.cases) {
    const implementation = implementationById.get(item.caseId);
    assert(item.featureId === item.caseId, `${item.caseId} featureId must match caseId`);
    assert(implementation?.manualUiCaseId === item.caseId, `${item.caseId} missing exact manual UI manifest mapping`);
    assert(implementation?.uiEvidence?.screenRoute === item.route,
      `${item.caseId} route mismatch: ${item.route} vs ${implementation?.uiEvidence?.screenRoute || "missing"}`);
    assert(item.interaction?.kind === "click" && Boolean(item.interaction.selector), `${item.caseId} missing click interaction`);
    assert(Boolean(item.targetSelector), `${item.caseId} missing targetSelector`);
    assert(Array.isArray(item.stateSelectors) && item.stateSelectors.length > 0, `${item.caseId} missing stateSelectors`);
    validateVisibleAssertionSchema(item.visibleAssertions, item.stateSelectors);
  }
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

function buildAdapterPlan(selected) {
  return [
    {
      tool: "playwright",
      priority: 1,
      selected: selected === "playwright",
      role: "primary-dom-automation",
    },
    {
      tool: "selenium",
      priority: 2,
      selected: selected === "selenium",
      role: "webdriver-fallback",
    },
    {
      tool: "sikulix",
      priority: 3,
      selected: selected === "sikulix",
      role: "visual-fallback",
      visualOnly: true,
    },
  ];
}

function selectSyntheticAdapter(engine) {
  return {
    tool: options.browserMode,
    engine: `${options.browserMode}-${engine}`,
    fallbackUsed: false,
    fallbackReason: "",
    visualOnly: options.browserMode === "sikulix",
    dependencyStatus: engine,
  };
}

function makeAdapterAttempt(tool, engine, status, reason = "") {
  return {
    tool,
    engine,
    status,
    reason,
  };
}

function runFixtureCases() {
  selectedAdapter = selectSyntheticAdapter("fixture");
  adapterAttempts = [makeAdapterAttempt(options.browserMode, selectedAdapter.engine, "selected", "contract fixture mode")];
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
  selectedAdapter = selectSyntheticAdapter("one-shot-summary");
  adapterAttempts = [makeAdapterAttempt(options.browserMode, selectedAdapter.engine, "selected", "normalized one-shot summary mode")];
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
  let runtimeAdapter;
  try {
    runtimeAdapter = await resolveRuntimeAdapter();
    selectedAdapter = runtimeAdapter.summary;
    adapterAttempts = runtimeAdapter.attempts;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    selectedAdapter = {
      tool: options.browserMode,
      engine: "unavailable",
      fallbackUsed: false,
      fallbackReason: message,
      visualOnly: options.browserMode === "sikulix",
      dependencyStatus: "unavailable",
    };
    adapterAttempts = Array.isArray(error?.attempts) && error.attempts.length > 0
      ? error.attempts.map(item => ({
          tool: options.browserMode,
          engine: "playwright-native",
          status: item.status || "failed",
          reason: item.reason || item.candidate || message,
          modulePath: item.candidate || "",
        }))
      : [makeAdapterAttempt(options.browserMode, "unavailable", "failed", message)];
    return makePreflightFailureCases(message);
  }
  const server = await startCoreServer(ports);
  cleanupState.coreServerStarted = true;
  cleanupState.coreServerStopped = false;
  cleanupState.checks.push({ check: "core-server-started", status: "PASS", observed: true, source: server.logPath });
  const httpBase = `http://127.0.0.1:${ports.http}`;
  let failed = false;
  const results = [];
  try {
    await waitForHealth(`${httpBase}/health`, timeoutMs);
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
          runtimeAdapter,
          debugPort: debugPortBase + index,
          timeoutMs,
          serverLogReference: server.logPath,
        });
        results.push(makeCase(item, "PASS", "control action executed and expected UI state captured", artifact));
      } catch (error) {
        failed = true;
        const artifact = error?.artifact || writeCaseArtifacts(item, { serverLogReference: server.logPath });
        results.push(makeCase(item, "FAIL", error instanceof Error ? error.message : String(error), artifact));
      }
    }
  } finally {
    if (!options.keepServer) {
      await stopServer(server);
      cleanupTemporaryArtifacts();
    } else {
      cleanupState.coreServerStopped = false;
      cleanupState.portsClean = false;
      cleanupState.temporaryArtifactsRemoved = false;
    }
  }
  return results;
}

function makePreflightFailureCases(message) {
  let failed = false;
  return cases.map((item, index) => {
    printProgress(index + 1, cases.length, item);
    const artifact = writeCaseArtifacts(item);
    if (failed) return makeCase(item, "not-run", "not run after UI automation preflight failure", artifact);
    failed = true;
    return makeCase(item, "FAIL", `preflight failed: ${message}`, artifact);
  });
}

async function resolveRuntimeAdapter() {
  const attempts = [];
  const requestedMode = options.browserMode;
  if (requestedMode === "playwright") {
    try {
      return await createNativePlaywrightAdapter({
        modulePath: options.playwrightModulePath,
        chromePath: options.chromePath,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const adapterError = new Error(`${message}; native adapter preflight failed and Chrome/CDP fallback is not accepted as Playwright PASS`);
      adapterError.attempts = error?.attempts || [];
      throw adapterError;
    }
  }
  if (requestedMode === "selenium") {
    const seleniumRemoteUrl = process.env.MEDIA_SERVER_SELENIUM_REMOTE_URL || process.env.SELENIUM_REMOTE_URL || "";
    if (seleniumRemoteUrl) {
      attempts.push(makeAdapterAttempt("selenium", "selenium-webdriver", "selected", `remote endpoint ${seleniumRemoteUrl}`));
      return {
        summary: {
          tool: "selenium",
          engine: "selenium-webdriver",
          fallbackUsed: false,
          fallbackReason: "",
          visualOnly: false,
          dependencyStatus: "remote-endpoint",
        },
        attempts,
        openPage: openSeleniumPage.bind(null, seleniumRemoteUrl),
      };
    }
    attempts.push(makeAdapterAttempt("selenium", "selenium-webdriver", "unavailable", "MEDIA_SERVER_SELENIUM_REMOTE_URL/SELENIUM_REMOTE_URL is not set"));
    return resolveChromeCdpFallback(requestedMode, attempts, "selenium remote endpoint unavailable");
  }
  const sikulixCommand = process.env.MEDIA_SERVER_SIKULIX_CMD || process.env.SIKULIX_CMD || "";
  if (sikulixCommand) {
    attempts.push(makeAdapterAttempt("sikulix", "sikulix-visual", "selected", `visual command ${sikulixCommand}`));
    return resolveChromeCdpFallback(requestedMode, attempts, "SikuliX visual capture command is recorded; DOM marker check uses CDP companion");
  }
  attempts.push(makeAdapterAttempt("sikulix", "sikulix-visual", "unavailable", "MEDIA_SERVER_SIKULIX_CMD/SIKULIX_CMD is not set"));
  return resolveChromeCdpFallback(requestedMode, attempts, "sikulix visual command unavailable");
}

async function optionalImport(specifier) {
  try {
    return { module: await import(specifier), errorMessage: "" };
  } catch (error) {
    return { module: null, errorMessage: error instanceof Error ? error.message : String(error) };
  }
}

function resolveChromeCdpFallback(requestedMode, attempts, fallbackReason) {
  const chromePath = options.chromePath || findChrome();
  if (!chromePath) {
    throw new Error(`${fallbackReason}; browser executable not available; pass --chrome-path or --allow-chrome-fallback in Codex sessions`);
  }
  attempts.push(makeAdapterAttempt(requestedMode, "chrome-cdp-fallback", "selected", fallbackReason));
  return {
    summary: {
      tool: requestedMode,
      engine: "chrome-cdp-fallback",
      fallbackUsed: true,
      fallbackReason,
      visualOnly: requestedMode === "sikulix",
      dependencyStatus: "chrome-cdp-fallback",
    },
    attempts,
    openPage: openChromeCdpPage.bind(null, chromePath),
  };
}

async function runBrowserCase(item, { httpBase, runtimeAdapter, debugPort, timeoutMs, serverLogReference }) {
  const artifact = writeCaseArtifacts(item, { serverLogReference });
  const browser = await runtimeAdapter.openPage({
    httpBase,
    pagePath: item.route,
    timeoutMs,
    debugPort,
    width: item.viewport?.width || 390,
    height: item.viewport?.height || 844,
    outputDir: screenshotsDir,
  });
  try {
    await delay(500);
    if (typeof browser.waitForSelector !== "function" || typeof browser.click !== "function") {
      throw new Error(`adapter ${selectedAdapter.engine} does not expose trusted user-action methods`);
    }
    const nativeEvidence = await performNativeInteractions(browser, item, timeoutMs);
    const result = await browser.evaluate(
      `
        (async () => {
          const nativeEvidence = ${JSON.stringify(nativeEvidence)};
          const interaction = ${JSON.stringify(item.interaction)};
          const targetSelector = ${JSON.stringify(item.targetSelector)};
          const stateSelectors = ${JSON.stringify(item.stateSelectors)};
          const readState = () => stateSelectors.map((selector) => {
            const element = document.querySelector(selector);
            const rect = element ? element.getBoundingClientRect() : null;
            const style = element ? getComputedStyle(element) : null;
            return {
              selector,
              exists: Boolean(element),
              visible: Boolean(rect && rect.width > 0 && rect.height > 0 && style && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0),
              text: String(element?.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 1200),
            };
          });
          const setupEvidence = nativeEvidence.setup;
          const beforeState = nativeEvidence.beforeState;
          const control = document.querySelector(interaction.selector);
          await new Promise((resolve) => setTimeout(resolve, 500));
          const afterState = readState();
          const target = document.querySelector(targetSelector);
          const targetRect = target ? target.getBoundingClientRect() : null;
          const targetStyle = target ? getComputedStyle(target) : null;
          const targetVisible = Boolean(targetRect && targetRect.width > 0 && targetRect.height > 0 && targetStyle && targetStyle.display !== 'none' && targetStyle.visibility !== 'hidden' && Number(targetStyle.opacity || 1) > 0);
          const missingStateSelectors = afterState.filter((state) => !state.exists || !state.text).map((state) => state.selector);
          return {
            ok: setupEvidence.every((step) => step.executed) && Boolean(control) && targetVisible && missingStateSelectors.length === 0,
            missingStateSelectors,
            interaction: {
              kind: interaction.kind,
              selector: interaction.selector,
              executed: Boolean(control),
              dispatch: nativeEvidence.dispatch,
              setup: setupEvidence,
            },
            target: { selector: targetSelector, exists: Boolean(target), visible: targetVisible },
            beforeState,
            afterState,
            title: document.title,
          };
        })()
      `,
      10000,
    );
    const assertionEvidence = evaluateVisibleAssertions(item.visibleAssertions, result?.afterState || []);
    result.assertionModel = assertionEvidence.model;
    result.visibleAssertions = assertionEvidence.assertions;
    result.ok = result.ok === true && assertionEvidence.pass === true;
    artifact.interactionEvidence = result?.interaction || defaultInteractionEvidence(item);
    artifact.stateEvidence = {
      target: result?.target || { selector: item.targetSelector, exists: false, visible: false },
      before: result?.beforeState || [],
      after: result?.afterState || [],
      assertions: assertionEvidence.assertions,
    };
    await browser.screenshot(artifact.screenshotPath);
    const browserConsole = browser.consoleEntries ? browser.consoleEntries() : [];
    writeJson(artifact.browserConsolePath, browserConsole);
    writeJson(artifact.tracePath, {
      schema: "media-server.v390-ui-automation-trace.v1",
      caseId: item.caseId,
      route: item.route,
      controlAction: item.controlAction,
      browserMode: options.browserMode,
      adapter: selectedAdapter,
      assertionModel: visibleDomAssertionModel,
      visibleAssertions: item.visibleAssertions,
      interactionEvidence: artifact.interactionEvidence,
      stateEvidence: artifact.stateEvidence,
      browserConsolePath: artifact.browserConsolePath,
      result,
    });
    if (!result?.ok) {
      const reasons = [];
      const missingSetup = (result?.interaction?.setup || []).filter(step => !step.executed).map(step => step.selector);
      if (missingSetup.length > 0) reasons.push(`setup control not found: ${missingSetup.join(", ")}`);
      if (!result?.interaction?.executed) reasons.push(`control not found: ${item.interaction.selector}`);
      if (!result?.target?.visible) reasons.push(`target not visible: ${item.targetSelector}`);
      if ((result?.missingStateSelectors || []).length > 0) reasons.push(`missing state: ${result.missingStateSelectors.join(", ")}`);
      const failedAssertions = (result?.visibleAssertions || []).filter(assertion => !assertion.pass);
      if (failedAssertions.length > 0) {
        reasons.push(`visible DOM assertion failed: ${failedAssertions.map(assertion => `${assertion.selector}[${assertion.missingText.join("|") || "not-visible-or-empty"}]`).join(", ")}`);
      }
      const failure = new Error(reasons.join("; ") || "UI action/state verification failed");
      failure.artifact = artifact;
      throw failure;
    }
    return artifact;
  } finally {
    await browser.close();
  }
}

async function performNativeInteractions(browser, item, timeoutMs) {
  const setup = [];
  for (const step of item.setupInteractions || []) {
    await browser.waitForSelector(step.selector, { state: "visible", timeout: timeoutMs });
    if (step.kind === "click") await browser.click(step.selector);
    else if (step.kind === "select") await browser.select(step.selector, step.value);
    else throw new Error(`unsupported native setup interaction: ${step.kind}`);
    setup.push({ ...step, executed: true, dispatch: selectedAdapter.engine });
    await delay(250);
  }
  const beforeState = await readNativeState(browser, item.stateSelectors || []);
  await browser.waitForSelector(item.interaction.selector, { state: "visible", timeout: timeoutMs });
  if (item.interaction.kind === "click") await browser.click(item.interaction.selector);
  else if (item.interaction.kind === "select") await browser.select(item.interaction.selector, item.interaction.value);
  else throw new Error(`unsupported native interaction: ${item.interaction.kind}`);
  return { setup, beforeState, dispatch: selectedAdapter.engine };
}

async function readNativeState(browser, selectors) {
  return browser.evaluate(`(() => ${JSON.stringify(selectors)}.map((selector) => {
    const element = document.querySelector(selector);
    const rect = element ? element.getBoundingClientRect() : null;
    const style = element ? getComputedStyle(element) : null;
    return {
      selector,
      exists: Boolean(element),
      visible: Boolean(rect && rect.width > 0 && rect.height > 0 && style && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || 1) > 0),
      text: String(element?.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 1200),
    };
  }))()`);
}

async function startCoreServer(ports) {
  const logPath = path.join(logsDir, "core-ui.server.log");
  const log = fs.createWriteStream(logPath, { flags: "a" });
  fs.mkdirSync(registryDir, { recursive: true });
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
      MEDIA_SERVER_SOURCE_REGISTRY: path.join(registryDir, "sources.json"),
      MEDIA_SERVER_PUBLISHED_VIEWS: path.join(registryDir, "views.json"),
      MEDIA_SERVER_ANALYSIS_REGISTRY: path.join(registryDir, "analysis.json"),
      MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_PATH: eventStoragePath,
      MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_DIR: eventSnapshotDir,
      MEDIA_SERVER_ANALYSIS_EVENT_CLIP_DIR: eventClipDir,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", chunk => log.write(chunk));
  child.stderr.on("data", chunk => log.write(chunk));
  return { child, log, logPath, ports };
}

function prepareOutputDir() {
  for (const target of [
    screenshotsDir,
    tracesDir,
    logsDir,
    registryDir,
    eventStoragePath,
    eventSnapshotDir,
    eventClipDir,
  ]) {
    fs.rmSync(target, { recursive: true, force: true });
  }
  fs.mkdirSync(screenshotsDir, { recursive: true });
  fs.mkdirSync(tracesDir, { recursive: true });
  fs.mkdirSync(logsDir, { recursive: true });
}

function cleanupTemporaryArtifacts() {
  const removed = [];
  const checks = [];
  for (const target of [registryDir, eventStoragePath, eventSnapshotDir, eventClipDir]) {
    const existedBefore = fs.existsSync(target);
    if (existedBefore) {
      fs.rmSync(target, { recursive: true, force: true });
      removed.push(target);
    }
    const existsAfter = fs.existsSync(target);
    checks.push({ check: "temporary-path-removed", path: target, existedBefore, existsAfter, status: existsAfter ? "FAIL" : "PASS" });
  }
  cleanupState.temporaryArtifactsRemoved = checks.every(item => item.status === "PASS");
  cleanupState.removedTemporaryArtifacts = removed;
  cleanupState.checks.push(...checks);
  finalizeCleanupStatus();
}

function finalizeNoServerCleanup() {
  cleanupState.coreServerStopped = cleanupState.coreServerStarted === false;
  cleanupState.portsClean = cleanupState.coreServerStarted === false;
  cleanupState.checks.push({
    check: "core-server-not-started",
    status: cleanupState.coreServerStopped ? "PASS" : "FAIL",
    observed: cleanupState.coreServerStarted,
  });
  cleanupTemporaryArtifacts();
}

function finalizeCleanupStatus() {
  cleanupState.status = cleanupState.coreServerStopped
    && cleanupState.authServerStopped
    && cleanupState.portsClean
    && cleanupState.temporaryArtifactsRemoved
    && cleanupState.checks.every(item => item.status === "PASS")
    ? "PASS"
    : "FAIL";
}

async function openChromeCdpPage(chromePath, args) {
  return openBrowserPage({
    ...args,
    chromePath,
  });
}

async function openPlaywrightPage(playwright, {
  httpBase,
  pagePath,
  timeoutMs,
  chromePath,
  width = 390,
  height = 844,
}) {
  const consoleEntries = [];
  const browser = await playwright.chromium.launch({
    headless: true,
    ...(chromePath ? { executablePath: chromePath } : {}),
  });
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  page.on("console", message => {
    consoleEntries.push({
      level: message.type(),
      text: message.text(),
    });
  });
  page.on("pageerror", error => {
    consoleEntries.push({
      level: "error",
      text: error instanceof Error ? error.message : String(error),
    });
  });
  await page.goto(new URL(pagePath, `${httpBase}/`).toString(), {
    waitUntil: "load",
    timeout: timeoutMs,
  });
  return {
    evaluate: (expression, evalTimeoutMs) => page.evaluate(`(() => ${expression})()`, { timeout: evalTimeoutMs }),
    screenshot: (outputFile) => page.screenshot({ path: outputFile }),
    consoleEntries: () => consoleEntries,
    close: async () => {
      await context.close();
      await browser.close();
    },
  };
}

async function openSeleniumPage(remoteUrl, {
  httpBase,
  pagePath,
  timeoutMs,
  width = 390,
  height = 844,
}) {
  const endpoint = remoteUrl.replace(/\/+$/, "");
  const sessionResponse = await fetch(`${endpoint}/session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      capabilities: {
        alwaysMatch: {
          browserName: "chrome",
          "goog:chromeOptions": {
            args: [`--window-size=${width},${height}`, "--headless=new", "--no-first-run", "--no-default-browser-check"],
          },
        },
      },
    }),
  });
  if (!sessionResponse.ok) {
    throw new Error(`selenium session failed: HTTP ${sessionResponse.status}`);
  }
  const sessionPayload = await sessionResponse.json();
  const sessionId = sessionPayload.sessionId || sessionPayload.value?.sessionId;
  assert(sessionId, "selenium session id missing");
  const command = async (pathSuffix, body = {}) => {
    const response = await fetch(`${endpoint}/session/${sessionId}${pathSuffix}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(`selenium command ${pathSuffix} failed: HTTP ${response.status}`);
    return response.json();
  };
  await command("/url", { url: new URL(pagePath, `${httpBase}/`).toString() });
  await waitForDocumentReady(expression => command("/execute/sync", {
    script: `return (${expression});`,
    args: [],
  }).then(payload => payload.value), timeoutMs);
  return {
    evaluate: (expression) => command("/execute/sync", {
      script: `return (${expression});`,
      args: [],
    }).then(payload => payload.value),
    screenshot: async (outputFile) => {
      const payload = await command("/screenshot", {});
      fs.writeFileSync(outputFile, Buffer.from(payload.value || "", "base64"));
    },
    consoleEntries: () => [],
    close: async () => {
      await fetch(`${endpoint}/session/${sessionId}`, { method: "DELETE" }).catch(() => {});
    },
  };
}

async function stopServer(server) {
  if (!server?.child) return;
  let observedExit = server.child.exitCode !== null || server.child.signalCode !== null;
  const exitPromise = new Promise(resolve => {
    if (observedExit) resolve();
    else server.child.once("exit", () => {
      observedExit = true;
      resolve();
    });
  });
  if (!server.child.killed) {
    server.child.kill("SIGTERM");
  }
  await Promise.race([exitPromise, delay(5000)]);
  if (!observedExit) {
    server.child.kill("SIGKILL");
    await Promise.race([exitPromise, delay(1000)]);
  }
  server.log?.end();
  cleanupState.coreServerStopped = observedExit;
  const httpPortClean = await canListen(server.ports.http);
  const rtspPortClean = await canListen(server.ports.rtsp);
  cleanupState.portsClean = httpPortClean && rtspPortClean;
  cleanupState.checks.push(
    { check: "core-server-exited", status: observedExit ? "PASS" : "FAIL", observed: observedExit },
    { check: "http-port-clean", status: httpPortClean ? "PASS" : "FAIL", port: server.ports.http, observed: httpPortClean },
    { check: "rtsp-port-clean", status: rtspPortClean ? "PASS" : "FAIL", port: server.ports.rtsp, observed: rtspPortClean },
  );
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
  const videoPath = "";
  const browserConsolePath = path.join(logsDir, `${safeId}.browser-console.json`);
  const serverLogPath = serverLogReference || path.join(logsDir, `${safeId}.server.log`);
  if ((fixtureMode || options.oneShotSummary) && !fs.existsSync(screenshotPath)) writeFixturePng(screenshotPath);
  if (!fs.existsSync(tracePath)) writeJson(tracePath, { schema: "media-server.v390-ui-automation-trace.v1", caseId: item.caseId, fixture: true });
  if (!fs.existsSync(browserConsolePath)) writeJson(browserConsolePath, []);
  if (!serverLogReference) fs.writeFileSync(serverLogPath, `fixture server log reference for ${item.caseId}\n`, "utf8");
  return {
    screenshotPath,
    tracePath,
    videoPath,
    videoEvidence: {
      status: "not-captured",
      reason: fixtureMode || options.oneShotSummary
        ? "contract fixture does not capture video"
        : "selected native adapter does not advertise video capture",
      placeholderCreated: false,
    },
    browserConsolePath,
    serverLogReference: serverLogPath,
    interactionEvidence: defaultInteractionEvidence(item),
    stateEvidence: {
      target: { selector: item.targetSelector, exists: false, visible: false },
      before: [],
      after: [],
      assertions: [],
    },
  };
}

function writeFixturePng(filePath) {
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
  fs.writeFileSync(filePath, png);
}

function defaultInteractionEvidence(item) {
  return {
    kind: item.interaction?.kind || "",
    selector: item.interaction?.selector || "",
    executed: false,
    dispatch: fixtureMode ? "fixture-not-executed" : "not-executed",
  };
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
    setupInteractions: item.setupInteractions || [],
    interaction: item.interaction,
    targetSelector: item.targetSelector,
    stateSelectors: item.stateSelectors,
    expectedResult: item.expectedResult,
    visibleAssertions: item.visibleAssertions,
    assertionModel: visibleDomAssertionModel,
    actualResult,
    status,
    interactionEvidence: artifact.interactionEvidence,
    stateEvidence: artifact.stateEvidence,
    failureEvidence: status === "FAIL" ? {
      reason: actualResult,
      failedAction: item.interaction,
      stateEvidence: artifact.stateEvidence,
      screenshotPath: artifact.screenshotPath,
      tracePath: artifact.tracePath,
      browserConsolePath: artifact.browserConsolePath,
      serverLogReference: artifact.serverLogReference,
    } : (status === "not-run" ? {
      reason: actualResult,
      blockedByPreviousFailure: true,
    } : null),
    screenshotPath: artifact.screenshotPath,
    tracePath: artifact.tracePath,
    videoPath: artifact.videoPath,
    videoEvidence: artifact.videoEvidence,
    browserConsolePath: artifact.browserConsolePath,
    browserConsole: [],
    serverLogReference: artifact.serverLogReference,
    cleanupPortState: "clean",
    manualIntervention: false,
    adapterEvidence: {
      tool: selectedAdapter.tool,
      engine: selectedAdapter.engine,
      fallbackUsed: selectedAdapter.fallbackUsed,
      fallbackReason: selectedAdapter.fallbackReason,
      dependencyStatus: selectedAdapter.dependencyStatus,
      visualOnly: selectedAdapter.visualOnly,
      modulePath: selectedAdapter.modulePath || "",
      moduleVersion: selectedAdapter.moduleVersion || "",
      browserExecutable: selectedAdapter.browserExecutable || "",
      capabilities: selectedAdapter.capabilities || [],
    },
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
    `failedCaseId: ${payload.failedCaseId || "(none)"}`,
    `evidenceBoundary: ${payload.evidenceBoundary}`,
    "",
    "| case | status | route | control/action | expected | actual |",
    "| --- | --- | --- | --- | --- | --- |",
    ...payload.cases.map(item => `| ${escapeCell(item.caseId)} | ${item.status} | ${escapeCell(item.route)} | ${escapeCell(item.controlAction)} | ${escapeCell(item.expectedResult)} | ${escapeCell(item.actualResult)} |`),
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
