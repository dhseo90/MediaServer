#!/usr/bin/env node
// 파일 용도: canonical 424의 브라우저 콜백/adapter 경계를 격리 mock-browser에서 실행하고 lexical free identifier를 fail-closed 검증한다.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

import { buildCanonicalActionRequestCensus } from "./v390_ui_action_request_ledger.mjs";
import {
  browserCallbackDefinitions,
  browserCallbackIds,
  evaluateRegisteredBrowserCallback,
} from "./v390_ui_browser_callback_boundary.mjs";
import { createAdapterActionRequestEnvelopeWrapper } from "./v390_ui_native_adapter.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const readJson = relative => JSON.parse(fs.readFileSync(path.join(rootDir, relative), "utf8"));
const manifest = readJson("test/fixtures/v390_ui_native_exact_cases.json");
const red = readJson("test/fixtures/v390_browser_callback_free_identifier_red_20260810.json");
const audit = readJson("test/fixtures/v390_browser_callback_free_variable_audit_20260810.json");
const census = buildCanonicalActionRequestCensus(manifest);
const registry = {
  validate(context, expected) {
    if (!context || context.caseId !== expected.caseId ||
        context.actionId !== expected.actionId || context.phase !== expected.phase) {
      throw new Error("mock browser ownership context mismatch");
    }
  },
};
const checks = [];
const check = async (name, fn) => {
  await fn();
  checks.push(name);
};

await check("latest actual RED SHA binds the clean f8f819c UI-002 ReferenceError", () => {
  assert(red.schema === "media-server.v390-browser-callback-free-identifier-red.v1" &&
    red.sourceCommitSha === "f8f819c0c7f6c84cd18f5f7b479e1deb51d58127" &&
    red.sourceBranch === "v3.9.0" && red.sourceWorktreeClean === true,
  "latest browser callback RED source binding drift");
  assert(JSON.stringify(red.coverage) === JSON.stringify({
    target: 424, attempted: 2, pass: 1, fail: 1, notRun: 422, unsupported: 0,
  }), "latest browser callback RED coverage drift");
  assert(red.firstFailure.caseId === "UI-002" &&
    red.firstFailure.errorName === "ReferenceError" &&
    red.firstFailure.message === "assert is not defined" &&
    red.firstFailure.actionLedgerReached === false,
  "latest browser callback RED failure shape drift");
  assert(JSON.stringify(red.ui001LedgerActual) === JSON.stringify({
    actionOwnedRequests: 0, actionOwnedResponses: 0,
    pageOwnedRequests: 5, pageOwnedResponses: 5,
    backgroundRequests: 2, backgroundResponses: 2,
    correlationLeakRequests: 0, correlationLeakResponses: 0,
    status: "PASS",
  }), "UI-001 actual ledger baseline drift");
  for (const artifact of Object.values(red.artifacts)) {
    assert(/^[0-9a-f]{64}$/.test(artifact.sha256), `invalid RED artifact SHA: ${artifact.path}`);
    const absolute = path.join(rootDir, artifact.path);
    if (fs.existsSync(absolute)) {
      assert(crypto.createHash("sha256").update(fs.readFileSync(absolute)).digest("hex") === artifact.sha256,
        `RED artifact hash drift: ${artifact.path}`);
    }
  }
});

