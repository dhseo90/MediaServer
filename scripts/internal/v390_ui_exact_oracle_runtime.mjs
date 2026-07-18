// 파일 용도: exact runtime oracle catalog를 실제 브라우저 interaction/API/DOM 관찰로 실행한다.

import { exactRuntimeOracleFor } from "./v390_ui_exact_oracle_catalog.mjs";
import {
  evaluateEventExactDomAssertion,
  evaluateEventExactResponseAssertion,
  eventExactValuesAtPath,
} from "./v390_ui_exact_event_oracle_evaluator.mjs";
import { materializeClientSafeExactOracle } from "./v390_ui_exact_client_safe_oracles.mjs";

const refreshControls = Object.freeze({
  "/ops": "#opsHomeRefresh",
  "/ops/home": "#opsHomeRefresh",
  "/ops/dashboard": "#opsDashboardRefresh",
  "/ops/sources": "#refresh",
  "/ops/rules": "#opsRulesRefresh",
  "/ops/users": "#refresh-btn",
  "/ops/events": "#opsEventsRefresh",
  "/ops/vlm": "#opsVlmRefresh",
  "/client/live": "#refresh",
  "/client/dashboard": "#refresh",
  "/client/events": "#refresh",
});

export function isExistingSpecializedExactOracle(itemOrCaseId) {
  const item = typeof itemOrCaseId === "object" ? itemOrCaseId : null;
  const caseId = item?.caseId || String(itemOrCaseId || "");
  if (exactRuntimeOracleFor(caseId)?.classification === "existing-specialized") return true;
  if (item && ["form-submit", "persisted-mutation", "negative-route"].includes(item.workflow?.workflowClass)) return true;
  return new Set(["UI-001", "UI-018", "SAFE-017", "SRC-031", "RULE-001", "RULE-002", "RULE-003"]).has(caseId);
}

export async function executeCatalogRuntimeOracle({
  browser,
  item,
  fixtureId,
  bindings = {},
  correlationId,
}) {
  const baseSpec = exactRuntimeOracleFor(item.caseId);
  assert(baseSpec?.caseId === item.caseId, `${item.caseId} runtime oracle spec missing`);
  if (baseSpec.classification === "existing-specialized") {
    return { schema: "media-server.v390-ui-exact-runtime-observation.v1", delegated: true, caseId: item.caseId };
  }
  const runtimeBindings = {
    fixtureId,
    caseId: item.caseId,
    assignedViewId: bindings.assignedViewId || bindings.viewId || "9001",
    blockedViewId: bindings.blockedViewId || "99002",
    viewId: bindings.viewId || bindings.assignedViewId || "9001",
    sourceId: bindings.sourceId || "9001",
    ruleId: bindings.ruleId || "1",
    candidateId: bindings.candidateId || fixtureId,
    draftId: bindings.draftId || fixtureId,
    sessionId: bindings.sessionId || `${fixtureId}-session`,
    vaMetadataSampleId: bindings.vaMetadataSampleId || fixtureId,
    viewA: bindings.viewA || bindings.assignedViewId || "9001",
    viewB: bindings.viewB || bindings.blockedViewId || "9002",
    q: encodeURIComponent(bindings.q || fixtureId),
    evidence: encodeURIComponent(bindings.evidence || "snapshot"),
    incidentStatus: encodeURIComponent(bindings.incidentStatus || "open"),
    startTimeMs: String(bindings.startTimeMs || 0),
    endTimeMs: String(bindings.endTimeMs || Date.now()),
    limit: String(bindings.limit || 100),
    offset: String(bindings.offset || 0),
    id: fixtureId,
    token: bindings.token || "runtime-token-redacted",
    ...bindings,
  };
  const clientSafeCase = /^(CLIENT|MEDIA|SAFE)-/.test(item.caseId);
  let fixtureValues = clientSafeFixtureValues(runtimeBindings);
  let spec = clientSafeCase
    ? materializeClientSafeExactOracle(item.caseId, fixtureValues)
    : baseSpec;
  const networkStart = browser.networkEntries().length;
  await browser.setCorrelationId(correlationId);
  try {
    const interaction = await executeTrustedInteraction(browser, item, spec, correlationId);
    if (clientSafeCase) {
      const createdSessionId = browser.networkEntries().slice(networkStart)
        .find(entry => entry.phase === "response" && entry.method === "POST" &&
          /\/webrtc\/session$/.test(new URL(entry.url).pathname) && entry.safeResponseBody?.sessionId)
        ?.safeResponseBody?.sessionId;
      if (createdSessionId) {
        fixtureValues = { ...fixtureValues, "active-session": String(createdSessionId) };
        spec = materializeClientSafeExactOracle(item.caseId, fixtureValues);
      }
    }
    const responses = [];
    const responseBodies = [];
    for (const request of spec.requests) {
      const observation = await observeRequest(browser, item, request, runtimeBindings, correlationId, networkStart);
      responses.push(observation.evidence);
      responseBodies.push(observation.body);
    }
    const dom = [];
    for (const assertion of spec.dom) {
      dom.push(await observeDom(browser, item, assertion, runtimeBindings, responses, responseBodies, interaction));
    }
    assertForbiddenNetwork(browser.networkEntries().slice(networkStart), item, spec, runtimeBindings);
    const cleanup = await cleanupTrustedInteraction(browser, item, spec, interaction, correlationId);
    return {
      schema: "media-server.v390-ui-exact-runtime-observation.v1",
      caseId: item.caseId,
      featureMeaning: spec.featureMeaning || spec.expectedBehavior,
      interaction,
      responses,
      dom,
      cleanup,
      forbiddenNetworkObserved: 0,
      requestedRoute: spec.route,
      observedRoute: await browser.evaluate("location.pathname"),
    };
  } finally {
    await browser.setCorrelationId(`${item.caseId}:navigation`);
  }
}

