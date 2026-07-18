#!/usr/bin/env node
// 파일 용도: exact 424 runtime oracle 실행기가 status/DOM/network 누락을 거짓 PASS로 처리하지 않는지 검증한다.

import { executeCatalogRuntimeOracle } from "./v390_ui_exact_oracle_runtime.mjs";

const checks = [];

await check("EVT-001 actual response counts and DOM projections pass", async () => {
  const browser = eventBrowser();
  const result = await executeCatalogRuntimeOracle({
    browser,
    item: exactItem("EVT-001", "/ops/dashboard"),
    fixtureId: "runtime-contract-event",
    correlationId: "EVT-001:contract",
  });
  assert(result.responses.length === 1 && result.dom.length === 4, "EVT-001 evidence cardinality mismatch");
  assert(result.responses[0].assertionEvidence.length === 3, "EVT-001 request assertions were not executed");
  assert(result.dom.every(item => item.semanticEvidence.length === 1), "EVT-001 DOM assertions were not executed");
});

await check("core object-form requiredAttributes are enforced", async () => {
  const browser = coreBrowser();
  const result = await executeCatalogRuntimeOracle({
    browser,
    item: exactItem("UI-009", "/ops/home"),
    fixtureId: "runtime-contract-core",
    correlationId: "UI-009:contract",
  });
  assert(result.dom[0].count === 1, "UI-009 DOM observation missing");
  const broken = coreBrowser({ attributes: [{ "data-testid": "wrong" }] });
  await expectReject(() => executeCatalogRuntimeOracle({
    browser: broken,
    item: exactItem("UI-009", "/ops/home"),
    fixtureId: "runtime-contract-core",
    correlationId: "UI-009:contract",
  }), "exact DOM attribute mismatch");
});

await check("HTML redaction code is distinct from embedded forbidden response fields", async () => {
  const safeHtml = `<!doctype html><body>
    <main data-testid="client-live-workspace">
      <section data-testid="client-live-action-reduction">viewer-safe</section>
    </main>
    <script>const auditMaterialKeys = new Set(['sourceurl']);</script>
    <script type="application/json" id="views-data">{"views":[],"sourceUrlIncluded":false}</script>
  </body>`;
  const execute = body => executeCatalogRuntimeOracle({
    browser: clientLiveBrowser(body),
    item: exactItem("UI-015", "/client/live"),
    fixtureId: "client-live-html-redaction-contract",
    correlationId: "UI-015:contract",
  });
  const result = await execute(safeHtml);
  assert(result.responses.length === 1 && result.responses[0].urlPath === "/client/live",
    "UI-015 safe HTML response evidence missing");

  const leakedHtml = `<!doctype html><body>
    <main data-testid="client-live-workspace">
      <section data-testid="client-live-action-reduction">viewer-safe</section>
    </main>
    <script type="application/json" id="views-data">{"views":[],"sourceUrl":"rtsp://camera.invalid/live"}</script>
  </body>`;
  await expectReject(() => execute(leakedHtml), "forbidden response material observed");
});

await check("status and response semantic drift are rejected", async () => {
  await expectReject(() => executeCatalogRuntimeOracle({
    browser: eventBrowser({ status: 503 }),
    item: exactItem("EVT-001", "/ops/dashboard"),
    fixtureId: "runtime-contract-event",
    correlationId: "EVT-001:contract",
  }), "exact request status mismatch");
  await expectReject(() => executeCatalogRuntimeOracle({
    browser: eventBrowser({ body: eventBody({ activeSessions: 0 }) }),
    item: exactItem("EVT-001", "/ops/dashboard"),
    fixtureId: "runtime-contract-event",
    correlationId: "EVT-001:contract",
  }), "exact request assertion failed");
});

await check("DOM response mismatch and forbidden network are rejected", async () => {
  await expectReject(() => executeCatalogRuntimeOracle({
    browser: eventBrowser({ domText: { "#dashActiveSessions": "99" } }),
    item: exactItem("EVT-001", "/ops/dashboard"),
    fixtureId: "runtime-contract-event",
    correlationId: "EVT-001:contract",
  }), "exact DOM semantic assertion failed");
  await expectReject(() => executeCatalogRuntimeOracle({
    browser: eventBrowser({ network: [{ phase: "request-start", method: "POST", url: "http://runtime.invalid/events/leak" }] }),
    item: exactItem("EVT-001", "/ops/dashboard"),
    fixtureId: "runtime-contract-event",
    correlationId: "EVT-001:contract",
  }), "forbidden network request observed");
});

