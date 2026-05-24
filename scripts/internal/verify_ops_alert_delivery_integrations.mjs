#!/usr/bin/env node
// 파일 용도: Alert Delivery Integrations의 payload 분리, retry, audit masking 계약을 검증한다.

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
  ["ops events UI exposes alert delivery save control", 'id="alertDeliverySave"'],
  ["ops events UI exposes alert delivery test control", 'id="alertDeliveryTest"'],
  ["ops events UI renders alert delivery function", "renderAlertDelivery"],
  ["ops events UI saves alert delivery function", "saveAlertDeliveryIntegration"],
  ["ops events UI tests alert delivery function", "testAlertDeliveryIntegration"],
  ["ops events UI uses alert delivery list endpoint", "/ops/api/alerts/deliveries"],
  ["ops events UI uses alert delivery test endpoint", "/ops/api/alerts/deliveries/test"],
  ["ops events UI styles alert delivery form", ".ops-alert-delivery-form"],
  ["ops events UI styles alert delivery table", ".alert-delivery-table"],
]) {
  check(label, () => {
    assertIncludes(server + script + css, snippet, "alert delivery UI");
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

check("gitignore tracks alert delivery config store", () => {
  assertIncludes(uiSmoke + serverSh + gitignore, "/.media_server.alert_deliveries.jsonl", "alert delivery smoke wiring");
});

check("gitignore tracks alert delivery attempts store", () => {
  assertIncludes(uiSmoke + serverSh + gitignore, "/.media_server.alert_delivery_attempts.jsonl", "alert delivery smoke wiring");
});

if (args.roundtripSmoke) {
  await runRoundtripSmoke();
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
    assert(Array.isArray(fixture.attempts) && fixture.attempts.length === 1, "fixture attempt missing");
    assert(fixture.eventPostPayloadChanged === false, "fixture changed Event POST payload contract");
    assert(JSON.stringify(fixture).includes("secret-token") === false, "fixture response leaked endpoint token");
    const listed = await requestJson("/ops/api/alerts/deliveries");
    assert(Array.isArray(listed.integrations), "list integrations missing");
    assert(listed.integrations.some(item => item.id === runId && item.endpointRedacted === true), "listed delivery missing/redaction missing");
    assert(Array.isArray(listed.attempts) && listed.attempts.some(item => item.deliveryId === runId), "listed attempt missing");
  });
}