async function cleanupTrustedInteraction(browser, item, spec, interaction, correlationId) {
  const kind = interaction?.kind || "";
  if (["start-live-tile", "control-sequence"].includes(kind)) {
    await browser.click(interaction.selector);
    await browser.waitForNetworkQuiet({ correlationId, minimumObservationMs: 300, quietMs: 150 });
    const paused = await browser.evaluate("Boolean(document.querySelector('video')?.paused)");
    assert(paused === true, `${item.caseId} media session cleanup did not stop playback`);
    return { strategy: "stop-live-session", status: "PASS", paused: true };
  }
  if (kind === "start-two-live-tiles") {
    const result = await browser.evaluate(`(async () => {
      const controls = Array.from(document.querySelectorAll(${JSON.stringify(interaction.selector)}))
        .slice(0, 2).map(tile => tile.querySelector('[data-action="toggle-playback"]')).filter(Boolean);
      for (const control of controls) if (!control.disabled) control.click();
      await new Promise(resolve => setTimeout(resolve, 300));
      const videos = Array.from(document.querySelectorAll(${JSON.stringify(`${interaction.selector} video`)})).slice(0, 2);
      return { controlCount: controls.length, stopped: videos.length === 2 && videos.every(video => video.paused) };
    })()`);
    assert(result.controlCount === 2 && result.stopped === true,
      `${item.caseId} two-live-tile cleanup mismatch: ${JSON.stringify(result)}`);
    await browser.waitForNetworkQuiet({ correlationId, minimumObservationMs: 300, quietMs: 150 });
    return { strategy: "stop-two-live-sessions", status: "PASS", ...result };
  }
  if (kind === "fill") {
    await browser.fill(interaction.selector, interaction.before?.value || "");
    return { strategy: "restore-control-value", status: "PASS" };
  }
  if (kind === "select") {
    const previous = interaction.before?.selectedValues?.[0] || interaction.before?.value || "";
    await browser.select(interaction.selector, previous);
    return { strategy: "restore-select-value", status: "PASS" };
  }
  if (kind === "navigate-negative" || (kind === "activate" && item.caseId === "SAFE-053")) {
    const observed = await browser.navigate(spec.route);
    assert([200, 204].includes(observed.status), `${item.caseId} route cleanup status mismatch: ${observed.status}`);
    return { strategy: "restore-route", status: "PASS", route: spec.route };
  }
  if (kind === "activate" && item.caseId === "CLIENT-021") {
    await browser.click(interaction.selector);
    return { strategy: "restore-overlay-toggle", status: "PASS" };
  }
  return { strategy: spec.cleanup?.strategy || "no-op-with-state-proof", status: "PASS" };
}

function clientSafeFixtureValues(bindings) {
  return {
    "active-session": bindings.sessionId,
    "assigned-view": bindings.assignedViewId,
    "assigned-view-a": bindings.viewA,
    "assigned-view-b": bindings.viewB,
    "blocked-view": bindings.blockedViewId,
    "va-metadata-sample": bindings.vaMetadataSampleId,
    "vlm-rule-suggestion-draft": bindings.draftId,
    "vlm-summary-candidate": bindings.candidateId,
  };
}

async function executeTrustedInteraction(browser, item, spec, correlationId) {
  if (/^(CLIENT|MEDIA|SAFE)-/.test(item.caseId)) {
    return executeClientSafeInteraction(browser, item, spec, correlationId);
  }
  const selector = refreshControls[spec.route] || "";
  if (!selector || ["form-submit", "persisted-mutation", "actionable", "negative-route"].includes(item.workflow.workflowClass)) {
    return { kind: "existing-primary-action-or-navigation", selector: item.workflow.primaryControl?.selector || null };
  }
  const before = await browser.snapshot(selector);
  assert(before.exists && before.visible && before.disabled === false,
    `${item.caseId} exact runtime refresh control is not actionable: ${selector}`);
  await browser.click(selector);
  await browser.waitForNetworkQuiet({ correlationId, minimumObservationMs: 500, quietMs: 200 });
  const after = await browser.snapshot(selector);
  return { kind: "click", selector, before, after };
}