await check("immutable callback audit covers scripts/internal and all registered dynamic callbacks", () => {
  const live = censusDynamicEvaluateCalls(path.join(rootDir, "scripts/internal"));
  assert(audit.schema === "media-server.v390-browser-callback-free-variable-audit.v1" &&
    audit.redSourceCommitSha === "f8f819c0c7f6c84cd18f5f7b479e1deb51d58127" &&
    audit.scope === "scripts/internal" && audit.dynamicEvaluateCallCount === 130 &&
    audit.dynamicEvaluateFileCount === 28 && audit.registeredCallbackCount === 14,
  "browser callback audit summary drift");
  assert(live.callCount === audit.dynamicEvaluateCallCount &&
    JSON.stringify(live.files) === JSON.stringify(audit.remainingEvaluateInventory.files),
  `live browser callback census drift: calls=${live.callCount} files=${live.files.length}`);
  assert(JSON.stringify(audit.registeredCallbacks.map(item => item.callbackId)) ===
    JSON.stringify(browserCallbackIds), "registered browser callback audit ordering drift");
  assert(audit.registeredCallbacks.every(item => item.selfContained === true &&
    item.serializableArgumentOnly === true && item.nodeValidationOutsideCallback === true),
  "registered callback audit contains an open lexical boundary");
  assert(Object.keys(browserCallbackDefinitions).length === browserCallbackIds.length,
    "browser callback definition registry cardinality drift");
});

await check("all canonical 391 request registrations execute the adapter ownership path", () => {
  for (const row of census.rows) {
    const context = {
      caseId: row.caseId,
      phase: row.phase,
      actionId: row.actionId,
      correlationId: row.correlationId,
    };
    const wrapper = createAdapterActionRequestEnvelopeWrapper({
      requestActionOwnershipRegistry: registry,
      context,
      requestEnvelope: {
        method: row.method,
        urlPath: row.materializedPath,
        allowedStatuses: row.allowedStatuses,
        initiatorActionId: row.actionId,
        correlationId: row.correlationId,
        requestOwnershipKind: row.requestOwnershipKind,
      },
      caseId: row.caseId,
      requestKind: row.requestTransport === "document-form"
        ? "document-navigation"
        : "application-fetch",
    });
    assert(wrapper.ledger.envelope.caseId === row.caseId,
      `${row.caseId} mock browser adapter envelope mismatch`);
  }
});

await check("canonical 424 route/ownership/completion branches execute through isolated mock browser", async () => {
  const reached = new Set();
  const requestByCase = new Map(census.rows.map(row => [row.caseId, row]));
  const modes = { request: 0, local: 0, navigation: 0 };
  for (const item of manifest.cases) {
    const target = isolatedMockBrowser();
    await evaluateRegisteredBrowserCallback(target.locator, "adapter.navigation-owner", {
      selectorValue: "body", documentEpoch: 1,
    });
    await evaluateRegisteredBrowserCallback(target.page, "adapter.runtime-context");
    await evaluateRegisteredBrowserCallback(target.locator, "adapter.control-observation");
    const primary = item.actions.find(action => action?.semanticCompletion?.phase === "primary-action");
    const mode = String(primary?.semanticCompletion?.completionMode || "");
    assert(Object.hasOwn(modes, mode), `${item.caseId} canonical completion mode is unknown: ${mode}`);
    modes[mode] += 1;
    if (mode === "request") {
      const row = requestByCase.get(item.caseId);
      assert(row, `${item.caseId} canonical request census row missing`);
      if (row.requestTransport === "exact-api-fetch") {
        await evaluateRegisteredBrowserCallback(target.page, "runner.endpoint-request", {
          method: row.method, path: row.materializedPath, body: null,
        });
      } else {
        await evaluateRegisteredBrowserCallback(target.page, "runtime.location-pathname");
      }
    } else {
      await evaluateRegisteredBrowserCallback(target.page, "runtime.location-pathname");
    }
    reached.add(item.caseId);
  }
  assert(reached.size === 424 && JSON.stringify(modes) === JSON.stringify({
    request: 391, local: 28, navigation: 5,
  }), `canonical 424 callback reachability drift: ${JSON.stringify(modes)}`);
});

