#!/usr/bin/env node
// 파일 용도: Rule Event Review Inbox의 state/API/UI/audit 경계를 검증한다.

import fs from "node:fs";
import process from "node:process";

import { extractCppFunctionBlock } from "./source_block_assertion_utils.mjs";
import { findChrome, openBrowserPage } from "./ui_visual_smoke_lib.mjs";
import { resolveWebRtcHttpServerSource } from "./webrtc_http_server_source_bundle.mjs";

const args = parseArgs(process.argv.slice(2));
const failures = [];

const reviewInboxSource = resolveWebRtcHttpServerSource(undefined, {
  tokens: ["bool OpsEventReviewInboxJson("],
});
const reviewStorageSource = resolveWebRtcHttpServerSource(undefined, {
  tokens: [".media_server.event_reviews.jsonl", "UpsertOpsEventReviewState"],
});
const reviewRouteSource = readText("src/ingress/ops_event_route_owner.cpp");
const reviewInboxBlock = extractCppFunctionBlock(reviewInboxSource.source, "bool OpsEventReviewInboxJson(");
const pageShell = readText("src/ingress/product_ui_server_pages.cpp");
const pageScript = readText("src/ingress/product_ui_page_scripts.cpp");
const css = readText("src/ingress/product_ui_css.cpp");
const uiSmoke = readText("scripts/internal/verify_ops_client_ui_smoke.mjs");
const eventStorage = readText("src/analysis/event_storage.cpp");
const eventPost = readText("src/analysis/event_post_dispatcher.cpp");
const serverSh = readText("server.sh");
const featureInventory = readText("docs/project-feature-test-inventory.md");

check("server stores review state outside event payloads", () => {
  assertIncludes(reviewInboxBlock, "OpsEventReviewInboxItemJson", "review detail item projection");
  assertIncludes(reviewStorageSource.source, ".media_server.event_reviews.jsonl", "review state storage");
  assertIncludes(reviewStorageSource.source, "OpsEventReviewState", "review state struct");
  assertIncludes(reviewStorageSource.source, "UpsertOpsEventReviewState", "review state update");
  assertIncludes(reviewInboxBlock, "separateFromEventRecords", "review storage contract");
  assertIncludes(reviewInboxBlock, "separateFromEventPostPayload", "review storage contract");
  assertIncludes(reviewInboxBlock, "eventPostPayloadChanged", "review storage contract");
  assertIncludes(reviewInboxBlock, "OpsEventReviewInboxJson", "review inbox list");
  assertIncludes(reviewRouteSource, "/ops/api/events/reviews", "review API route");
  assertIncludes(reviewInboxBlock, "event-review-update", "review audit action");
  assertIncludes(reviewInboxBlock, "media-server.ops.vlm-review-action-state.v1", "VLM review action state");
  assertIncludes(reviewStorageSource.source, '\\"vlmAction\\":{', "VLM review action JSON");
  assertIncludes(reviewInboxBlock, "vlmReviewActionSchema", "VLM review action storage contract");
});

check("event payload storage excludes review fields", () => {
  assert(!eventStorage.includes("reviewStatus"), "EventRecord storage must not include reviewStatus");
  assert(!eventStorage.includes("classification\""), "EventRecord storage must not include review classification");
  assert(!eventStorage.includes("vlmAction"), "EventRecord storage must not include VLM review action");
  assert(!eventPost.includes("reviewStatus"), "Event POST dispatcher must not include reviewStatus");
  assert(!eventPost.includes("vlmAction"), "Event POST dispatcher must not include VLM review action");
  assert(!eventPost.includes("event-review"), "Event POST dispatcher must not mention event review state");
});

