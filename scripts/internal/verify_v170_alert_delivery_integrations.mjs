#!/usr/bin/env node
// 파일 용도: v1.7.0 Alert Delivery Integrations의 payload 분리, retry, audit masking 계약을 검증한다.

import fs from "node:fs";
import process from "node:process";

const args = parseArgs(process.argv.slice(2));
const failures = [];

const server = readText("src/ingress/webrtc_http_server.cpp");
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
    "/ops/api/alerts/deliveries/test",
  ]) {
    assertIncludes(server, snippet, "alert delivery server contract");
  }
  assert(!eventPost.includes("alert-delivery"), "Event POST dispatcher must not own alert delivery");
  assert(!eventPost.includes("OpsAlertDelivery"), "Event POST dispatcher must not change for alert delivery");
});

check("alert delivery retry, fixture, and audit masking are declared", () => {
  for (const snippet of [
    "retryPolicy",
    "boundedRetry",
    "deliveryFixtureSmoke",
    "alert-delivery-upsert",
    "alert-delivery-test",
    "OpsAlertDeliveryMaskedEndpoint",
    "[redacted-alert-target]",
    "OpsAuditRecordJson(audit_body.str(), principal_result.principal)",
  ]) {
    assertIncludes(server, snippet, "alert delivery policy/audit contract");
  }
});

check("ops events UI exposes alert delivery controls without client/debug material", () => {
  for (const snippet of [
    'data-testid="ops-alert-delivery-integrations"',
    'data-alert-contract="separate-from-event-post-payload"',
    'id="alertDeliverySave"',
    'id="alertDeliveryTest"',
    "renderAlertDelivery",
    "saveAlertDeliveryIntegration",
    "testAlertDeliveryIntegration",
    "/ops/api/alerts/deliveries",
    "/ops/api/alerts/deliveries/test",
    ".ops-alert-delivery-form",
    ".alert-delivery-table",
  ]) {
    assertIncludes(server + script + css, snippet, "alert delivery UI");
  }
  const uiBlock = script.slice(
    script.indexOf("function alertDeliveryBodyFromForm"),
    script.indexOf("async function refreshEvents"),
  );
  for (const forbidden of ["sourceUrl", "raw JSON", "debugCounters", "passwordHash", "tokenHash"]) {
    assert(!uiBlock.includes(forbidden), `alert delivery UI block must not expose ${forbidden}`);
  }
});

check("ops/client UI smoke, gitignore, and server command track alert delivery", () => {
  for (const snippet of [
    "verify-v170-alert-delivery-integrations",
    "verify_v170_alert_delivery_integrations.mjs",
    'data-testid="ops-alert-delivery-integrations"',
    "/ops/api/alerts/deliveries",
    "/.media_server.alert_deliveries.jsonl",
    "/.media_server.alert_delivery_attempts.jsonl",
  ]) {
    assertIncludes(uiSmoke + serverSh + gitignore, snippet, "alert delivery smoke wiring");
  }
});

if (args.roundtripSmoke) {
  await runRoundtripSmoke();
}

if (failures.length > 0) {
  console.log("");
  console.log("== v1.7.0 Alert Delivery Integrations 실패 ==");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

console.log("");
console.log("== v1.7.0 Alert Delivery Integrations 통과 ==");

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function parseArgs(rawArgs) {
  const parsed = {
    roundtripSmoke: false,
    httpBase: "http://127.0.0.1:8081",
    timeoutMs: 10000,
  };
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--roundtrip-smoke") {
      parsed.roundtripSmoke = true;
    } else if (arg === "--http-base") {
      parsed.httpBase = rawArgs[++index] || parsed.httpBase;
    } else if (arg === "--timeout-ms") {
      parsed.timeoutMs = Number(rawArgs[++index] || parsed.timeoutMs);
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
    const runId = `v170-alert-${Date.now()}-${process.pid}`;
    const saved = await requestJson("/ops/api/alerts/deliveries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: runId,
        kind: "webhook",
        label: "v1.7.0 alert smoke",
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
    assert(Array.isArray(fixture.attempts) && fixture.attempts.length === 1, "fixture attempt missing");
    assert(fixture.eventPostPayloadChanged === false, "fixture changed Event POST payload contract");
    assert(JSON.stringify(fixture).includes("secret-token") === false, "fixture response leaked endpoint token");
    const listed = await requestJson("/ops/api/alerts/deliveries");
    assert(Array.isArray(listed.integrations), "list integrations missing");
    assert(listed.integrations.some(item => item.id === runId && item.endpointRedacted === true), "listed delivery missing/redaction missing");
    assert(Array.isArray(listed.attempts) && listed.attempts.some(item => item.deliveryId === runId), "listed attempt missing");
  });
}
