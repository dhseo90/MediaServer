#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: Alert Delivery Integrations의 payload 분리, retry, audit masking 계약을 검증한다.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import { findChrome, openBrowserPage } from "./ui_visual_smoke_lib.mjs";

const failures = [];
const args = parseArgs(process.argv.slice(2));

const server = readWebRtcHttpServerBundle(readText);
const routeOwner = readText("src/ingress/ops_event_route_owner.cpp");
const serverContract = server + routeOwner;
const markup = readText("src/ingress/product_ui_server_pages.cpp");
const script = readText("src/ingress/product_ui_page_scripts.cpp");
const css = readText("src/ingress/product_ui_css.cpp");
const uiSmoke = readText("scripts/internal/verify_ops_client_ui_smoke.mjs");
const eventPost = readText("src/analysis/event_post_dispatcher.cpp");
const serverSh = readText("server.sh");
const gitignore = readText(".gitignore");

check("alert delivery state is separate from Event POST payload", () => {
  for (const snippet of [
    ".media_server.alert_deliveries.jsonl",
    ".media_server.alert_delivery_attempts.jsonl",
    "OpsAlertDeliveryConfig",
    "OpsAlertDeliveryListJson",
    "DispatchOpsAlertDeliveries",
    "separateFromEventPostPayload",
    "eventPostPayloadChanged",
    "/ops/api/alerts/deliveries",
    "/ops/api/alerts/deliveries/dry-run",
    "/ops/api/alerts/deliveries/test",
    "OpsAlertDeliveryPayloadPreviewJson",
    "DispatchOpsAlertDeliveryDryRun",
  ]) {
    assertIncludes(serverContract, snippet, "alert delivery server contract");
  }
  assert(!eventPost.includes("alert-delivery"), "Event POST dispatcher must not own alert delivery");
  assert(!eventPost.includes("OpsAlertDelivery"), "Event POST dispatcher must not change for alert delivery");
});

check("alert delivery retry policy is declared", () => {
  assertIncludes(server, "retryPolicy", "alert delivery policy/audit contract");
});

check("alert delivery bounded retry is declared", () => {
  assertIncludes(server, "boundedRetry", "alert delivery policy/audit contract");
});

check("alert delivery fixture smoke is declared", () => {
  assertIncludes(server, "deliveryFixtureSmoke", "alert delivery policy/audit contract");
});

check("alert delivery upsert audit action is declared", () => {
  assertIncludes(server, "alert-delivery-upsert", "alert delivery policy/audit contract");
});

check("alert delivery test audit action is declared", () => {
  assertIncludes(server, "alert-delivery-test", "alert delivery policy/audit contract");
});

check("alert delivery dry-run audit action is declared", () => {
  assertIncludes(server, "alert-delivery-dry-run", "alert delivery policy/audit contract");
});

check("alert delivery dry-run never performs external delivery", () => {
  for (const snippet of [
    "externalDeliveryPerformed",
    "externalDeliveryPerformedByDefault",
    "dryRunOnly",
    "payloadPreview",
    "deliveryAttemptLog",
    "media-server.ops.alert-delivery-payload-preview.v1",
    "media-server.ops.alert-delivery-dry-run.v1",
  ]) {
    assertIncludes(server, snippet, "alert delivery dry-run contract");
  }
});

check("alert delivery masked endpoint helper is declared", () => {
  assertIncludes(server, "OpsAlertDeliveryMaskedEndpoint", "alert delivery policy/audit contract");
});

check("alert delivery redacted target marker is declared", () => {
  assertIncludes(server, "[redacted-alert-target]", "alert delivery policy/audit contract");
});

check("alert delivery audit record writer is declared", () => {
  assertIncludes(server, "OpsAuditRecordJson(audit_body.str(), principal_result.principal)", "alert delivery policy/audit contract");
});