async function executeClientSafeInteraction(browser, item, spec, correlationId) {
  const action = spec.action || {};
  const target = String(action.target || spec.visibleControl?.selector || "");
  const snapshot = target && !target.startsWith("/") && target !== "start-stop-reconnect"
    ? await browser.snapshot(target)
    : null;
  if (action.kind === "assert-absence") {
    assert(!snapshot?.exists, `${item.caseId} forbidden product control exists: ${target}`);
    return { kind: action.kind, selector: target, observedAbsent: true };
  }
  if (action.kind === "assert-read-model") {
    const refresh = refreshControls[spec.route];
    if (refresh) {
      const control = await browser.snapshot(refresh);
      if (control.exists && control.visible && !control.disabled) {
        await browser.click(refresh);
        await browser.waitForNetworkQuiet({ correlationId, minimumObservationMs: 500, quietMs: 200 });
        return { kind: action.kind, selector: target, refreshSelector: refresh };
      }
    }
    return { kind: action.kind, selector: target };
  }
  if (["activate", "start-live-tile"].includes(action.kind)) {
    assert(snapshot?.exists && snapshot.visible && snapshot.disabled === false,
      `${item.caseId} exact product action is not actionable: ${target}`);
    await browser.click(target);
    await browser.waitForNetworkQuiet({ correlationId, minimumObservationMs: 500, quietMs: 200 });
    return { kind: action.kind, selector: target, before: snapshot, after: await browser.snapshot(target) };
  }
  if (action.kind === "control-sequence") {
    const controlSelector = spec.visibleControl.selector;
    const ariaLabelSequence = [];
    const pausedSequence = [];
    for (let index = 0; index < 3; index += 1) {
      const control = await browser.snapshot(controlSelector);
      assert(control.exists && control.visible && control.disabled === false,
        `${item.caseId} control-sequence action unavailable: ${controlSelector}`);
      await browser.click(controlSelector);
      await browser.waitForNetworkQuiet({ correlationId, minimumObservationMs: 300, quietMs: 150 });
      const state = await browser.evaluate(`(() => ({
        ariaLabel: document.querySelector(${JSON.stringify(controlSelector)})?.getAttribute('aria-label') || '',
        paused: Boolean(document.querySelector('video')?.paused),
      }))()`);
      ariaLabelSequence.push(state.ariaLabel);
      pausedSequence.push(state.paused);
    }
    return { kind: action.kind, selector: controlSelector, propertyHistory: { ariaLabelSequence, pausedSequence } };
  }
  if (action.kind === "start-two-live-tiles") {
    const result = await browser.evaluate(`(async () => {
      const tiles = Array.from(document.querySelectorAll(${JSON.stringify(target)})).slice(0, 2);
      if (tiles.length !== 2) return { tileCount: tiles.length, clicked: 0 };
      let clicked = 0;
      for (const tile of tiles) {
        const control = tile.querySelector('[data-action="toggle-playback"]');
        if (control && !control.disabled) { control.click(); clicked += 1; }
      }
      await new Promise(resolve => setTimeout(resolve, 500));
      return { tileCount: tiles.length, clicked };
    })()`);
    assert(result.tileCount === 2 && result.clicked === 2,
      `${item.caseId} two-live-tile action mismatch: ${JSON.stringify(result)}`);
    await browser.waitForNetworkQuiet({ correlationId, minimumObservationMs: 500, quietMs: 200 });
    return { kind: action.kind, selector: target, ...result };
  }
  if (action.kind === "reload") {
    const observed = await browser.navigate(target);
    assert([200, 204].includes(observed.status), `${item.caseId} reload status mismatch: ${observed.status}`);
    return { kind: action.kind, route: target, observed };
  }
  if (action.kind === "navigate-negative") {
    const observed = await browser.navigate(target);
    assert(observed.status === 404, `${item.caseId} negative navigation status mismatch: ${observed.status}`);
    return { kind: action.kind, route: target, observed };
  }
  if (action.kind === "fill") {
    assert(snapshot?.exists && snapshot.visible && snapshot.disabled === false, `${item.caseId} fill control unavailable: ${target}`);
    await browser.fill(target, action.value);
    return { kind: action.kind, selector: target, before: snapshot, valueDigest: stableDigest(action.value) };
  }
  if (action.kind === "select") {
    assert(snapshot?.exists && snapshot.visible && snapshot.disabled === false, `${item.caseId} select control unavailable: ${target}`);
    await browser.select(target, action.value);
    return { kind: action.kind, selector: target, before: snapshot, valueDigest: stableDigest(action.value) };
  }
  throw new Error(`${item.caseId} unsupported exact client/safe action kind: ${action.kind || "missing"}`);
}