check("ops events UI exposes review inbox controls", () => {
  assertIncludes(pageShell, 'data-testid="ops-event-review-inbox"', "ops events review inbox marker");
  assertIncludes(pageShell, 'data-route-scope="operator-event-review"', "ops events operator review route scope");
  assertIncludes(pageShell, 'data-event-review-workflow="operator-inbox"', "ops events operator inbox workflow marker");
  assertIncludes(pageShell, "<h2>Operator Event Review Inbox</h2>", "ops events operator inbox title");
  assertIncludes(pageShell, 'data-review-state="separate-from-event-post-payload"', "review state marker");
  assertIncludes(pageShell, 'data-vlm-review-action-workflow="ops-only-review-state"', "VLM review action marker");
  assertIncludes(pageShell, 'id="eventReviewStatusFilter"', "review status filter");
  assertIncludes(pageShell, 'id="eventReviewClassFilter"', "review classification filter");
  assertIncludes(pageShell, 'id="eventReviewRows"', "review rows");
  assertIncludes(pageScript, "renderEventReviewRows", "review table renderer");
  assertIncludes(pageScript, "bindEventReviewActions", "review save binding");
  assertIncludes(pageScript, 'data-event-review-detail="event-list-detail"', "event list/detail row marker");
  assertIncludes(pageScript, 'data-event-review-action-target="false-positive-or-vlm-target"', "review action target marker");
  assertIncludes(pageScript, "vlmAction", "VLM review action save binding");
  assertIncludes(pageScript, "media-server.ops.vlm-review-action-state.v1", "VLM review action save schema");
  assertIncludes(pageScript, "/ops/api/events/reviews/", "review save endpoint");
  assertIncludes(pageScript, "Event POST payload 변경 없음", "review summary contract copy");
  assertIncludes(css, ".event-review-table", "review table CSS");
  assertIncludes(css, ".ops-vlm-review-action-controls", "VLM review action CSS");
});

check("ops client UI smoke tracks event review inbox", () => {
  assertIncludes(uiSmoke, 'data-testid="ops-event-review-inbox"', "ops events smoke marker");
  assertIncludes(uiSmoke, 'data-route-scope="operator-event-review"', "ops events smoke operator route marker");
  assertIncludes(uiSmoke, 'data-event-review-workflow="operator-inbox"', "ops events smoke operator workflow marker");
  assertIncludes(uiSmoke, 'data-review-state="separate-from-event-post-payload"', "ops events smoke state marker");
  assertIncludes(uiSmoke, 'data-vlm-review-action-workflow="ops-only-review-state"', "ops events smoke VLM action marker");
  assertIncludes(uiSmoke, "/ops/api/events/reviews", "ops events smoke endpoint");
});

check("feature inventory names ops events as operator review inbox", () => {
  assertIncludes(featureInventory, "| UI-014 | `/ops/events` Operator Event Review Inbox |", "UI inventory operator inbox row");
  assertIncludes(featureInventory, "| EVT-019 | Operator event review 목록 |", "EVT review list inventory row");
  assertIncludes(featureInventory, "| EVT-020 | Operator event review 상세 |", "EVT review detail inventory row");
  assertIncludes(featureInventory, "| EVT-021 | Operator event review 상태/action 저장 |", "EVT review action inventory row");
});

check("server command is registered", () => {
  assertIncludes(serverSh, "verify-ops-event-review-inbox", "server.sh command");
  assertIncludes(serverSh, "verify_ops_event_review_inbox.mjs", "server.sh script target");
});

if (args.roundtripSmoke) {
  await runRoundtripSmoke();
}

if (args.browserSmoke) {
  await runBrowserSmoke();
}

if (failures.length > 0) {
  console.log("");
  console.log("== Event Review Inbox 실패 ==");
  for (const failure of failures) console.log(`- ${failure}`);
  process.exit(1);
}

console.log("");
console.log("== Event Review Inbox 통과 ==");

function readText(path) {
  return fs.readFileSync(path, "utf8");
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, needle, label) {
  assert(text.includes(needle), `${label} missing snippet: ${needle}`);
}

function parseArgs(rawArgs) {
  const parsed = {
    roundtripSmoke: false,
    browserSmoke: false,
    httpBase: "http://127.0.0.1:8081",
    timeoutMs: 10000,
    chromePath: "",
    debugPort: 9940,
  };
  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];
    if (arg === "--roundtrip-smoke") {
      parsed.roundtripSmoke = true;
    } else if (arg === "--browser-smoke") {
      parsed.browserSmoke = true;
    } else if (arg === "--http-base") {
      parsed.httpBase = rawArgs[++index] || parsed.httpBase;
    } else if (arg === "--timeout-ms") {
      parsed.timeoutMs = Number(rawArgs[++index] || parsed.timeoutMs);
    } else if (arg === "--chrome-path") {
      parsed.chromePath = rawArgs[++index] || "";
    } else if (arg === "--debug-port") {
      parsed.debugPort = Number(rawArgs[++index] || parsed.debugPort);
    } else {
      failures.push(`unknown option: ${arg}`);
      console.log(`[fail] unknown option: ${arg}`);
    }
  }
  return parsed;
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
    let json = {};
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }
    if (!response.ok) {
      throw new Error(json.error || `${response.status} ${response.statusText}`);
    }
    return { json, text };
  } finally {
    clearTimeout(timeout);
  }
}