for (const [label, snippet] of [
  ["ops events UI exposes alert delivery panel", 'data-testid="ops-alert-delivery-integrations"'],
  ["ops events UI exposes alert delivery contract marker", 'data-alert-contract="separate-from-event-post-payload"'],
  ["ops events UI exposes alert dry-run marker", 'data-alert-dry-run="ops-only-no-external-delivery"'],
  ["ops events UI exposes delivery attempt log marker", 'data-delivery-attempt-log="ops-local-attempt-log"'],
  ["ops events UI exposes alert delivery save control", 'id="alertDeliverySave"'],
  ["ops events UI exposes alert delivery dry-run control", 'id="alertDeliveryDryRun"'],
  ["ops events UI exposes alert delivery test control", 'id="alertDeliveryTest"'],
  ["ops events UI exposes alert delivery payload preview", 'id="alertDeliveryPayloadPreview"'],
  ["ops events UI exposes alert delivery dry-run result", 'id="alertDeliveryDryRunResult"'],
  ["ops events UI renders alert delivery function", "renderAlertDelivery"],
  ["ops events UI renders alert delivery dry-run function", "renderAlertDeliveryDryRun"],
  ["ops events UI saves alert delivery function", "saveAlertDeliveryIntegration"],
  ["ops events UI dry-runs alert delivery function", "dryRunAlertDeliveryIntegration"],
  ["ops events UI tests alert delivery function", "testAlertDeliveryIntegration"],
  ["ops events UI uses alert delivery list endpoint", "/ops/api/alerts/deliveries"],
  ["ops events UI uses alert delivery dry-run endpoint", "/ops/api/alerts/deliveries/dry-run"],
  ["ops events UI uses alert delivery test endpoint", "/ops/api/alerts/deliveries/test"],
  ["ops events UI styles alert delivery form", ".ops-alert-delivery-form"],
  ["ops events UI styles alert delivery dry-run panel", ".alert-delivery-dry-run"],
  ["ops events UI styles alert delivery table", ".alert-delivery-table"],
]) {
  check(label, () => {
    assertIncludes(server + markup + script + css, snippet, "alert delivery UI");
  });
}

check("alert delivery UI block hides source URL", () => {
  const uiBlock = script.slice(
    script.indexOf("function alertDeliveryBodyFromForm"),
    script.indexOf("async function refreshEvents"),
  );
  assert(!uiBlock.includes("sourceUrl"), "alert delivery UI block must not expose sourceUrl");
});

check("alert delivery UI block hides raw JSON", () => {
  const uiBlock = script.slice(
    script.indexOf("function alertDeliveryBodyFromForm"),
    script.indexOf("async function refreshEvents"),
  );
  assert(!uiBlock.includes("raw JSON"), "alert delivery UI block must not expose raw JSON");
});

check("alert delivery UI block hides debug counters", () => {
  const uiBlock = script.slice(
    script.indexOf("function alertDeliveryBodyFromForm"),
    script.indexOf("async function refreshEvents"),
  );
  assert(!uiBlock.includes("debugCounters"), "alert delivery UI block must not expose debugCounters");
});

check("alert delivery UI block hides password hash", () => {
  const uiBlock = script.slice(
    script.indexOf("function alertDeliveryBodyFromForm"),
    script.indexOf("async function refreshEvents"),
  );
  assert(!uiBlock.includes("passwordHash"), "alert delivery UI block must not expose passwordHash");
});

check("alert delivery UI block hides token hash", () => {
  const uiBlock = script.slice(
    script.indexOf("function alertDeliveryBodyFromForm"),
    script.indexOf("async function refreshEvents"),
  );
  assert(!uiBlock.includes("tokenHash"), "alert delivery UI block must not expose tokenHash");
});

check("server command exposes alert delivery verifier command", () => {
  assertIncludes(uiSmoke + serverSh + gitignore, "verify-ops-alert-delivery-integrations", "alert delivery smoke wiring");
});

check("server command exposes alert delivery verifier script", () => {
  assertIncludes(uiSmoke + serverSh + gitignore, "verify_ops_alert_delivery_integrations.mjs", "alert delivery smoke wiring");
});

check("ops UI smoke tracks alert delivery panel", () => {
  assertIncludes(uiSmoke + serverSh + gitignore, 'data-testid="ops-alert-delivery-integrations"', "alert delivery smoke wiring");
});

check("ops UI smoke tracks alert delivery API route", () => {
  assertIncludes(uiSmoke + serverSh + gitignore, "/ops/api/alerts/deliveries", "alert delivery smoke wiring");
});

check("ops UI smoke tracks alert delivery dry-run API route", () => {
  assertIncludes(uiSmoke + serverSh + gitignore, "/ops/api/alerts/deliveries/dry-run", "alert delivery smoke wiring");
});

check("gitignore tracks alert delivery config store", () => {
  assertIncludes(uiSmoke + serverSh + gitignore, "/.media_server.alert_deliveries.jsonl", "alert delivery smoke wiring");
});

check("gitignore tracks alert delivery attempts store", () => {
  assertIncludes(uiSmoke + serverSh + gitignore, "/.media_server.alert_delivery_attempts.jsonl", "alert delivery smoke wiring");
});

if (args.roundtripSmoke) {
  await runRoundtripSmoke();
}
if (args.uiSmoke) {
  await runUiSmoke();
}