async function observeRequest(browser, item, request, bindings, correlationId, networkStart) {
  const method = String(request.method || "GET").toUpperCase();
  const urlPath = expand(String(request.path || ""), bindings);
  const allowedStatuses = request.allowedStatuses || request.statuses || [200];
  let status = 0;
  let body = null;
  let contentType = "";
  let source = "";
  if (["GET", "HEAD"].includes(method)) {
    const result = await browser.evaluate(`fetch(${JSON.stringify(urlPath)}, {
      method: ${JSON.stringify(method)}, credentials: 'same-origin', cache: 'no-store'
    }).then(async response => {
      const text = await response.text();
      let json = null;
      try { json = JSON.parse(text); } catch (_) {}
      return { status: response.status, text, json, contentType: response.headers.get('content-type') || '' };
    })`);
    status = result.status;
    body = result.json ?? result.text;
    contentType = result.contentType || "";
    source = "fresh-browser-fetch";
  } else {
    const match = browser.networkEntries().slice(networkStart).find(entry => {
      if (entry.phase !== "response" || entry.method !== method) return false;
      try { return new URL(entry.url).pathname === new URL(urlPath, "http://runtime.invalid").pathname; } catch (_) { return false; }
    });
    assert(match, `${item.caseId} exact mutation response missing: ${method} ${urlPath}`);
    status = match.status;
    body = match.safeResponseBody ?? null;
    contentType = String(match.responseHeaders?.["content-type"] || match.contentType || "");
    source = "correlated-browser-network";
    if (request.correlationRequired !== false) {
      assert(match.correlationId === correlationId || match.correlationId === `${item.caseId}:primary-action`,
        `${item.caseId} exact mutation response correlation mismatch: ${method} ${urlPath}`);
    }
  }
  assert(allowedStatuses.includes(status),
    `${item.caseId} exact request status mismatch ${method} ${urlPath}: ${status}/${allowedStatuses.join(",")}`);
  const required = request.requiredJsonPaths || request.requiredBodyTokens || [];
  for (const token of required) {
    assertRequiredBodyToken(body, expand(String(token), bindings), item.caseId, `${method} ${urlPath}`);
  }
  const forbidden = request.forbiddenJsonKeys || [];
  for (const key of forbidden) {
    assert(!containsForbiddenResponseMaterial(body, String(key), contentType),
      `${item.caseId} forbidden response material observed in ${method} ${urlPath}: ${key}`);
  }
  const serializedBody = typeof body === "string" ? body : JSON.stringify(body ?? null);
  for (const expected of request.requiredJsonValues || []) {
    assert(expected.operator === "contains-value" && serializedBody.includes(String(expected.value)),
      `${item.caseId} required response value missing in ${method} ${urlPath}: ${expected.value}`);
  }
  for (const forbiddenValue of request.forbiddenJsonValues || []) {
    assert(forbiddenValue.operator === "excludes-fixture" && !serializedBody.includes(String(forbiddenValue.value)),
      `${item.caseId} forbidden response value observed in ${method} ${urlPath}: ${forbiddenValue.value}`);
  }
  for (const [key, expected] of Object.entries(request.cardinality || {})) {
    const values = recursiveValuesForKey(body, key);
    const actual = values.length === 1 && Array.isArray(values[0]) ? values[0].length : values.length;
    assert(actual === Number(expected),
      `${item.caseId} response cardinality mismatch in ${method} ${urlPath}: ${key}=${actual}/${expected}`);
  }
  const assertionEvidence = evaluateRequestAssertions(request.assertions || request.jsonAssertions || [], {
    body,
    contentType,
    bindings,
    caseId: item.caseId,
    requestLabel: `${method} ${urlPath}`,
  });
  return {
    evidence: { method, urlPath, status, source, bodyDigest: stableDigest(body), assertionEvidence },
    body,
  };
}

