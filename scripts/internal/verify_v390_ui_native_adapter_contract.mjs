#!/usr/bin/env node
// 파일 용도: native Playwright adapter의 모듈 탐색, capability, fallback 거부, 실제 evidence 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import {
  buildLiveSessionEvidence,
  nativeCapabilities,
  resolvePlaywrightModule,
  secretStrippedBrowserEnv,
} from "./v390_ui_native_adapter.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 native UI adapter contract verification

Usage:
  ./server.sh verify-v390-ui-native-adapter-contract

Checks module discovery, missing-module hard failure, native action capabilities,
runner integration, dispatch/docs, and preserved standalone native evidence.
`);
}
assertKnownOptions(rawArgs, ["h", "help"]);

const adapterSource = readText("scripts/internal/v390_ui_native_adapter.mjs");
const runnerSource = readText("scripts/internal/verify_v390_ui_automation.mjs");
const exactRunnerSource = readText("scripts/internal/run_v390_ui_native_exact_cases.mjs");
const caseRuntimeSource = readText("scripts/internal/v390_ui_case_runtime.mjs");
const serverSh = readText("server.sh");
const docs = [
  readText("docs/development-backlog.md"),
  readText("docs/stream-verification.md"),
  readText("docs/project-feature-test-inventory.md"),
  readText("docs/release-test-records.md"),
  readText("docs/release-evidence-index.md"),
].join("\n");
const checks = [];

check("bundled Playwright module resolves with provenance", () => {
  const resolved = resolvePlaywrightModule();
  assert(Boolean(resolved.playwright?.chromium), "chromium browser type missing");
  assert(Boolean(resolved.modulePath), "modulePath missing");
  assert(/^\d+\./.test(resolved.moduleVersion), `invalid moduleVersion: ${resolved.moduleVersion}`);
  assert(resolved.attempts.some(item => item.status === "selected"), "selected module attempt missing");
});

check("explicit missing module fails without fallback", () => {
  let failed = false;
  try {
    resolvePlaywrightModule({ modulePath: "/tmp/media-server-missing-playwright", requireExplicit: true });
  } catch (error) {
    failed = true;
    assert(String(error.message).includes("native Playwright module unavailable"), "missing-module reason mismatch");
    assert(Array.isArray(error.attempts) && error.attempts[0]?.status === "missing-package-json", "missing-module attempt evidence missing");
  }
  assert(failed, "missing explicit module must fail");
});

check("adapter exposes native wait click fill type select screenshot", () => {
  for (const capability of ["wait", "click", "fill", "type", "select", "screenshot", "evaluate", "request-correlation", "request-start-ledger", "network-quiet", "role-session-switch"]) {
    assert(nativeCapabilities.includes(capability), `missing capability ${capability}`);
  }
  for (const snippet of ["waitForSelector", "page.locator(selector).click", "page.locator(selector).fill", "pressSequentially", "selectOption", "page.screenshot"]) {
    assert(adapterSource.includes(snippet), `adapter source missing ${snippet}`);
  }
  assert(adapterSource.includes("readOnly: Boolean(element && 'readOnly' in element && element.readOnly)"),
    "adapter snapshot does not expose product readonly state");
  for (const snippet of ["x-media-server-correlation-id", "requestId", "correlationSource", "setCorrelationId"]) {
    assert(adapterSource.includes(snippet), `adapter correlation source missing ${snippet}`);
  }
  for (const snippet of ["page.on(\"request\"", "pendingRequests", "correlatedEntryCount", "entry.correlationId === correlationId"]) {
    assert(adapterSource.includes(snippet), `adapter action-window source missing ${snippet}`);
  }
});

check("whoami observation keeps setup-required and unauthorized sessions anonymous", () => {
  const unauthenticatedBranches = adapterSource.match(/principal\?\.authenticated === false/g) || [];
  assert(unauthenticatedBranches.length === 2,
    `setup-required anonymous handling must cover requested/observed and visual capture: ${unauthenticatedBranches.length}`);
  assert(adapterSource.includes("if (response.status === 401) {\n          accountRole = 'anonymous';") &&
    adapterSource.includes("if (principal?.authenticated === false) {\n            accountRole = 'anonymous';"),
  "whoami observation does not distinguish 401 and setup-required unauthenticated principals");
  assert(adapterSource.includes("principal?.authenticated === true && typeof principal?.role === 'string'"),
    "authenticated whoami observation no longer requires an exact role");
});

check("native browser child strips acceptance secrets", () => {
  const env = secretStrippedBrowserEnv({
    SAFE_VALUE: "preserved",
    MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD: "contract-admin-secret",
    MEDIA_SERVER_V390_UI_ROLE_SECRETS: "contract-role-secrets",
  });
  assert(env.SAFE_VALUE === "preserved", "browser child stripped an unrelated environment value");
  assert(!("MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD" in env), "browser child inherited the admin secret");
  assert(!("MEDIA_SERVER_V390_UI_ROLE_SECRETS" in env), "browser child inherited the role-secret JSON");
  assert(adapterSource.includes("env: secretStrippedBrowserEnv()"),
    "Playwright Chromium launch is not bound to the stripped environment");
});

check("issued invite tokens are registered and redacted at every evidence boundary", () => {
  for (const snippet of [
    "onRuntimeSecret",
    'kind: "issued-invite-token"',
    "invite response runtime secret sink is unavailable",
    "safeResponseReadFailures",
    "redactObservedSecrets",
    "assertEvidenceDomSecretsAbsent",
    "sanitizeEvidenceValue(consoleEntries",
    "sanitizeEvidenceValue(networkEntries",
    "persistentSecretFieldsPresent",
  ]) {
    assert(adapterSource.includes(snippet), `adapter invite secret boundary missing: ${snippet}`);
  }
  for (const snippet of [
    "caseRuntime.registerObservedSecret",
    "browser.registerRuntimeSecret",
    "runtimeSecretRedaction",
    "issued invite token was not registered or remained in the evidence DOM",
  ]) {
    assert(exactRunnerSource.includes(snippet), `exact runner invite secret binding missing: ${snippet}`);
  }
  for (const snippet of [
    "registerObservedSecret",
    "issued-invite-token",
    "raw issued invite token reached the authoritative store",
    "forbiddenSecretAbsent",
  ]) {
    assert(caseRuntimeSource.includes(snippet), `runtime invite secret oracle missing: ${snippet}`);
  }
});

check("live session evidence preserves request view and response session identity", () => {
  const correlationId = "visual-live:session";
  const entries = [
    { phase: "request-start", requestId: "request-1", correlationId, method: "POST", url: "http://127.0.0.1/client/api/views/view-b/webrtc/session", requestBody: { overlayMode: "va-overlay" } },
    { phase: "response", requestId: "request-1", correlationId, method: "POST", status: 200, url: "http://127.0.0.1/client/api/views/view-b/webrtc/session", safeResponseBody: { sessionId: "session-b", offerReceived: true } },
    { phase: "request-start", requestId: "request-2", correlationId, method: "POST", url: "http://127.0.0.1/client/api/views/view-b/webrtc/session/session-b/answer" },
    { phase: "response", requestId: "request-2", correlationId, method: "POST", status: 200, url: "http://127.0.0.1/client/api/views/view-b/webrtc/session/session-b/answer" },
  ];
  const evidence = buildLiveSessionEvidence(entries, correlationId, "tile-0:view-a", "view-a");
  assert(evidence.tileViewId === "view-a", "tile view identity missing");
  assert(evidence.requestViewId === "view-b" && evidence.answerViewId === "view-b", "request view was overwritten by tile view");
  assert(evidence.responseSessionId === "session-b" && evidence.answerSessionId === "session-b", "response/answer session identity missing");
  assert(evidence.offerReceived === true, "safe offer response evidence missing");
});

check("UI runner selects native Playwright and rejects CDP promotion", () => {
  for (const snippet of [
    "createNativePlaywrightAdapter",
    'engine: "playwright-native"',
    "Chrome/CDP fallback is not accepted as Playwright PASS",
    "playwrightModulePath",
  ]) {
    assert((runnerSource + "\n" + adapterSource).includes(snippet), `runner native integration missing ${snippet}`);
  }
});

check("server dispatch and docs expose reproducible native commands", () => {
  for (const command of ["verify-v390-ui-native-adapter", "verify-v390-ui-native-adapter-contract"]) {
    assert(serverSh.includes(command), `server.sh missing ${command}`);
    assert(docs.includes(command), `docs missing ${command}`);
  }
  for (const snippet of ["V390-ADD1-08", "playwright-native", "wait/click/fill/select/screenshot"]) {
    assert(docs.includes(snippet), `docs missing ${snippet}`);
  }
});

check("preserved standalone evidence proves native actions", () => {
  const summaryPath = path.join(rootDir, "docs/release-artifacts/v3.9.0/ui-native-adapter-final/summary.json");
  assert(fs.existsSync(summaryPath), "native adapter summary missing");
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  assert(summary.schema === "media-server.v390-ui-native-adapter.v1", "native adapter schema mismatch");
  assert(summary.result === "PASS", "native adapter result must PASS");
  assert(summary.selectedAdapter?.engine === "playwright-native", "native engine not selected");
  assert(summary.selectedAdapter?.fallbackUsed === false, "fallback must be false");
  for (const kind of ["wait", "fill", "type", "select", "click", "screenshot"]) {
    assert(summary.actions.some(action => action.kind === kind && action.status === "PASS"), `missing PASS action ${kind}`);
  }
  assert(summary.finalState === "native-adapter:ready:typed", "native final state mismatch");
  for (const field of ["screenshotPath", "tracePath"]) {
    assert(fs.existsSync(summary[field]), `native artifact missing ${field}`);
  }
});

check("current UI suite state does not reuse stale native evidence", () => {
  const statePath = path.join(rootDir, "test/fixtures/v390_ui_current_evidence_state.json");
  assert(fs.existsSync(statePath), "current UI evidence state missing");
  const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
  assert(state.status === "not-run" && state.actualBrowserExecution === false,
    "current UI evidence state must be explicit not-run");
  assert(state.automatedCaseCount === 0 && state.uiFulltestPass === false,
    "current UI evidence state invented suite PASS");
});

let pass = 0;
let fail = 0;
for (const item of checks) {
  try {
    item.fn();
    pass += 1;
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    fail += 1;
    console.log(`[fail] ${item.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
console.log("");
console.log("== v3.9.0 native UI adapter contract summary ==");
console.log(`- capabilities: ${nativeCapabilities.join(",")}`);
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