await check("every registered callback executes after function serialization with only Web APIs", async () => {
  const target = isolatedMockBrowser();
  const scenarios = {
    "adapter.navigation-owner": [target.locator, { selectorValue: "body", documentEpoch: 1 }],
    "adapter.request": [target.page, {
      requestMethod: "GET", requestPath: "/ops/dashboard",
      requestCorrelationId: "callback-correlation", requestBody: null,
    }],
    "adapter.runtime-context": [target.page, {}],
    "adapter.control-observation": [target.locator, {}],
    "runner.endpoint-request": [target.page, { method: "GET", path: "/ops/dashboard", body: null }],
    "runner.scoped-viewer-dom": [target.page, {
      assignedViewId: "assigned-view", blockedViewId: "blocked-view", disallowedRuleId: "blocked-rule",
    }],
    "runtime.alert-delivery-dom": [target.page, {}],
    "runtime.location-pathname": [target.page, {}],
    "runtime.whoami": [target.page, {}],
    "runtime.role-boundary": [target.page, {}],
    "runtime.ops-users-dom": [target.page, {
      selector: "#ops-users", expectedIdentity: "fixture-user", secret: "forbidden-secret",
    }],
    "runtime.login": [target.page, { username: "fixture-user", password: "runtime-only" }],
    "runtime.logout": [target.page, {}],
    "oracle.viewport-owner": [target.page, { exactSelector: "#viewport-target" }],
  };
  for (const callbackId of browserCallbackIds) {
    const [evaluator, argument] = scenarios[callbackId];
    await evaluateRegisteredBrowserCallback(evaluator, callbackId, argument);
  }
  assert(JSON.stringify([...target.executed].sort()) === JSON.stringify([...browserCallbackIds].sort()),
    "not every registered callback reached the isolated browser realm");
});

await check("missing argument, wrong schema, wrong result, and ReferenceError fail closed", async () => {
  await rejectAsync(
    () => evaluateRegisteredBrowserCallback(isolatedMockBrowser().page, "adapter.request"),
    /argument field invalid.*requestMethod/i,
  );
  await rejectAsync(
    () => evaluateRegisteredBrowserCallback(isolatedMockBrowser().page,
      "runtime.location-pathname", { schema: "wrong-schema" }),
    /argument schema mismatch/i,
  );
  await rejectAsync(
    () => evaluateRegisteredBrowserCallback({
      evaluate: async (_callback, argument) => ({
        schema: "media-server.v390-ui-browser-callback-result.v1",
        callbackId: argument.callbackId,
        pathname: 42,
      }),
    }, "runtime.location-pathname"),
    /result field invalid/i,
  );
  await rejectAsync(
    () => evaluateRegisteredBrowserCallback({
      evaluate: async () => vm.runInNewContext("missingBrowserLexicalIdentifier"),
    }, "runtime.location-pathname"),
    /missingBrowserLexicalIdentifier is not defined/i,
    "ReferenceError",
  );
});

console.log("== v3.9.0 browser callback/free identifier contract ==");
for (const name of checks) console.log(`PASS ${name}`);
console.log(`PASS checks=${checks.length} canonicalCases=${manifest.cases.length} canonicalRequests=${census.rows.length} callbacks=${browserCallbackIds.length}`);