async function observeDom(browser, item, assertion, bindings, responses, responseBodies, interaction) {
  const selector = expand(String(assertion.selector || ""), bindings);
  const observed = await browser.evaluate(`(async () => {
    const nodes = Array.from(document.querySelectorAll(${JSON.stringify(selector)}));
    const rects = nodes.map(node => node.getBoundingClientRect());
    const overlaps = rects.flatMap((left, index) => rects.slice(index + 1).map(right =>
      left.left < right.right && left.right > right.left && left.top < right.bottom && left.bottom > right.top)).filter(Boolean).length;
    const videos = nodes.filter(node => node instanceof HTMLVideoElement).concat(
      nodes.flatMap(node => Array.from(node.querySelectorAll('video'))));
    const mediaTrackKinds = [...new Set(videos.flatMap(video =>
      video.srcObject && typeof video.srcObject.getTracks === 'function' ? video.srcObject.getTracks().map(track => track.kind) : []))];
    const firstRects = rects.map(rect => [rect.x, rect.y, rect.width, rect.height].map(value => Math.round(value * 100) / 100));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const secondRects = nodes.map(node => { const rect = node.getBoundingClientRect(); return [rect.x, rect.y, rect.width, rect.height].map(value => Math.round(value * 100) / 100); });
    return {
      count: nodes.length,
      visibleCount: nodes.filter(node => {
        const rect = node.getBoundingClientRect(); const style = getComputedStyle(node);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      }).length,
      text: nodes.map(node => String(node.innerText || node.textContent || '')).join(' ').replace(/\\s+/g, ' ').trim().slice(0, 24000),
      attributes: nodes.slice(0, 20).map(node => Object.fromEntries(Array.from(node.attributes || []).map(attr => [attr.name, attr.value]))),
      values: nodes.slice(0, 20).map(node => String(node.value ?? '')),
      descendantCount: nodes.reduce((count, node) => count + node.querySelectorAll('*').length, 0),
      properties: {
        text: nodes.map(node => String(node.innerText || node.textContent || '')).join(' ').replace(/\\s+/g, ' ').trim(),
        value: nodes[0] && 'value' in nodes[0] ? String(nodes[0].value ?? '') : '',
        hidden: nodes.length > 0 ? nodes.every(node => node.hidden || getComputedStyle(node).display === 'none' || getComputedStyle(node).visibility === 'hidden') : true,
        ariaLabelSequence: nodes.map(node => node.getAttribute('aria-label') || '').filter(Boolean),
        pausedSequence: videos.map(video => Boolean(video.paused)),
        mediaTrackKinds,
        playingCount: videos.filter(video => !video.paused && video.readyState >= 2).length,
        readyState: videos.length ? Math.max(...videos.map(video => Number(video.readyState || 0))) : 0,
        boundingRectWithinViewport: rects.every(rect => rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight),
        captionVisible: videos.some(video => Array.from(video.textTracks || []).some(track => track.mode === 'showing')),
        overlaps: overlaps > 0,
        overlapCount: overlaps,
        layoutStableSamples: JSON.stringify(firstRects) === JSON.stringify(secondRects),
        sampleId: nodes[0]?.getAttribute('data-sample-id') || nodes[0]?.dataset?.sampleId || '',
        navigationStatus: Number(document.body?.dataset?.navigationStatus || document.querySelector('[data-navigation-status]')?.getAttribute('data-navigation-status') || 0),
      },
    };
  })()`);
  const requiredText = (assertion.requiredTextTokens || []).map(value => expand(String(value), bindings)).filter(Boolean);
  const forbiddenText = (assertion.forbiddenTextTokens || []).map(value => expand(String(value), bindings)).filter(Boolean);
  const zeroCardinalityExpected = assertion.cardinality?.operator === "equals" && Number(assertion.cardinality?.value) === 0;
  assert(observed.count > 0 || assertion.expectedExists === false || zeroCardinalityExpected,
    `${item.caseId} exact DOM selector missing: ${selector}`);
  if (assertion.expectedExists === false) {
    assert(observed.count === 0, `${item.caseId} forbidden DOM selector exists: ${selector}`);
  }
  if (assertion.cardinality) {
    const expected = Number(assertion.cardinality.value);
    const operator = String(assertion.cardinality.operator || "equals");
    assert(compareNumber(observed.count, operator, expected),
      `${item.caseId} exact DOM cardinality mismatch ${selector}: ${observed.count} ${operator} ${expected}`);
  }
  for (const token of requiredText) {
    assert(observed.text.includes(token), `${item.caseId} exact DOM token missing ${selector}: ${token}`);
  }
  for (const token of forbiddenText) {
    assert(!observed.text.includes(token), `${item.caseId} forbidden DOM token observed ${selector}: ${token}`);
  }
  const requiredAttributes = Array.isArray(assertion.requiredAttributes)
    ? assertion.requiredAttributes
    : Object.entries(assertion.requiredAttributes || {}).map(([name, value]) => ({ name, value, operator: "equals" }));
  for (const expected of requiredAttributes) {
    const name = expected.name;
    if (!name || expected.value === null || expected.value === undefined) continue;
    const value = expand(String(expected.value), bindings);
    const matches = name === "count"
      ? compareNumber(observed.count, expected.operator || "equals", Number(value))
      : observed.attributes.some(attributes => compareAttribute(attributes[name], expected.operator || "equals", value));
    assert(matches,
      `${item.caseId} exact DOM attribute mismatch ${selector}: ${name}=${value}`);
  }
  const propertyEvidence = evaluateDomPropertyAssertions(assertion.propertyAssertions || [], observed, bindings, item.caseId, selector, interaction);
  const semanticEvidence = evaluateDomSemanticAssertions(assertion.assertions || [], observed, responseBodies, bindings, item.caseId, selector);
  return {
    selector,
    count: observed.count,
    visibleCount: observed.visibleCount,
    textDigest: stableDigest(observed.text),
    responseCount: responses.length,
    propertyEvidence,
    semanticEvidence,
  };
}