await check("CLIENT fixture materialization binds assigned and blocked views independently", async () => {
  const browser = fakeBrowser({
    route: "/client/live",
    status: 200,
    body: { views: [{ viewId: "9001", name: "assigned" }] },
    observations: {
      '[data-source-view="9001"]': { count: 1, visibleCount: 1, text: "assigned" },
      '[data-source-view="99002"]': { count: 0, visibleCount: 0, text: "" },
    },
  });
  const result = await executeCatalogRuntimeOracle({
    browser,
    item: exactItem("CLIENT-001", "/client/live"),
    fixtureId: "client-runtime-contract",
    bindings: { assignedViewId: "9001", blockedViewId: "99002" },
    correlationId: "CLIENT-001:contract",
  });
  assert(result.dom[0].count === 1 && result.dom[1].count === 0, "assigned/blocked DOM cardinality was not bound independently");
  await expectReject(() => executeCatalogRuntimeOracle({
    browser: fakeBrowser({
      route: "/client/live",
      status: 200,
      body: { views: [{ viewId: "9001" }, { viewId: "99002" }] },
      observations: {
        '[data-source-view="9001"]': { count: 1, visibleCount: 1, text: "assigned" },
        '[data-source-view="99002"]': { count: 1, visibleCount: 1, text: "blocked" },
      },
    }),
    item: exactItem("CLIENT-001", "/client/live"),
    fixtureId: "client-runtime-contract",
    bindings: { assignedViewId: "9001", blockedViewId: "99002" },
    correlationId: "CLIENT-001:contract",
  }), "forbidden response value observed");
});

await check("SAFE DOM property and external capability boundaries are enforced", async () => {
  const makeBrowser = ({ domText = "payloadPreview deliveryAttempted=false", network = [] } = {}) => fakeBrowser({
    route: "/ops",
    status: 200,
    body: "payloadPreview deliveryAttempted=false",
    observations: {
      '[data-testid="ops-home-page"]': { count: 1, visibleCount: 1, text: domText },
      body: { count: 1, visibleCount: 1, text: domText },
    },
    network,
  });
  const execute = browser => executeCatalogRuntimeOracle({
    browser,
    item: exactItem("SAFE-042", "/ops"),
    fixtureId: "safe-runtime-contract",
    correlationId: "SAFE-042:contract",
  });
  const result = await execute(makeBrowser());
  assert(result.dom.some(item => item.propertyEvidence.length > 0), "SAFE property assertion was not executed");
  await expectReject(() => execute(makeBrowser({ domText: "payloadPreview" })), "exact DOM property assertion failed");
  await expectReject(() => execute(makeBrowser({
    network: [{ phase: "request-start", method: "POST", url: "https://example.invalid/webhook/delivery" }],
  })), "forbidden external capability request observed");
});

await check("CLIENT control sequence binds POST session id to DELETE and DOM history", async () => {
  const result = await executeCatalogRuntimeOracle({
    browser: clientSequenceBrowser(),
    item: exactItem("CLIENT-020", "/client/live"),
    fixtureId: "client-sequence-contract",
    bindings: { assignedViewId: "9001" },
    correlationId: "CLIENT-020:contract",
  });
  assert(result.interaction.propertyHistory.ariaLabelSequence.join("|") === "정지|재생|정지",
    "CLIENT-020 aria-label sequence mismatch");
  assert(result.responses.some(item => item.method === "DELETE" && item.urlPath.endsWith("/live-session-1")),
    "CLIENT-020 DELETE was not rebound to the created session ID");
  assert(result.cleanup?.strategy === "stop-live-session" && result.cleanup?.paused === true,
    "CLIENT-020 final live session was not cleaned up");
});

const failures = checks.filter(item => item.status === "FAIL");
for (const item of checks) console.log(`[${item.status.toLowerCase()}] ${item.name}${item.error ? `: ${item.error}` : ""}`);
console.log("\n== v3.9.0 exact runtime oracle contract summary ==");
console.log(`- pass: ${checks.length - failures.length}`);
console.log(`- fail: ${failures.length}`);
console.log("- actualBrowserExecution: not-run-by-this-contract");
if (failures.length > 0) process.exit(1);

function exactItem(caseId, route) {
  return {
    caseId,
    workflow: {
      workflowClass: "read-only-state",
      primaryControl: { selector: "body" },
    },
    screenRoute: route,
  };
}

function eventBody({ activeSessions = 2 } = {}) {
  return {
    ok: true,
    sessionManager: {
      activeSessions,
      activeAnalysisTaps: 1,
      registryActiveStreams: 3,
      resourceActiveStreams: 3,
    },
    analysisMatching: { activeTapCount: 1 },
    webrtcHttp: { publishSources: ["one"] },
  };
}

function eventBrowser({ status = 200, body = eventBody(), domText = {}, network = [] } = {}) {
  const texts = {
    "#dashActiveSessions": String(body.sessionManager?.activeSessions ?? 0),
    "#dashActiveStreams": String(body.sessionManager?.registryActiveStreams ?? 0),
    "#dashActiveTaps": String(body.sessionManager?.activeAnalysisTaps ?? 0),
    "#dashPublishSources": String(body.webrtcHttp?.publishSources?.length ?? 0),
    ...domText,
  };
  return fakeBrowser({ route: "/ops/dashboard", status, body, texts, network });
}