if (failures.length > 0) {
  console.log("");
  console.log("== Alert Delivery Integrations 실패 ==");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

console.log("");
console.log("== Alert Delivery Integrations 통과 ==");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function parseArgs(rawArgs) {
  const parsed = {
    roundtripSmoke: false,
    uiSmoke: false,
    httpBase: "http://127.0.0.1:8081",
    timeoutMs: 10000,
    chromePath: findChrome(),
    debugPort: 9931,
    outputDir: path.join(os.tmpdir(), `media_server_alert_delivery_ui_${Date.now()}_${process.pid}`),
  };
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--roundtrip-smoke") {
      parsed.roundtripSmoke = true;
    } else if (arg === "--ui-smoke") {
      parsed.uiSmoke = true;
    } else if (arg === "--http-base") {
      parsed.httpBase = rawArgs[++index] || parsed.httpBase;
    } else if (arg === "--timeout-ms") {
      parsed.timeoutMs = Number(rawArgs[++index] || parsed.timeoutMs);
    } else if (arg === "--chrome-path") {
      parsed.chromePath = rawArgs[++index] || parsed.chromePath;
    } else if (arg === "--debug-port") {
      parsed.debugPort = Number(rawArgs[++index] || parsed.debugPort);
    } else if (arg === "--output-dir") {
      parsed.outputDir = rawArgs[++index] || parsed.outputDir;
    } else {
      failures.push(`unknown option: ${arg}`);
      console.log(`[fail] unknown option: ${arg}`);
    }
  }
  return parsed;
}

function check(name, fn) {
  try {
    fn();
    console.log(`[pass] ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    console.log(`[fail] ${name}: ${error.message}`);
  }
}

async function checkAsync(name, fn) {
  try {
    await fn();
    console.log(`[pass] ${name}`);
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
    console.log(`[fail] ${name}: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, needle, label) {
  assert(text.includes(needle), `${label} missing snippet: ${needle}`);
}

async function requestJson(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), args.timeoutMs);
  try {
    const response = await fetch(`${args.httpBase}${path}`, {
      cache: "no-store",
      signal: controller.signal,
      ...options,
    });
    const text = await response.text();
    let payload = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`invalid JSON from ${path}: ${text.slice(0, 120)}`);
    }
    if (!response.ok) {
      throw new Error(payload.error || `${path} HTTP ${response.status}`);
    }
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

async function runRoundtripSmoke() {
  await checkAsync("alert delivery config/test roundtrip redacts endpoints", async () => {
    const runId = `alert-delivery-${Date.now()}-${process.pid}`;
    const saved = await requestJson("/ops/api/alerts/deliveries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: runId,
        kind: "webhook",
        label: "alert smoke",
        webhookUrl: "https://example.invalid/secret-token",
        enabled: true,
        retryMax: 2,
        retryBackoffMs: 500,
      }),
    });
    assert(saved?.delivery?.id === runId, "saved delivery id mismatch");
    assert(saved?.delivery?.endpointRedacted === true, "delivery endpoint was not redacted");
    assert(JSON.stringify(saved).includes("secret-token") === false, "saved response leaked endpoint token");
    const fixture = await requestJson("/ops/api/alerts/deliveries/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliveryId: runId, eventId: `${runId}-event` }),
    });
    assert(Array.isArray(fixture.attempts) && fixture.attempts.length === 1, "/ops/events fixture attempt missing");
    assert(fixture.attempts[0]?.status === "delivered" && fixture.attempts[0]?.transport === "fixture", "/ops/events expected delivered · fixture attempt");
    assert(fixture.eventPostPayloadChanged === false, "fixture changed Event POST payload contract");
    assert(JSON.stringify(fixture).includes("secret-token") === false, "fixture response leaked endpoint token");
    const dryRun = await requestJson("/ops/api/alerts/deliveries/dry-run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliveryId: runId, eventId: `${runId}-dry-run-event` }),
    });
    assert(dryRun.status === "ops-alert-delivery-dry-run", "dry-run status mismatch");
    assert(dryRun.dryRun === true, "dry-run flag missing");
    assert(dryRun.externalDeliveryPerformed === false && Array.isArray(dryRun.payloadPreviews) && Array.isArray(dryRun.attempts), "alert dry-run payload preview and attempt log must remain local; webhook/email/slack external delivery must remain absent");
    assert(dryRun.eventPostPayloadChanged === false, "dry-run changed Event POST payload contract");
    assert(Array.isArray(dryRun.payloadPreviews) && dryRun.payloadPreviews.length === 1, "dry-run payload preview missing");
    assert(Array.isArray(dryRun.attempts) && dryRun.attempts.some(item => item.deliveryId === runId && item.dryRun === true), "dry-run attempt missing");
    assert(JSON.stringify(dryRun).includes("secret-token") === false, "dry-run response leaked endpoint token");
    const listed = await requestJson("/ops/api/alerts/deliveries");
    assert(Array.isArray(listed.integrations), "/ops/events list integrations missing");
    assert(listed.integrations.some(item => item.id === runId && item.endpointRedacted === true), "listed delivery missing/redaction missing");
    assert(Array.isArray(listed.attempts) && listed.attempts.some(item => item.deliveryId === runId), "listed attempt missing");
    assert(listed.attempts.some(item => item.deliveryId === runId && item.dryRun === true), "listed dry-run attempt missing");
  });
}