function assertForbiddenNetwork(entries, item, spec, bindings) {
  for (const forbidden of spec.forbiddenNetwork || []) {
    const method = String(forbidden.method || "").toUpperCase();
    const expandedPath = expand(String(forbidden.path || ""), bindings);
    if (["FORBID", "EXTERNAL"].includes(method)) {
      const capability = expandedPath.toLowerCase();
      const hit = entries.some(entry => entry.phase === "request-start" &&
        String(entry.url || "").toLowerCase().includes(capability));
      assert(!hit, `${item.caseId} forbidden ${method.toLowerCase()} capability request observed: ${expandedPath}`);
      continue;
    }
    const pathPattern = expandedPath.replace(/\{any\}/g, "").replace(/\*+$/, "");
    const hit = entries.some(entry => {
      if (entry.phase !== "request-start" || entry.method !== method) return false;
      try {
        const pathname = new URL(entry.url).pathname;
        return forbidden.match === "exact" ? pathname === pathPattern : pathname.startsWith(pathPattern);
      } catch (_) { return false; }
    });
    assert(!hit, `${item.caseId} forbidden network request observed: ${method} ${pathPattern}`);
  }
}

function assertRequiredBodyToken(body, token, caseId, requestLabel) {
  if (!token) return;
  if (body && typeof body === "object" && resolvePath(body, token).length > 0) return;
  const serialized = typeof body === "string" ? body : JSON.stringify(body ?? null);
  const alternatives = token.split("|").map(value => value.trim()).filter(Boolean);
  assert(alternatives.some(value => serialized.includes(value)),
    `${caseId} exact response token/path missing in ${requestLabel}: ${token}`);
}

function resolvePath(value, expression) {
  const recursive = String(expression || "").match(/^\$\.\.([A-Za-z0-9_-]+)$/);
  if (recursive) return recursiveValuesForKey(value, recursive[1]);
  const normalized = String(expression || "").replace(/\[\]/g, ".*").replace(/^\$\.?/, "");
  if (!normalized || /[= <>]/.test(normalized)) return [];
  let current = [value];
  for (const segment of normalized.split(".").filter(Boolean)) {
    const next = [];
    for (const item of current) {
      if (segment === "*") {
        if (Array.isArray(item)) next.push(...item);
        else if (item && typeof item === "object") next.push(...Object.values(item));
      } else if (item && typeof item === "object" && Object.prototype.hasOwnProperty.call(item, segment)) {
        next.push(item[segment]);
      }
    }
    current = next;
  }
  return current.filter(value => value !== undefined);
}

function recursiveValuesForKey(value, wantedKey) {
  const results = [];
  const visit = current => {
    if (Array.isArray(current)) {
      for (const item of current) visit(item);
      return;
    }
    if (!current || typeof current !== "object") return;
    for (const [key, child] of Object.entries(current)) {
      if (key === wantedKey) results.push(child);
      visit(child);
    }
  };
  visit(value);
  return results;
}

function containsForbiddenKeyOrValue(value, needle) {
  if (!needle) return false;
  if (typeof value === "string") return value.toLowerCase().includes(needle.toLowerCase());
  if (Array.isArray(value)) return value.some(item => containsForbiddenKeyOrValue(item, needle));
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(([key, child]) =>
    key.toLowerCase() === needle.toLowerCase() || containsForbiddenKeyOrValue(child, needle));
}

function containsForbiddenResponseMaterial(value, needle, contentType) {
  const mediaType = String(contentType || "").split(";", 1)[0].trim().toLowerCase();
  if (mediaType !== "text/html" || typeof value !== "string") {
    return containsForbiddenKeyOrValue(value, needle);
  }
  return htmlEmbeddedJsonDocuments(value).some(document => containsForbiddenKeyOrValue(document, needle)) ||
    htmlContainsForbiddenAttribute(value, needle);
}