function coreBrowser({ attributes = [{ "data-testid": "ops-home-page" }] } = {}) {
  const body = '<section class="ops-workspace-home" data-testid="ops-home-page">AppendOpsHomePage</section>';
  return fakeBrowser({
    route: "/ops/home",
    status: 200,
    body,
    texts: { '[data-testid="ops-home-page"]': "ops-workspace-home" },
    attributes: { '[data-testid="ops-home-page"]': attributes },
  });
}

function clientLiveBrowser(body) {
  const selector = '[data-testid="client-live-action-reduction"]';
  const workspaceSelector = '[data-testid="client-live-workspace"]';
  return fakeBrowser({
    route: "/client/live",
    status: 200,
    body,
    texts: { [selector]: "viewer-safe", [workspaceSelector]: "viewer-safe" },
    attributes: {
      [selector]: [{ "data-testid": "client-live-action-reduction" }],
      [workspaceSelector]: [{ "data-testid": "client-live-workspace" }],
    },
  });
}

function fakeBrowser({ route, status, body, texts = {}, attributes = {}, observations = {}, network = [] }) {
  const entries = [...network];
  let networkReads = 0;
  return {
    networkEntries: () => (++networkReads === 1 ? [] : entries),
    setCorrelationId: async () => {},
    snapshot: async selector => ({ exists: true, visible: true, disabled: false, selector }),
    click: async () => {},
    waitForNetworkQuiet: async () => {},
    evaluate: async script => {
      if (script === "location.pathname") return route;
      if (String(script).startsWith("fetch(")) return { status, text: typeof body === "string" ? body : JSON.stringify(body), json: typeof body === "object" ? body : null, contentType: typeof body === "object" ? "application/json" : "text/html" };
      const selector = [...Object.keys(observations), ...Object.keys(texts), ...Object.keys(attributes)].find(value => String(script).includes(JSON.stringify(value)));
      const observation = selector ? observations[selector] : null;
      return {
        count: observation?.count ?? (selector ? 1 : 0),
        visibleCount: observation?.visibleCount ?? (selector ? 1 : 0),
        text: observation?.text ?? (selector ? String(texts[selector] || "") : ""),
        attributes: observation?.attributes ?? (selector ? (attributes[selector] || [{}]) : []),
        values: [""],
        descendantCount: 0,
        properties: {},
      };
    },
  };
}

function clientSequenceBrowser() {
  const entries = [];
  let clickCount = 0;
  let state = { ariaLabel: "재생", paused: true };
  const response = (method, path, body) => entries.push({
    phase: "response",
    method,
    url: `http://runtime.invalid${path}`,
    status: 200,
    correlationId: "CLIENT-020:contract",
    safeResponseBody: body,
  });
  return {
    networkEntries: () => entries,
    setCorrelationId: async () => {},
    snapshot: async selector => ({ exists: true, visible: true, disabled: false, selector }),
    waitForNetworkQuiet: async () => {},
    click: async () => {
      clickCount += 1;
      if (clickCount === 1) {
        state = { ariaLabel: "정지", paused: false };
        response("POST", "/client/api/views/9001/webrtc/session", { sessionId: "live-session-1" });
      } else if (clickCount === 2) {
        state = { ariaLabel: "재생", paused: true };
        response("DELETE", "/client/api/views/9001/webrtc/session/live-session-1", { ok: true });
      } else if (clickCount === 3) {
        state = { ariaLabel: "정지", paused: false };
        response("POST", "/client/api/views/9001/webrtc/session", { sessionId: "live-session-2" });
      } else {
        state = { ariaLabel: "재생", paused: true };
        response("DELETE", "/client/api/views/9001/webrtc/session/live-session-2", { ok: true });
      }
    },
    evaluate: async script => {
      if (script === "location.pathname") return "/client/live";
      if (script === "Boolean(document.querySelector('video')?.paused)") return state.paused;
      if (String(script).includes("ariaLabel:") && String(script).includes("paused:")) return state;
      return {
        count: 1,
        visibleCount: 1,
        text: "",
        attributes: [{}],
        values: [""],
        descendantCount: 0,
        properties: {},
      };
    },
  };
}

async function expectReject(fn, message) {
  let error = "";
  try { await fn(); } catch (caught) { error = String(caught?.message || caught); }
  assert(error.includes(message), `expected rejection '${message}', got '${error}'`);
}

async function check(name, fn) {
  try { await fn(); checks.push({ name, status: "PASS" }); }
  catch (error) { checks.push({ name, status: "FAIL", error: String(error?.message || error) }); }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
