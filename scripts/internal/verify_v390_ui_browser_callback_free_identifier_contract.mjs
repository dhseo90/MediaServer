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
  makeBrowserCallbackArgument,
  mapBrowserCallbackRawResult,
} from "./v390_ui_browser_callback_boundary.mjs";
import { createAdapterActionRequestEnvelopeWrapper } from "./v390_ui_native_adapter.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const readJson = relative => JSON.parse(fs.readFileSync(path.join(rootDir, relative), "utf8"));
const manifest = readJson("test/fixtures/v390_ui_native_exact_cases.json");
const red = readJson("test/fixtures/v390_browser_callback_free_identifier_red_20260810.json");
const rawSchemaRed = readJson("test/fixtures/v390_ui_browser_callback_raw_schema_red_20260810.json");
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
  for (const artifact of Object.values(red.artifacts).filter(item => item.path.includes("/runs/"))) {
    assert(/^[0-9a-f]{64}$/.test(artifact.sha256), `invalid RED artifact SHA: ${artifact.path}`);
    const absolute = path.join(rootDir, artifact.path);
    if (fs.existsSync(absolute)) {
      assert(crypto.createHash("sha256").update(fs.readFileSync(absolute)).digest("hex") === artifact.sha256,
        `RED artifact hash drift: ${artifact.path}`);
    }
  }
});