function htmlEmbeddedJsonDocuments(html) {
  const documents = [];
  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  for (const match of String(html || "").matchAll(scriptPattern)) {
    const attributes = match[1] || "";
    const typeMatch = attributes.match(/\btype\s*=\s*(["'])(.*?)\1/i);
    if (String(typeMatch?.[2] || "").trim().toLowerCase() !== "application/json") continue;
    const source = String(match[2] || "").trim();
    if (!source) continue;
    try {
      documents.push(JSON.parse(source));
    } catch {
      documents.push(source);
    }
  }
  return documents;
}

function htmlContainsForbiddenAttribute(html, needle) {
  const kebab = String(needle || "").replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  const compact = String(needle || "").toLowerCase();
  return [...String(html || "").matchAll(/\s([\w:-]+)\s*=\s*(["'])/g)].some(match => {
    const attribute = String(match[1] || "").toLowerCase();
    return attribute === compact || attribute === kebab ||
      attribute === `data-${compact}` || attribute === `data-${kebab}`;
  });
}

function compareAttribute(actual, operator, expected) {
  const value = String(actual ?? "");
  if (operator === "includes" || operator === "includesAll") return value.includes(expected);
  if (operator === "excludes" || operator === "excludesAll") return !value.includes(expected);
  if (operator === "present") return actual !== undefined;
  return value === expected;
}

function compareNumber(actual, operator, expected) {
  if (!Number.isFinite(Number(actual)) || !Number.isFinite(Number(expected))) return false;
  if (operator === "gte" || operator === "number-gte") return Number(actual) >= Number(expected);
  if (operator === "lte" || operator === "number-lte") return Number(actual) <= Number(expected);
  if (operator === "gt") return Number(actual) > Number(expected);
  if (operator === "lt") return Number(actual) < Number(expected);
  return Number(actual) === Number(expected);
}

function evaluateRequestAssertions(assertions, context) {
  return assertions.map(assertion => {
    if (context.caseId.startsWith("EVT-")) {
      const result = evaluateEventExactResponseAssertion({
        caseId: context.caseId,
        assertion,
        responseJson: typeof context.body === "object" ? context.body : null,
        responseText: typeof context.body === "string" ? context.body : JSON.stringify(context.body ?? null),
        responseHeaders: { "content-type": context.contentType },
        context: {
          fixtureId: context.bindings.fixtureId,
          templateValues: context.bindings,
          sensitiveCanaries: [context.bindings.redactionCanary, context.bindings.rawCanary, context.bindings.credentialCanary].filter(Boolean),
        },
      });
      assert(result.pass, `${context.caseId} exact request assertion failed ${context.requestLabel}: ${assertion.operator} ${assertion.path || ""} (${result.reason})`);
      return { operator: assertion.operator, path: assertion.path || null, valueDigest: stableDigest(result.actual) };
    }
    const operator = String(assertion.operator || "");
    const values = assertionValues(context.body, assertion.path, context.contentType);
    const serialized = JSON.stringify(values);
    let pass = false;
    const expected = assertion.expected !== undefined ? assertion.expected : assertion.value;
    if (operator === "equals" || operator === "equals-fixture") pass = values.some(value => Object.is(value, expected));
    else if (operator === "exists") pass = values.length > 0 && values.every(value => value !== undefined && value !== null);
    else if (operator === "number-gte") pass = values.some(value => compareNumber(value, "gte", assertion.expected));
    else if (operator === "number") pass = values.some(value => typeof value === "number" && Number.isFinite(value));
    else if (operator === "boolean") pass = values.some(value => typeof value === "boolean");
    else if (operator === "array") pass = values.some(Array.isArray);
    else if (operator === "object") pass = values.some(value => value && typeof value === "object" && !Array.isArray(value));
    else if (operator === "non-empty") pass = values.length > 0 && values.every(value => String(value ?? "").length > 0);
    else if (operator === "string-non-empty") pass = values.some(value => typeof value === "string" && value.length > 0);
    else if (operator === "starts-with") pass = values.some(value => String(value ?? "").startsWith(String(assertion.expected ?? "")));
    else if (operator === "contains-action") pass = serialized.includes(String(assertion.expected ?? ""));
    else if (operator.startsWith("contains-fixture")) {
      const candidates = fixtureBindingValues(context.bindings);
      pass = candidates.length > 0 && candidates.some(value => serialized.includes(value));
    } else if (operator.startsWith("not-contains-")) {
      const key = String(assertion.target || assertion.path || "").replace(/^\$/, "");
      const canary = String(context.bindings[key] || context.bindings.redactionCanary || "");
      pass = canary.length > 0 && !serialized.includes(canary);
    } else {
      throw new Error(`${context.caseId} unsupported exact request assertion operator: ${operator}`);
    }
    assert(pass, `${context.caseId} exact request assertion failed ${context.requestLabel}: ${operator} ${assertion.path || ""}`);
    return { operator, path: assertion.path || null, valueDigest: stableDigest(values) };
  });
}

function evaluateDomPropertyAssertions(assertions, observed, bindings, caseId, selector, interaction) {
  const textOrAttributes = `${observed.text} ${JSON.stringify(observed.attributes)} ${observed.values.join(" ")}`;
  return assertions.map(assertion => {
    const operator = String(assertion.operator || "");
    const rawValues = Array.isArray(assertion.value) ? assertion.value : [assertion.value];
    const values = rawValues.map(value => expand(String(value ?? ""), bindings));
    let pass = false;
    const actual = interaction?.propertyHistory?.[assertion.name] ?? observed.properties?.[assertion.name];
    if (assertion.name === "textOrAttributes" && (operator === "includesAll" || operator === "includes")) {
      pass = values.every(value => textOrAttributes.includes(value));
    } else if (assertion.name === "textOrAttributes" && (operator === "excludesAll" || operator === "excludes")) {
      pass = values.every(value => !textOrAttributes.includes(value));
    } else if (assertion.name === "count") {
      pass = compareNumber(observed.count, operator, Number(values[0]));
    } else if (operator === "equals") {
      const expected = Array.isArray(assertion.value)
        ? assertion.value.map(value => typeof value === "string" ? expand(value, bindings) : value)
        : (typeof assertion.value === "string" ? expand(assertion.value, bindings) : assertion.value);
      pass = JSON.stringify(actual) === JSON.stringify(expected);
    } else if (operator === "includes") {
      pass = Array.isArray(actual) ? actual.includes(assertion.value) : String(actual ?? "").includes(String(assertion.value));
    } else if (operator === "greaterThanOrEqual") {
      pass = Number(actual) >= Number(assertion.value);
    } else {
      throw new Error(`${caseId} unsupported exact DOM property assertion: ${assertion.name}/${operator}`);
    }
    assert(pass, `${caseId} exact DOM property assertion failed ${selector}: ${assertion.name}/${operator}`);
    return { name: assertion.name, operator, valueDigest: stableDigest(values) };
  });
}

function evaluateDomSemanticAssertions(assertions, observed, responseBodies, bindings, caseId, selector) {
  return assertions.map(assertion => {
    const operator = String(assertion.operator || "");
    const target = expand(String(assertion.target || ""), bindings);
    const responseValues = responseBodies.flatMap(body => target.split("|").flatMap(path => resolvePath(body, path)));
    if (caseId.startsWith("EVT-")) {
      const responseValueMap = {};
      const alternativeValues = [];
      for (const path of target.split("|").filter(Boolean)) {
        const values = responseBodies.flatMap(body => eventExactValuesAtPath(body, path));
        if (values.length > 0) {
          responseValueMap[path] = values.length === 1 ? values[0] : values;
          alternativeValues.push(responseValueMap[path]);
        }
      }
      if (alternativeValues.length > 0) responseValueMap[target] = alternativeValues[0];
      const result = evaluateEventExactDomAssertion({
        caseId,
        assertion: { ...assertion, target },
        observation: {
          selector,
          exists: observed.count > 0,
          visible: observed.visibleCount > 0,
          text: observed.text,
          number: Number(observed.text.replace(/[^0-9.-]/g, "")),
          attributes: observed.attributes,
          descendantCount: observed.descendantCount,
        },
        context: {
          fixtureId: bindings.fixtureId,
          templateValues: bindings,
          responseValues: responseValueMap,
          sensitiveCanaries: [bindings.redactionCanary, bindings.rawCanary, bindings.credentialCanary].filter(Boolean),
        },
      });
      assert(result.pass, `${caseId} exact DOM semantic assertion failed ${selector}: ${operator}/${target} (${result.reason})`);
      return { operator, target, responseValueDigest: stableDigest(result.actual) };
    }
    let pass = false;
    if (operator === "number-equals-response") {
      pass = responseValues.some(value => Number(observed.text.replace(/[^0-9.-]/g, "")) === Number(value));
    } else if (operator === "text-includes") {
      pass = observed.text.includes(target);
    } else if (operator === "contains-descendant") {
      pass = observed.descendantCount > 0;
    } else if (operator.startsWith("contains-fixture")) {
      const candidates = fixtureBindingValues(bindings);
      pass = candidates.length > 0 && candidates.some(value => observed.text.includes(value) || JSON.stringify(observed.attributes).includes(value));
    } else if (operator.startsWith("not-contains-")) {
      const canary = String(bindings[target] || bindings.redactionCanary || "");
      pass = canary.length > 0 && !observed.text.includes(canary);
    } else {
      throw new Error(`${caseId} unsupported exact DOM semantic assertion operator: ${operator}`);
    }
    assert(pass, `${caseId} exact DOM semantic assertion failed ${selector}: ${operator}/${target}`);
    return { operator, target, responseValueDigest: stableDigest(responseValues) };
  });
}

function assertionValues(body, expression, contentType) {
  if (expression === "$text" || expression === "$body") {
    return [typeof body === "string" ? body : JSON.stringify(body ?? null)];
  }
  if (expression === "$contentType") return [contentType];
  return resolvePath(body, expression);
}

function fixtureBindingValues(bindings) {
  return [...new Set(Object.entries(bindings)
    .filter(([key, value]) => /(^id$|fixture|sourceId|ruleId|viewId|candidateId|draftId|sessionId|eventId)/i.test(key) && value !== null && value !== undefined)
    .map(([, value]) => String(value))
    .filter(Boolean))];
}

function expand(value, bindings) {
  return value.replace(/\{([A-Za-z][A-Za-z0-9]*)\}/g, (_, key) => String(bindings[key] ?? `{${key}}`));
}

function stableDigest(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value ?? null);
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