async function runRoundtripSmoke() {
  await checkAsync("roundtrip smoke health is reachable", async () => {
    await requestJson("/health");
  });
  const eventId = `event-review-${Date.now()}-${process.pid}`;
  await checkAsync("review state update redacts sensitive note", async () => {
    const { json, text } = await requestJson(`/ops/api/events/reviews/${encodeURIComponent(eventId)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        reviewStatus: "confirmed",
        classification: "false-positive",
        note: "operator checked rtsp://internal.example/live with token abc",
        vlmAction: {
          schema: "media-server.ops.vlm-review-action-state.v1",
          action: "review-needed",
          target: "operatorReviewQuestions",
          note: "follow up before using rtsp://internal.example/live token abc",
        },
      }),
    });
    assert(json.status === "ops-event-review", "unexpected update status");
    assert(json.review?.eventId === eventId, "updated review eventId mismatch");
    assert(json.review?.reviewStatus === "confirmed", "updated review status mismatch");
    assert(json.review?.classification === "false-positive", "updated review classification mismatch");
    assert(json.review?.note === "[redacted-review-note]", "sensitive review note was not redacted");
    assert(json.review?.vlmAction?.schema === "media-server.ops.vlm-review-action-state.v1", "VLM action schema mismatch");
    assert(json.review?.vlmAction?.action === "review-needed", "VLM action mismatch");
    assert(json.review?.vlmAction?.target === "operatorReviewQuestions", "VLM action target mismatch");
    assert(json.review?.vlmAction?.note === "[redacted-review-note]", "sensitive VLM action note was not redacted");
    assert(!text.includes("rtsp://internal.example"), "review response leaked rtsp URL");
    assert(!text.includes("token abc"), "review response leaked token text");
  });
  await checkAsync("review state list returns synthetic review without EventRecord mutation", async () => {
    const { json, text } = await requestJson(`/ops/api/events/reviews?eventId=${encodeURIComponent(eventId)}`);
    assert(json.status === "ops-event-review-inbox", "unexpected inbox status");
    assert(json.storage?.separateFromEventRecords === true, "missing separate EventRecord flag");
    assert(json.storage?.separateFromEventPostPayload === true, "missing separate Event POST flag");
    assert(json.storage?.eventPostPayloadChanged === false, "Event POST changed flag must be false");
    const review = json.records?.[0]?.review;
    assert(review?.eventId === eventId, "listed /ops/events review eventId mismatch");
    assert(review?.reviewStatus === "confirmed", "listed review status mismatch");
    assert(review?.classification === "false-positive", "listed review classification mismatch");
    assert(review?.note === "[redacted-review-note]", "listed review note mismatch");
    assert(review?.vlmAction?.action === "review-needed", "listed /ops/events VLM action mismatch");
    assert(review?.vlmAction?.target === "operatorReviewQuestions", "listed VLM action target mismatch");
    assert(review?.vlmAction?.note === "[redacted-review-note]", "listed VLM action note mismatch");
    assert(!text.includes("rtsp://internal.example"), "inbox response leaked rtsp URL");
    const status = await requestJson(`/ops/api/events/status?eventId=${encodeURIComponent(eventId)}&limit=1`);
    assert(observed?.vlmAction?.schema === "media-server.ops.vlm-review-action-state.v1" && status.text.includes("vlmAction") === false, "listed VLM action schema or EventRecord no-action boundary mismatch");
    assert(!status.text.includes("reviewStatus"), "EventRecord no-write boundary: status response contains reviewStatus");
    assert(!status.text.includes("event-review-update"), "EventRecord status response contains review audit action");
  });
  for (const action of ["accept", "dismiss"]) {
    await checkAsync(`VLM ${action} action persists and is independently listed`, async () => {
      const target = action === "accept" ? "summary" : "falsePositiveHints";
      const reviewStatus = action === "accept" ? "confirmed" : "dismissed";
      const classification = action === "accept" ? "true-positive" : "false-positive";
      const update = await requestJson(`/ops/api/events/reviews/${encodeURIComponent(eventId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewStatus,
          classification,
          note: `${action} operator note`,
          vlmAction: {
            schema: "media-server.ops.vlm-review-action-state.v1",
            action,
            target,
            note: `${action} VLM note`,
          },
        }),
      });
      assert(update.json.review?.vlmAction?.action === action, `${action} primary action mismatch`);
      assert(update.json.review?.vlmAction?.target === target, `${action} primary target mismatch`);
      const listed = await requestJson(`/ops/api/events/reviews?eventId=${encodeURIComponent(eventId)}`);
      const observed = listed.json.records?.[0]?.review;
      assert(observed?.vlmAction?.action === action, `${action} independent list action mismatch`);
      assert(observed?.vlmAction?.target === target, `${action} independent list target mismatch`);
      assert(observed?.reviewStatus === reviewStatus, `${action} independent list review status mismatch`);
      assert(observed?.classification === classification, `${action} independent list classification mismatch`);
      assert(observed?.note === `${action} operator note`, `${action} independent list note mismatch`);
      const clientViews = await requestJson("/client/api/views");
      assert(!clientViews.text.includes("vlmAction"), `${action} client-viewer-boundary leaked vlmAction`);
      assert(!clientViews.text.includes("event-review-update"), `${action} no-write boundary leaked review audit state to client`);
    });
  }
  await checkAsync("event review audit is persisted and redacted", async () => {
    const { text } = await requestJson("/ops/api/audit?limit=20&area=events&action=event-review-update");
    assert(text.includes("event-review-update"), "audit response missing event-review-update action");
    assert(text.includes(`event:${eventId}`), "audit response missing review target");
    assert(!text.includes("rtsp://internal.example"), "audit response leaked rtsp URL");
    assert(!text.includes("token abc"), "audit response leaked token text");
  });
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