await check("latest actual UI-001 raw schema mismatch is frozen as an actual-derived RED", () => {
  assert(rawSchemaRed.schema === "media-server.v390-ui-browser-callback-raw-schema-red.v1" &&
    rawSchemaRed.sourceCommitSha === "e248d6a904aed3e1c30ddf8e310c0e367d02b4ec" &&
    rawSchemaRed.sourceBranch === "v3.9.0" && rawSchemaRed.sourceWorktreeClean === true,
  "latest raw schema RED source binding drift");
  assert(JSON.stringify(rawSchemaRed.coverage) === JSON.stringify({
    target: 424, attempted: 1, pass: 0, fail: 1, notRun: 423, unsupported: 0,
  }), "latest raw schema RED coverage drift");
  assert(rawSchemaRed.firstFailure.caseId === "UI-001" &&
    rawSchemaRed.firstFailure.error ===
      "runtime-observed-raw-invalid:observed-fields-mismatch,observed-schema-mismatch" &&
    rawSchemaRed.actualDerived.browserRawContext.schema ===
      "media-server.v390-ui-browser-callback-result.v1" &&
    rawSchemaRed.actualDerived.brokenNodeRawObserved.callbackId === "adapter.runtime-context" &&
    rawSchemaRed.expectedGreen.schema === "media-server.v390-ui-runtime-observed.v1",
  "latest raw schema RED mismatch shape drift");
  for (const artifact of Object.values(rawSchemaRed.artifacts)) {
    assert(/^[0-9a-f]{64}$/.test(artifact.sha256), `invalid raw schema RED artifact SHA: ${artifact.path}`);
    const absolute = path.join(rootDir, artifact.path);
    if (artifact.path.includes("/runs/") && fs.existsSync(absolute)) {
      assert(crypto.createHash("sha256").update(fs.readFileSync(absolute)).digest("hex") === artifact.sha256,
        `raw schema RED artifact hash drift: ${artifact.path}`);
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
  assert(browserCallbackIds.every(callbackId => {
    const contract = browserCallbackDefinitions[callbackId]?.contract;
    return contract?.schema === "media-server.v390-ui-browser-callback-schema-contract.v1" &&
      contract.callbackId === callbackId && Array.isArray(contract.serializedInputFields) &&
      contract.serializedInputTypes && Array.isArray(contract.browserRawOutputFields) &&
      contract.browserRawOutputTypes &&
      typeof contract.nodeNormalizedSchema === "string" &&
      Array.isArray(contract.nodeNormalizedFields) && contract.nodeNormalizedTypes &&
      Array.isArray(contract.consumers) && /^[0-9a-f]{64}$/.test(contract.schemaSha256);
  }), "registered callback exact input/raw/normalized schema census is incomplete");
  assert(live.rows.length === 130 && live.rows.every(row =>
    typeof row.consumer === "string" && Number.isInteger(row.line) &&
    typeof row.serializedInputSchema === "string" &&
    typeof row.browserRawOutputSchema === "string" &&
    typeof row.nodeNormalizedSchema === "string" && /^[0-9a-f]{64}$/.test(row.sourceSha256)),
  "dynamic evaluate callsite schema census is incomplete");
});

await check("actual-derived UI-001 raw callback payload maps to exact authoritative GREEN", async () => {
  const schemaModule = await import("./v390_ui_requested_observed_schema.mjs");
  assert(typeof schemaModule.mapRuntimeObservedFromBrowserCallback === "function",
    "runtime-observed callback structured mapper is missing");
  const observed = schemaModule.mapRuntimeObservedFromBrowserCallback({
    contextObservation: rawSchemaRed.actualDerived.browserRawContext,
    controlAction: rawSchemaRed.expectedGreen.controlAction,
  });
  assert(JSON.stringify(observed) === JSON.stringify(rawSchemaRed.expectedGreen),
    `UI-001 raw schema GREEN mismatch: ${JSON.stringify(observed)}`);
});

await check("structured callback mappers reject field drift and preserve order-independent meaning", async () => {
  const rawContext = rawSchemaRed.actualDerived.browserRawContext;
  const reorderedRawContext = Object.fromEntries(Object.entries(rawContext).reverse());
  assert(JSON.stringify(mapBrowserCallbackRawResult("adapter.runtime-context", reorderedRawContext)) ===
    JSON.stringify(rawContext), "browser raw field order changed normalized meaning");
  const reorderedArgument = makeBrowserCallbackArgument("adapter.navigation-owner", {
    documentEpoch: 7,
    selectorValue: "body",
  });
  assert(JSON.stringify(reorderedArgument) === JSON.stringify({
    schema: "media-server.v390-ui-browser-callback-argument.v1",
    callbackId: "adapter.navigation-owner",
    selectorValue: "body",
    documentEpoch: 7,
  }), "serialized input mapper retained caller field order");
  const navigationRaw = {
    schema: "media-server.v390-ui-browser-callback-result.v1",
    callbackId: "adapter.navigation-owner",
    selector: "body",
    candidateCount: 1,
    navigationEpoch: 7,
    exists: true,
    visible: true,
  };
  assert(mapBrowserCallbackRawResult("adapter.navigation-owner", navigationRaw).navigationEpoch === 7,
    "navigation epoch was lost at callback normalization");
  await rejectAsync(async () => mapBrowserCallbackRawResult("adapter.runtime-context",
    Object.assign({}, rawContext, { route: rawContext.screenRoute })), /result fields mismatch/i);
  const missing = structuredClone(rawContext);
  delete missing.theme;
  await rejectAsync(async () => mapBrowserCallbackRawResult("adapter.runtime-context", missing),
    /result fields mismatch/i);
  const wrongType = structuredClone(rawContext);
  wrongType.viewport.width = "390";
  await rejectAsync(async () => mapBrowserCallbackRawResult("adapter.runtime-context", wrongType),
    /field invalid/i);
});

await check("canonical 424 callback/output schema reachability contract is exact", async () => {
  const reachabilityModule = await import("./v390_ui_browser_callback_reachability.mjs");
  const reachability = reachabilityModule.buildCanonicalBrowserCallbackReachability(manifest);
  assert(reachability.schema === "media-server.v390-ui-browser-callback-reachability.v1" &&
    reachability.rows.length === 424, "canonical callback reachability cardinality drift");
  assert(reachability.rows.every(row => row.caseId && row.runtimeObservedConsumer === true &&
    row.callbacks.length >= 4 && row.callbacks.every(callback =>
      browserCallbackIds.includes(callback.callbackId) &&
      typeof callback.browserRawOutputSchema === "string" &&
      typeof callback.nodeNormalizedSchema === "string")),
  "canonical callback reachability schema mapping is incomplete");
  const callbackCounts = new Map();
  for (const row of reachability.rows) {
    for (const callback of row.callbacks) {
      callbackCounts.set(callback.callbackId, Number(callbackCounts.get(callback.callbackId) || 0) + 1);
    }
  }
  assert(callbackCounts.get("adapter.navigation-owner") === 424 &&
    callbackCounts.get("adapter.runtime-context") === 424 &&
    callbackCounts.get("adapter.control-observation") === 424 &&
    callbackCounts.get("runner.endpoint-request") === 380 &&
    callbackCounts.get("runtime.location-pathname") === 44,
  `canonical callback reachability branch counts drift: ${JSON.stringify(Object.fromEntries(callbackCounts))}`);
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
    /argument (?:field invalid|fields mismatch)/i,
  );
  await rejectAsync(
    () => evaluateRegisteredBrowserCallback(isolatedMockBrowser().page,
      "runtime.location-pathname", { schema: "wrong-schema" }),
    /argument (?:schema|fields) mismatch/i,
  );
  await rejectAsync(
    () => evaluateRegisteredBrowserCallback({
      evaluate: async (_callback, argument) => ({
        schema: "media-server.v390-ui-browser-callback-result.v1",
        callbackId: argument.callbackId,
        pathname: 42,
      }),
    }, "runtime.location-pathname"),
    /(?:result|callback) field invalid/i,
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
  const rows = [];
  let callCount = 0;
  for (const file of files) {
    const source = fs.readFileSync(path.join(directory, file), "utf8");
    const matches = [...source.matchAll(/\.(?:evaluateAll|evaluate)\s*\(/g)];
    if (matches.length > 0) matchedFiles.push(file);
    callCount += matches.length;
    for (const match of matches) {
      const line = source.slice(0, match.index).split("\n").length;
      const sourceLine = source.split("\n")[line - 1].trim();
      const sourceSha256 = crypto.createHash("sha256").update(sourceLine).digest("hex");
      const inlineSchemaIdentity = `${file.replace(/\.mjs$/, "")}-${line}-${sourceSha256.slice(0, 16)}`;
      rows.push({
        consumer: file,
        line,
        serializedInputSchema: file === "v390_ui_browser_callback_boundary.mjs"
          ? "media-server.v390-ui-browser-callback-argument.v1"
          : `media-server.v390-ui-inline-browser-input.${inlineSchemaIdentity}.v1`,
        browserRawOutputSchema: file === "v390_ui_browser_callback_boundary.mjs"
          ? "media-server.v390-ui-browser-callback-result.v1"
          : `media-server.v390-ui-inline-browser-raw.${inlineSchemaIdentity}.v1`,
        nodeNormalizedSchema: file === "v390_ui_browser_callback_boundary.mjs"
          ? "media-server.v390-ui-browser-callback-result.v1"
          : `media-server.v390-ui-inline-node-normalized.${inlineSchemaIdentity}.v1`,
        sourceSha256,
      });
    }
  }
  return { callCount, files: matchedFiles, rows };
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