function isolatedMockBrowser() {
  const executed = new Set();
  const rect = { x: 0, y: 0, left: 0, top: 0, right: 120, bottom: 40, width: 120, height: 40 };
  const element = {
    disabled: false,
    getBoundingClientRect: () => ({ ...rect }),
    scrollIntoView() {},
  };
  const preview = { dataset: {
    eventSemanticSchema: "media-server.ops.alert-delivery-payload-preview.v1",
    eventSemanticDeliveryId: "delivery-1", eventSemanticEventId: "event-1",
    eventSemanticEventType: "Intrusion", eventSemanticSourceId: "source-1",
    eventSemanticPayloadRedacted: "true",
  } };
  const dryRun = { dataset: {
    eventSemanticStatus: "dry-run", eventSemanticDryRun: "true",
    eventSemanticAttemptCount: "1", eventSemanticExternalDeliveryPerformed: "false",
    eventSemanticAuditAction: "alert-delivery-dry-run",
  } };
  const section = {
    innerText: "fixture-user pending 모든 범위",
    querySelectorAll: selector => selector === "tr" ? [{ innerText: "fixture-user pending 모든 범위" }] : [],
  };
  const document = {
    visibilityState: "visible",
    documentElement: { clientWidth: 390, clientHeight: 844 },
    body: { innerText: "fixture-user pending 모든 범위" },
    scrollingElement: {},
    querySelector: selector => selector === "#ops-users" ? section : null,
    querySelectorAll(selector) {
      if (selector === "#alertDeliveryPayloadPreview") return [preview];
      if (selector === "#alertDeliveryDryRunResult") return [dryRun];
      if (selector === "#viewport-target") return [element];
      if (selector.includes("assigned-view")) return [element];
      if (selector.includes("blocked-view")) return [];
      return [];
    },
  };
  const response = (requestPath, options = {}) => {
    const pathname = String(requestPath);
    const status = pathname === "/logout" ? 302 :
      pathname === "/ops/api/users" && String(options.method || "GET") === "GET" ? 403 : 200;
    const payload = pathname === "/auth/whoami"
      ? { authenticated: true, username: "fixture-user", role: "operator", scopes: ["view:read"] }
      : { ok: true };
    const text = JSON.stringify(payload);
    return {
      status,
      ok: status >= 200 && status < 300,
      url: pathname === "/login" ? "http://mock.local/ops/home" : `http://mock.local${pathname}`,
      headers: { get: name => String(name).toLowerCase() === "content-type" ? "application/json" : "" },
      text: async () => text,
      json: async () => structuredClone(payload),
    };
  };
  const sandbox = {
    Array, Boolean, Error, JSON, Number, Object, Promise, RegExp, String,
    URL, URLSearchParams,
    CSS: { escape: value => String(value).replace(/[^A-Za-z0-9_-]/g, "_") },
    document,
    fetch: async (requestPath, options) => response(requestPath, options),
    getComputedStyle: () => ({ display: "block", visibility: "visible", opacity: "1" }),
    innerHeight: 844,
    innerWidth: 390,
    location: { pathname: "/ops/users" },
    matchMedia: () => ({ matches: false }),
    requestAnimationFrame: callback => callback(),
  };
  const evaluate = async (callback, argument, locator) => {
    assert(typeof callback === "function", "mock browser requires a function callback");
    executed.add(String(argument?.callbackId || ""));
    const context = vm.createContext({
      ...sandbox,
      __argument: structuredClone(argument),
      __element: element,
    });
    const invocation = locator
      ? `(${callback.toString()})(__element, __argument)`
      : `(${callback.toString()})(__argument)`;
    return vm.runInContext(invocation, context);
  };
  return {
    executed,
    page: { evaluate: (callback, argument) => evaluate(callback, argument, false) },
    locator: { evaluate: (callback, argument) => evaluate(callback, argument, true) },
  };
}

function censusDynamicEvaluateCalls(directory) {
  const files = fs.readdirSync(directory, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith(".mjs"))
    .map(entry => entry.name)
    .sort();
  const matchedFiles = [];
  let callCount = 0;
  for (const file of files) {
    const source = fs.readFileSync(path.join(directory, file), "utf8");
    const matches = source.match(/\.(?:evaluateAll|evaluate)\s*\(/g) || [];
    if (matches.length > 0) matchedFiles.push(file);
    callCount += matches.length;
  }
  return { callCount, files: matchedFiles };
}

async function rejectAsync(fn, pattern, expectedName = "") {
  let error = null;
  try { await fn(); } catch (caught) { error = caught; }
  assert(error && pattern.test(String(error.message || error)),
    `expected rejection ${pattern}: ${error?.message || "none"}`);
  if (expectedName) assert(error.name === expectedName,
    `expected ${expectedName}, got ${error.name || "unknown"}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