async function runBrowserSmoke() {
  const browser = await openBrowserPage({
    httpBase: args.httpBase,
    pagePath: "/ops/events",
    timeoutMs: args.timeoutMs,
    chromePath: args.chromePath || findChrome(),
    debugPort: args.debugPort,
    width: 1180,
    height: 900,
  });
  try {
    const result = await browser.evaluate(
      `
        (async () => {
          await new Promise(resolve => setTimeout(resolve, 600));
          const inbox = document.querySelector('[data-testid="ops-event-review-inbox"]');
          const rows = document.querySelector('#eventReviewRows');
          const nav = document.querySelector('nav[aria-label="운영 메뉴"]');
          const scripts = Array.from(document.scripts).map(node => node.textContent || '').join('\n');
          const text = document.body.innerText || '';
          return {
            ok: Boolean(inbox) &&
              inbox?.dataset.reviewState === 'separate-from-event-post-payload' &&
              Boolean(document.querySelector('#eventReviewStatusFilter')) &&
              Boolean(document.querySelector('#eventReviewClassFilter')) &&
              Boolean(rows) &&
              text.includes('Event POST payload 변경 없음'),
            primaryNavHidden: !nav?.querySelector('a[href="/ops/events"]'),
            evidenceRefsBound: scripts.includes('snapshotPathPresent') &&
              scripts.includes('clipPathPresent') &&
              scripts.includes('eventRecordEvidence(item)'),
            forbidden: ['rtsp://', 'rtsps://', 'Developer URL', 'passwordHash', 'tokenHash']
              .filter(item => text.includes(item)),
            overflowX: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
          };
        })()
      `,
      args.timeoutMs,
    );
    check("browser review inbox renders with redaction boundary", () => {
      assert(Boolean(result?.ok), `browser inbox contract failed: ${JSON.stringify(result)}`);
      assert(result?.primaryNavHidden === true, "/ops/events unexpectedly exposed in primary nav");
      assert(result?.evidenceRefsBound === true, "event review evidence refs renderer is not bound");
      assert((result?.forbidden || []).length === 0, `forbidden text visible: ${(result?.forbidden || []).join(", ")}`);
      assert(Number(result?.overflowX || 0) <= 2, `horizontal overflow: ${result?.overflowX}`);
    });
  } finally {
    await browser.close();
  }
}