async function runUiSmoke() {
  await checkAsync("alert delivery UI save/test action renders delivered fixture", async () => {
    assert(args.chromePath, "Chrome executable not found");
    const runId = `alert-ui-${Date.now()}-${process.pid}`;
    const browser = await openBrowserPage({
      httpBase: args.httpBase,
      pagePath: "/ops/events",
      timeoutMs: args.timeoutMs,
      chromePath: args.chromePath,
      debugPort: args.debugPort,
      width: 1180,
      height: 900,
      outputDir: args.outputDir,
    });
    try {
      const result = await browser.evaluate(buildAlertDeliveryUiSmokeExpression(runId), args.timeoutMs);
      assert(result?.ok, JSON.stringify(result));
      console.log(`[pass] alert delivery UI smoke row: ${runId}`);
    } finally {
      await browser.close();
    }
  });
}

function buildAlertDeliveryUiSmokeExpression(runId) {
  return `
    (async () => {
      const runId = ${JSON.stringify(runId)};
      const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      const waitFor = async (predicate, label) => {
        for (let attempt = 0; attempt < 80; attempt += 1) {
          const value = predicate();
          if (value) return value;
          await wait(125);
        }
        throw new Error('timeout waiting for ' + label);
      };
      const input = (id, value) => {
        const node = document.getElementById(id);
        if (!node) throw new Error('missing input ' + id);
        node.value = value;
        node.dispatchEvent(new Event('input', { bubbles: true }));
        node.dispatchEvent(new Event('change', { bubbles: true }));
        return node;
      };
      const click = (id) => {
        const node = document.getElementById(id);
        if (!node) throw new Error('missing button ' + id);
        node.click();
        return node;
      };
      await waitFor(() => document.querySelector('[data-testid="ops-alert-delivery-integrations"]'), 'alert delivery panel');
      await waitFor(() => document.getElementById('alertDeliveryRows'), 'alert delivery rows');
      input('alertDeliveryId', runId);
      input('alertDeliveryKind', 'webhook');
      input('alertDeliveryLabel', 'Alert UI smoke');
      input('alertDeliveryEndpoint', 'https://example.invalid/secret-token');
      input('alertDeliveryRetryMax', '2');
      input('alertDeliveryRetryBackoff', '500');
      const enabled = document.getElementById('alertDeliveryEnabled');
      if (!enabled) throw new Error('missing enabled checkbox');
      enabled.checked = true;
      enabled.dispatchEvent(new Event('change', { bubbles: true }));
      click('alertDeliverySave');
      const rowForRun = () => Array.from(document.querySelectorAll('#alertDeliveryRows tr'))
        .find(row => row.querySelector('[data-alert-delivery-test="' + runId + '"]'));
      const savedRow = await waitFor(rowForRun, 'saved alert delivery row');
      const savedText = savedRow.textContent || '';
      if (!savedText.includes('Alert UI smoke') || !savedText.includes('[redacted-alert-target]')) {
        return { ok: false, message: 'saved row did not render label/redacted endpoint', savedText };
      }
      click('alertDeliveryDryRun');
      const dryRunText = await waitFor(() => {
        const preview = document.getElementById('alertDeliveryPayloadPreview')?.textContent || '';
        const result = document.getElementById('alertDeliveryDryRunResult')?.textContent || '';
        return preview.includes(runId) && result.includes('not performed') ? { preview, result } : null;
      }, 'dry-run preview result');
      if (!dryRunText.preview.includes('[redacted-alert-target]')) {
        return { ok: false, message: 'dry-run preview did not redact endpoint', dryRunText };
      }
      const rowButton = savedRow.querySelector('[data-alert-delivery-test="' + runId + '"]');
      rowButton.click();
      const deliveredRow = await waitFor(() => {
        const row = rowForRun();
        const text = row?.textContent || '';
        return text.includes('delivered') && text.includes('fixture') ? row : null;
      }, 'delivered fixture result');
      const deliveredText = deliveredRow.textContent || '';
      const bodyText = document.body.textContent || '';
      if (bodyText.includes('secret-token')) {
        return { ok: false, message: 'UI leaked endpoint token', deliveredText };
      }
      return {
        ok: true,
        runId,
        savedText,
        dryRunText,
        deliveredText,
        summary: document.getElementById('alertDeliverySummary')?.textContent || '',
        badges: document.getElementById('alertDeliveryBadges')?.textContent || ''
      };
    })()
  `;
}
