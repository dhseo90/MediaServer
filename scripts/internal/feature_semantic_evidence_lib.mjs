// 파일 용도: feature row를 exact handler/route/action/state/assertion locator와 reviewer 승인으로 연결한다.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export const SEMANTIC_CLOSURE_SCHEMA =
  "media-server.feature-semantic-implementation-closure.v1";
export const SEMANTIC_REVIEW_STATUS = "semantic-reviewed";

const repositoryCache = new Map();
const semanticMatchCache = new Map();
const symbolTimelineCache = new Map();
const newlineOffsetCache = new Map();
const genericAnchors = new Set([
  "analysis", "condition", "event", "events", "metadata", "session", "client",
  "viewer", "runtime", "state", "status", "result", "response", "validation",
  "feature", "release", "current", "source", "route", "profile", "rule",
  "dashboard", "operator", "external", "health", "reference", "deterministic",
]);
const weakWords = new Set([
  "with", "from", "into", "only", "true", "false", "none", "default", "existing",
  "required", "selected", "current", "actual", "final", "pass", "fail", "not",
  "run", "media", "server", "source", "state", "status", "result", "route", "test",
]);

export function buildSemanticEvidence({ rootDir, row, legacyItem }) {
  const repository = repositoryFor(rootDir);
  const prefix = featurePrefix(row.id);
  const requiresProductUi = row.uiNeed !== "비대상" || splitAreas(row.area).includes("UI");
  const routeValue = semanticRoute(row, legacyItem);
  const sourceEntries = sourceEntriesFor(repository, prefix);
  const uiEntries = repository.entries.filter(([file]) =>
    /^src\/ingress\/(?:product_ui_|webrtc_http_server|http_auth)/.test(file));

  let handler = null;
  let route = null;
  if (routeValue) {
    const routeMatch = selectRouteMatch(routeValue, sourceEntries, legacyItem?.sourceEvidence?.file, true);
    if (routeMatch) {
      handler = locatorFromMatch(routeMatch);
      route = {
        applicability: "http-or-product-route",
        value: routeValue,
        dispatchAnchor: routeMatch.anchor,
        handlerFile: handler.file,
        handlerSymbol: handler.symbol,
        contextSha256: handler.contextSha256,
      };
    }
  }
  if (!handler) {
    const preferredFile = usableLegacyFile(legacyItem?.sourceEvidence?.file)
      ? legacyItem.sourceEvidence.file
      : usableLegacyFile(legacyItem?.verifierEvidence?.file)
        ? legacyItem.verifierEvidence.file
        : "";
    const preferredEntries = preferredFile
      ? sourceEntries.filter(([file]) => file === preferredFile)
      : [];
    const preferredLocator = preferredEntries.length > 0 ? selectSemanticLocator({
      row,
      entries: preferredEntries,
      preferredFile,
      legacyAnchor: legacyItem?.sourceEvidence?.anchor || legacyItem?.verifierEvidence?.anchor || "",
    }) : null;
    handler = (preferredLocator?.anchorStrength !== "shared-context" ? preferredLocator : null) || selectSemanticLocator({
      row,
      entries: sourceEntries,
      preferredFile,
      legacyAnchor: legacyItem?.sourceEvidence?.anchor || legacyItem?.verifierEvidence?.anchor || "",
    });
  }
  if (!handler) throw new Error(`${row.id} has no exact semantic handler locator`);

  if (!route) {
    route = {
      applicability: "not-applicable",
      value: null,
      reason: "non-route feature; exact owner symbol and state oracle are required instead",
    };
  }

  let actionHandler = handler;
  if (requiresProductUi) {
    const screenRoute = uiScreenRoute(row, legacyItem);
    const uiPreferred = preferredUiOwner(screenRoute, row) ||
      (featurePrefix(row.id) === "UI" && usableLegacyFile(legacyItem?.uiEvidence?.file)
        ? legacyItem.uiEvidence.file
        : handler.file);
    const uiRouteMatch = screenRoute
      ? selectRouteMatch(screenRoute, uiEntries, uiPreferred, false)
      : null;
    const preferredUiEntries = uiEntries.filter(([file]) => file === uiPreferred);
    actionHandler = (preferredUiEntries.length > 0 ? selectSemanticLocator({
          row,
          entries: preferredUiEntries,
          preferredFile: uiPreferred,
          legacyAnchor: featurePrefix(row.id) === "UI"
            ? legacyItem?.uiEvidence?.anchor || handler.anchor
            : "",
        }) : null) || (uiRouteMatch ? locatorFromMatch(uiRouteMatch) : null) || selectSemanticLocator({
          row,
          entries: uiEntries,
          preferredFile: uiPreferred,
          legacyAnchor: featurePrefix(row.id) === "UI"
            ? legacyItem?.uiEvidence?.anchor || handler.anchor
            : "",
        }) || handler;
  }

  const screenRoute = uiScreenRoute(row, legacyItem);
  const controlSelector = splitAreas(row.area).includes("UI")
    ? buildControlSelector(actionHandler, repository, screenRoute)
    : {
        applicability: "not-applicable",
        value: null,
        reason: "feature is outside the UI fulltest area",
      };

  const stateCandidate = selectSemanticLocator({
    row,
    entries: repository.entries.filter(([file]) => file === handler.file),
    preferredFile: handler.file,
    legacyAnchor: handler.anchor,
    excludedAnchors: new Set([handler.anchor]),
  });
  const stateLocator = stateCandidate?.symbol === handler.symbol ? stateCandidate : handler;
  const stateOracle = {
    oracleKind: oracleKind(row),
    expectedBehaviorSha256: sha256(normalize(`${row.feature}\n${row.pass}`)),
    expectedBehavior: normalize(row.pass),
    locator: stateLocator,
  };
  const relation = {
    kind: route.applicability === "http-or-product-route"
      ? "route-dispatch-handler-action-state"
      : prefix === "SAFE"
        ? "invariant-owner-assertion-state"
        : prefix === "OPS"
          ? "ops-gate-dispatch-assertion-state"
          : "handler-action-state",
    handlerSymbol: handler.symbol,
    actionSymbol: actionHandler.symbol,
    stateSymbol: stateLocator.symbol,
    semanticKey: `${row.id}:${sha256(normalize(`${row.feature}\n${row.pass}`)).slice(0, 24)}`,
  };

  const semanticEvidence = {
    schema: SEMANTIC_CLOSURE_SCHEMA,
    handler,
    route,
    controlSelector,
    actionHandler,
    stateOracle,
    relation,
    verifierAssertion: {
      file: "scripts/internal/feature_semantic_evidence_lib.mjs",
      symbol: "validateSemanticItem",
      assertionKind: "exact-locator-relation-and-review-digest",
      assertionAnchor: "validateSemanticItem",
      command: "verify-feature-implementation-evidence",
      assertedSemanticDigest: "",
    },
  };
  semanticEvidence.verifierAssertion.assertedSemanticDigest =
    semanticDigest(row, semanticEvidence);
  return semanticEvidence;
}

export function approveSemanticReview(items, { reviewer, reviewedOn, reason }) {
  if (!reviewer || !reviewedOn || !reason) {
    throw new Error("semantic review approval requires reviewer, reviewedOn, and reason");
  }
  return items.map(item => {
    const digest = semanticDigest(item, item.semanticEvidence);
    item.semanticEvidence.verifierAssertion.assertedSemanticDigest = digest;
    item.status = SEMANTIC_REVIEW_STATUS;
    item.review = {
      decision: "approved",
      reviewer,
      reviewedOn,
      reason,
      semanticDigest: digest,
    };
    return item;
  });
}

export function bindSemanticEvidence(item, semanticEvidence) {
  item.semanticEvidence = semanticEvidence;
  item.sourceEvidence = {
    file: semanticEvidence.handler.file,
    anchor: semanticEvidence.handler.anchor,
    anchorKind: "semantic-handler-token",
  };
  if (item.uiEvidence) {
    const controlLocator = semanticEvidence.controlSelector?.applicability === "product-control"
      ? semanticEvidence.controlSelector.locator
      : semanticEvidence.actionHandler;
    item.uiEvidence = {
      file: controlLocator.file,
      anchor: controlLocator.anchor,
      anchorKind: semanticEvidence.controlSelector?.applicability === "product-control"
        ? "exact-control-selector"
        : "semantic-action-handler",
      screenRoute: semanticEvidence.controlSelector?.screenRoute ||
        semanticEvidence.route?.value || item.uiEvidence.screenRoute,
    };
  }
  return item;
}

export function semanticDigest(row, semanticEvidence) {
  const canonical = structuredClone(semanticEvidence || {});
  if (canonical.verifierAssertion) {
    delete canonical.verifierAssertion.assertedSemanticDigest;
  }
  return sha256(JSON.stringify({
    id: row.id,
    feature: row.feature,
    uiNeed: row.uiNeed,
    testNeed: row.testNeed,
    testAreas: Array.isArray(row.testAreas) ? row.testAreas : splitAreas(row.area),
    semanticEvidence: canonical,
  }));
}

export function validateSemanticItem({ rootDir, row, item }) {
  const errors = [];
  const evidence = item?.semanticEvidence;
  if (evidence?.schema !== SEMANTIC_CLOSURE_SCHEMA) {
    errors.push(`${row.id} semantic evidence schema drift`);
    return errors;
  }
  if (item.status !== SEMANTIC_REVIEW_STATUS) {
    errors.push(`${row.id} status must be ${SEMANTIC_REVIEW_STATUS}`);
  }
  if (item.review?.decision !== "approved") {
    errors.push(`${row.id} semantic review is not approved`);
  }

  validateLocator(rootDir, row.id, "handler", evidence.handler, errors);
  validateLocator(rootDir, row.id, "actionHandler", evidence.actionHandler, errors);
  validateLocator(rootDir, row.id, "stateOracle", evidence.stateOracle?.locator, errors);

  const expectedBehaviorSha = sha256(normalize(`${row.feature}\n${row.pass}`));
  if (evidence.stateOracle?.expectedBehaviorSha256 !== expectedBehaviorSha) {
    errors.push(`${row.id} state oracle behavior drift`);
  }
  if (evidence.stateOracle?.expectedBehavior !== normalize(row.pass)) {
    errors.push(`${row.id} state oracle contract text drift`);
  }

  const expectedRoute = semanticRoute(row, item);
  if (expectedRoute) {
    if (evidence.route?.applicability !== "http-or-product-route" ||
        evidence.route?.value !== expectedRoute) {
      errors.push(`${row.id} route drift`);
    } else {
      const handlerText = readText(rootDir, evidence.route.handlerFile, errors, `${row.id} route`);
      if (handlerText !== null && !handlerText.includes(evidence.route.dispatchAnchor)) {
        errors.push(`${row.id} route dispatch anchor missing`);
      }
      if (evidence.route.handlerSymbol !== evidence.handler.symbol) {
        errors.push(`${row.id} route handler relation drift`);
      }
      if (evidence.route.dispatchAnchor !== evidence.handler.anchor ||
          evidence.route.contextSha256 !== evidence.handler.contextSha256) {
        errors.push(`${row.id} route dispatch locator drift`);
      }
    }
  } else if (evidence.route?.applicability !== "not-applicable") {
    errors.push(`${row.id} non-route feature invented route evidence`);
  }

  validateControlSelector(rootDir, row, evidence.controlSelector, errors);
  if (evidence.relation?.handlerSymbol !== evidence.handler?.symbol ||
      evidence.relation?.actionSymbol !== evidence.actionHandler?.symbol ||
      evidence.relation?.stateSymbol !== evidence.stateOracle?.locator?.symbol) {
    errors.push(`${row.id} handler/action/state relation drift`);
  }
  const expectedKey = `${row.id}:${expectedBehaviorSha.slice(0, 24)}`;
  if (evidence.relation?.semanticKey !== expectedKey) {
    errors.push(`${row.id} semantic relation key drift`);
  }

  const assertion = evidence.verifierAssertion || {};
  if (assertion.file !== "scripts/internal/feature_semantic_evidence_lib.mjs" ||
      assertion.symbol !== "validateSemanticItem" ||
      assertion.assertionAnchor !== "validateSemanticItem" ||
      assertion.assertionAnchor === row.id ||
      assertion.assertionKind !== "exact-locator-relation-and-review-digest" ||
      assertion.command !== "verify-feature-implementation-evidence") {
    errors.push(`${row.id} verifier assertion must validate semantics, not an ID string`);
  }
  const assertionSource = readText(rootDir, assertion.file, errors, `${row.id} verifier assertion`);
  if (assertionSource !== null && !assertionSource.includes("export function validateSemanticItem")) {
    errors.push(`${row.id} semantic verifier assertion symbol missing`);
  }

  const digest = semanticDigest(row, evidence);
  if (assertion.assertedSemanticDigest !== digest || item.review?.semanticDigest !== digest) {
    errors.push(`${row.id} semantic review digest drift`);
  }
  return errors;
}

export function summarizeSemanticClosure({ rows, manifest }) {
  const items = Array.isArray(manifest?.items) ? manifest.items : [];
  return {
    inventoryRows: rows.length,
    semanticReviewedRows: items.filter(item =>
      item.status === SEMANTIC_REVIEW_STATUS && item.review?.decision === "approved").length,
    uniqueSemanticDigests: new Set(items.map(item => item.review?.semanticDigest).filter(Boolean)).size,
  };
}

export function runSemanticClosureContract({ rootDir, rows, manifest }) {
  const rowById = new Map(rows.map(row => [row.id, row]));
  const itemById = new Map((manifest.items || []).map(item => [item.id, item]));
  const base = itemById.get("UI-002");
  const cases = [];
  const summary = summarizeSemanticClosure({ rows, manifest });
  cases.push(resultCase(
    "all-986-reviewed-semantic-closures",
    summary.semanticReviewedRows === rows.length && summary.uniqueSemanticDigests === rows.length,
    `reviewed=${summary.semanticReviewedRows} unique=${summary.uniqueSemanticDigests}`,
  ));
  cases.push(resultCase(
    "ui-002-exact-setup-handler",
    base?.semanticEvidence?.route?.value === "/setup" &&
      base?.semanticEvidence?.handler?.anchor.includes("/setup") &&
      !base?.semanticEvidence?.handler?.anchor.includes("/password"),
    base?.semanticEvidence?.handler?.anchor || "missing",
  ));
  if (!base) return cases;

  const negatives = [
    ["wrong-handler-symbol-negative", copy => { copy.semanticEvidence.handler.symbol = "WrongHandler"; }, "handler symbol drift"],
    ["same-file-unrelated-anchor-negative", copy => { copy.semanticEvidence.handler.anchor = "/password"; }, "handler"],
    ["route-drift-negative", copy => { copy.semanticEvidence.route.value = "/password"; }, "route drift"],
    ["action-drift-negative", copy => { copy.semanticEvidence.actionHandler.symbol = "WrongAction"; }, "actionHandler symbol drift"],
    ["state-drift-negative", copy => { copy.semanticEvidence.stateOracle.expectedBehaviorSha256 = "0".repeat(64); }, "state oracle behavior drift"],
    ["generic-anchor-alone-negative", copy => {
      copy.semanticEvidence.handler.anchor = "analysis";
      copy.semanticEvidence.handler.anchorStrength = "generic-alone";
    }, "generic anchor cannot stand alone"],
    ["id-only-verifier-negative", copy => { copy.semanticEvidence.verifierAssertion.assertionAnchor = copy.id; }, "not an ID string"],
    ["unapproved-review-negative", copy => { copy.review.decision = "pending"; }, "not approved"],
  ];
  for (const [name, mutate, expected] of negatives) {
    const copy = structuredClone(base);
    mutate(copy);
    const errors = validateSemanticItem({ rootDir, row: rowById.get(copy.id), item: copy });
    cases.push(resultCase(name, errors.some(error => error.includes(expected)), errors.join("; ")));
  }
  return cases;
}

function selectSemanticLocator({ row, entries, preferredFile, legacyAnchor, excludedAnchors = new Set() }) {
  const tokens = semanticTokens(row, legacyAnchor).filter(token => !excludedAnchors.has(token.value));
  const matches = [];
  for (const token of tokens) {
    const entryKey = `${entries.length}:${entries[0]?.[0] || ""}:${entries.at(-1)?.[0] || ""}`;
    const cacheKey = `${entryKey}:${token.value}`;
    let available = semanticMatchCache.get(cacheKey);
    if (!available) {
      available = entries.map(([file, text]) => ({
        file,
        text,
        index: bestExactIndex(text, token.value),
      })).filter(item => item.index >= 0);
      semanticMatchCache.set(cacheKey, available);
    }
    const fileCount = available.length;
    for (const { file, text, index } of available) {
      matches.push({
        file,
        text,
        anchor: token.value,
        index,
        anchorKind: token.kind,
        anchorStrength: genericAnchors.has(token.value.toLowerCase()) ? "shared-context" : "exact-semantic-token",
        score: token.score + ownerScore(featurePrefix(row.id), file) +
          (file === preferredFile ? 260 : 0) + Math.max(0, 220 - fileCount * 18) +
          Math.min(token.value.length * 3, 240),
      });
    }
  }
  matches.sort((a, b) => b.score - a.score || a.file.localeCompare(b.file) || a.index - b.index);
  for (const match of matches.slice(0, 12)) {
    match.index = bestRowSemanticIndex(match.text, match.anchor, row, match.file, match.index);
  }
  return matches.length > 0 ? locatorFromMatch(matches[0]) : null;
}

function selectRouteMatch(routeValue, entries, preferredFile = "", preferDispatch = true) {
  const sourceValues = routeSourceValues(routeValue);
  const matches = [];
  for (const value of sourceValues) {
    for (const [file, text] of entries) {
      const quoted = [`"${value}"`, `'${value}'`, `\`${value}\``];
      let index = -1;
      let anchor = "";
      if (preferDispatch) {
        for (const candidate of [
          `request.path == "${value}"`,
          `request.path == '${value}'`,
          `path == "${value}"`,
          `request.path.rfind("${value}"`,
        ]) {
          const dispatchIndex = text.indexOf(candidate);
          if (dispatchIndex >= 0) {
            index = dispatchIndex + candidate.indexOf(value);
            anchor = value;
            break;
          }
        }
      }
      for (const candidate of index >= 0 ? [] : quoted) {
        index = text.indexOf(candidate);
        if (index >= 0) { anchor = value; index += 1; break; }
      }
      if (index < 0 && value !== "/") {
        index = text.indexOf(value);
        anchor = value;
      }
      if (index < 0) continue;
      matches.push({
        file,
        text,
        anchor,
        index,
        anchorKind: "exact-route",
        anchorStrength: "exact-route-dispatch",
        score: ownerScore("UI", file) + (file === preferredFile ? 300 : 0) + value.length * 8 +
          (preferDispatch && file === "src/ingress/webrtc_http_server.cpp" ? 720 : 0) +
          (!preferDispatch && file.startsWith("src/ingress/product_ui_") ? 420 : 0),
      });
    }
  }
  matches.sort((a, b) => b.score - a.score || a.file.localeCompare(b.file) || a.index - b.index);
  return matches[0] || null;
}

function locatorFromMatch(match) {
  const before = match.text.slice(0, match.index);
  const line = before.split(/\r?\n/).length;
  const occurrence = occurrenceNumber(match.text, match.anchor, match.index);
  const context = contextAtLine(match.text, line);
  return {
    file: match.file,
    symbol: deriveSymbol(match.text, line, match.file, match.anchorKind),
    symbolKind: symbolKind(match.text, line),
    anchor: match.anchor,
    anchorKind: match.anchorKind,
    anchorStrength: match.anchorStrength,
    occurrence,
    line,
    contextSha256: sha256(context),
  };
}

function buildControlSelector(actionHandler, repository, screenRoute) {
  const text = repository.textByFile.get(actionHandler.file) || "";
  const anchorIndex = nthIndex(text, actionHandler.anchor, actionHandler.occurrence);
  const start = Math.max(0, anchorIndex - 2400);
  const end = Math.min(text.length, anchorIndex + actionHandler.anchor.length + 2400);
  const window = text.slice(start, end);
  const candidates = [];
  for (const pattern of [
    /data-testid=["']([^"']+)["']/g,
    /\bid=["']([^"']+)["']/g,
    /getElementById\(["']([^"']+)["']\)/g,
  ]) {
    for (const match of window.matchAll(pattern)) {
      if (pattern.source.startsWith("\\bid=") && !/^[A-Za-z_][\w:-]*$/.test(match[1])) continue;
      candidates.push({
        id: match[1],
        index: start + (match.index || 0),
        kind: pattern.source.startsWith("data-testid") ? "data-testid" : "id",
      });
    }
  }
  candidates.sort((a, b) => Math.abs(a.index - anchorIndex) - Math.abs(b.index - anchorIndex));
  const selected = candidates[0];
  if (!selected) {
    return {
      applicability: "not-applicable",
      value: null,
      reason: "route/read-only state has no dedicated control selector in the owner block",
      screenRoute: screenRoute || null,
    };
  }
  const sourceAnchor = selected.id;
  const match = {
    file: actionHandler.file,
    text,
    anchor: sourceAnchor,
    index: text.indexOf(sourceAnchor, Math.max(0, selected.index - 32)),
    anchorKind: selected.kind,
    anchorStrength: "exact-control-selector",
  };
  return {
    applicability: "product-control",
    value: selected.kind === "data-testid"
      ? `[data-testid="${selected.id}"]`
      : `#${selected.id}`,
    screenRoute: screenRoute || null,
    locator: locatorFromMatch(match),
  };
}

function validateLocator(rootDir, id, label, locator, errors) {
  if (!locator || typeof locator !== "object") {
    errors.push(`${id} ${label} locator missing`);
    return;
  }
  const text = readText(rootDir, locator.file, errors, `${id} ${label}`);
  if (text === null) return;
  if (genericAnchors.has(String(locator.anchor).toLowerCase()) &&
      locator.anchorStrength === "generic-alone") {
    errors.push(`${id} ${label} generic anchor cannot stand alone`);
  }
  const index = nthIndex(text, locator.anchor, locator.occurrence);
  if (index < 0) {
    errors.push(`${id} ${label} exact anchor occurrence missing`);
    return;
  }
  const line = text.slice(0, index).split(/\r?\n/).length;
  if (line !== locator.line) errors.push(`${id} ${label} line drift`);
  if (sha256(contextAtLine(text, line)) !== locator.contextSha256) {
    errors.push(`${id} ${label} context drift`);
  }
  const symbol = deriveSymbol(text, line, locator.file, locator.anchorKind);
  if (symbol !== locator.symbol) errors.push(`${id} ${label} symbol drift`);
}

function validateControlSelector(rootDir, row, control, errors) {
  const uiRequired = splitAreas(row.area).includes("UI");
  if (!uiRequired) {
    if (control?.applicability !== "not-applicable") {
      errors.push(`${row.id} non-UI feature invented control selector`);
    }
    return;
  }
  if (control?.applicability === "not-applicable") {
    if (!control.reason || !Object.hasOwn(control, "screenRoute")) {
      errors.push(`${row.id} control selector N/A reason missing`);
    }
    return;
  }
  if (control?.applicability !== "product-control" || !control.value) {
    errors.push(`${row.id} control selector shape invalid`);
    return;
  }
  validateLocator(rootDir, row.id, "controlSelector", control.locator, errors);
  if (!/^#[A-Za-z_][\w:-]*$/.test(control.value) &&
      !/^\[data-testid="[^"]+"\]$/.test(control.value)) {
    errors.push(`${row.id} control selector is not exact`);
  }
}

function repositoryFor(rootDir) {
  if (repositoryCache.has(rootDir)) return repositoryCache.get(rootDir);
  const trackedFiles = execFileSync("git", ["ls-files"], {
    cwd: rootDir,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }).trim().split("\n").filter(Boolean);
  const tracked = new Set(trackedFiles);
  const textByFile = new Map();
  for (const file of trackedFiles) {
    if (/\.(?:png|jpe?g|gif|mp4|mov|zip|gz|pdf|woff2?|ttf|dylib|so|a|o)$/i.test(file)) continue;
    try { textByFile.set(file, fs.readFileSync(path.join(rootDir, file), "utf8")); } catch { /* binary */ }
  }
  const repository = { tracked, textByFile, entries: [...textByFile.entries()] };
  repositoryCache.set(rootDir, repository);
  return repository;
}

function sourceEntriesFor(repository, prefix) {
  return repository.entries.filter(([file]) => {
    if (file === "test/fixtures/project_feature_implementation_evidence.json") return false;
    if (/^(SAFE|OPS)$/.test(prefix)) {
      return /^(?:src|include|config|scripts\/internal|test\/fixtures)\//.test(file) &&
        !/feature_(?:implementation|semantic)_evidence/.test(file);
    }
    return /^(?:src|include|config)\//.test(file);
  });
}

function semanticTokens(row, legacyAnchor) {
  const text = `${row.feature} ${row.pass}`;
  const tokens = [];
  for (const match of text.matchAll(/`([^`]+)`/g)) {
    const value = normalize(match[1]);
    if (usefulToken(value)) tokens.push({ value, kind: "reviewed-code-span", score: 1100 });
  }
  for (const match of text.matchAll(/media-server\.[A-Za-z0-9_.-]+/g)) {
    if (usefulToken(match[0])) tokens.push({ value: match[0], kind: "schema", score: 1000 });
  }
  for (const match of text.matchAll(/[A-Za-z_][A-Za-z0-9_:-]{3,}/g)) {
    if (usefulToken(match[0])) tokens.push({ value: match[0], kind: "identifier", score: 500 });
  }
  if (usefulToken(legacyAnchor)) {
    tokens.push({ value: legacyAnchor, kind: "legacy-review-seed", score: 180 });
  }
  return [...new Map(tokens.map(token => [token.value, token])).values()];
}

function semanticRoute(row, legacyItem) {
  if (featurePrefix(row.id) === "UI" && legacyItem?.uiEvidence?.screenRoute) {
    return legacyItem.uiEvidence.screenRoute;
  }
  const text = `${row.feature} ${row.pass}`;
  const routes = [...text.matchAll(/`(\/(?:ops|client|lab|setup|login|logout|password|invite|webrtc|ws|auth)[^`\s,]*)`/g)]
    .map(match => match[1]);
  return routes[0] || null;
}

function uiScreenRoute(row, legacyItem) {
  if (row.uiNeed === "비대상" && !splitAreas(row.area).includes("UI")) return null;
  const explicit = semanticRoute(row, legacyItem);
  if (explicit) return explicit;
  const prefix = featurePrefix(row.id);
  const text = `${row.feature} ${row.pass}`.toLowerCase();
  if (prefix === "AUTH") {
    if (/invite|초대/.test(text)) return "/invite/setup";
    if (/password change|비밀번호 변경/.test(text)) return "/password/change";
    if (/setup|최초 관리자/.test(text)) return "/setup";
    if (/user|사용자|role|scope/.test(text)) return "/ops/users";
    return "/login";
  }
  if (prefix === "SRC") return "/ops/sources";
  if (prefix === "RULE") return "/ops/rules";
  if (prefix === "EVT") return /dashboard|runtime|health/.test(text) ? "/ops/dashboard" : "/ops/events";
  if (prefix === "CLIENT") {
    if (/dashboard/.test(text)) return "/client/dashboard";
    if (/event/.test(text)) return "/client/events";
    return "/client/live";
  }
  if (prefix === "MEDIA") return /source|channel|ingress|rtsp/.test(text) ? "/ops/sources" : "/client/live";
  if (prefix === "LAB") {
    if (/vlm|model|prompt|provider/.test(text)) return "/ops/vlm";
    if (/rule|profile|scenario|tracker|re-id/.test(text)) return "/ops/rules";
    if (/event|incident|evidence/.test(text)) return "/ops/events";
    return "/ops/dashboard";
  }
  if (prefix === "SAFE") return "/ops";
  return legacyItem?.uiEvidence?.screenRoute || null;
}

function preferredUiOwner(screenRoute, row) {
  if (!screenRoute) return "";
  if (/^\/(?:setup|login|logout|password|invite)/.test(screenRoute)) {
    return "src/ingress/product_ui_auth_pages.cpp";
  }
  if (screenRoute === "/ops/sources") return "src/ingress/product_ui_ops_sources_script.cpp";
  if (screenRoute.startsWith("/client")) return "src/ingress/product_ui_client_scripts.cpp";
  if (screenRoute === "/ops/users") return "src/ingress/product_ui_ops_users_script.cpp";
  if (/^\/ops\/(?:rules|events|dashboard|vlm)/.test(screenRoute)) {
    return "src/ingress/product_ui_page_scripts.cpp";
  }
  return featurePrefix(row.id) === "UI" ? "src/ingress/product_ui_js.cpp" : "";
}

function routeSourceValues(value) {
  if (value === "/") return ["/"];
  const brace = value.indexOf("{");
  const query = value.indexOf("?");
  const cut = [brace, query].filter(index => index > 0).sort((a, b) => a - b)[0];
  const base = cut ? value.slice(0, cut) : value;
  return [...new Set([value, base].filter(item => item.length > 1))];
}

function usefulToken(value) {
  const normalized = normalize(value);
  if (normalized.length < 3 || normalized.length > 220) return false;
  if (normalized.startsWith("verify-")) return false;
  if (/^v\d/i.test(normalized) || /^\d+$/.test(normalized)) return false;
  if (weakWords.has(normalized.toLowerCase())) return false;
  return true;
}

function containsExact(text, token) {
  return exactIndex(text, token) >= 0;
}

function exactIndex(text, token) {
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(token)) {
    const pattern = new RegExp(`(?:^|[^A-Za-z0-9_])(${escapeRegExp(token)})(?=$|[^A-Za-z0-9_])`);
    const match = pattern.exec(text);
    return match ? match.index + match[0].indexOf(match[1]) : -1;
  }
  return text.indexOf(token);
}

function bestExactIndex(text, token) {
  let cursor = 0;
  while (cursor < text.length) {
    const relative = exactIndex(text.slice(cursor), token);
    if (relative < 0) break;
    const index = cursor + relative;
    const lineStart = text.lastIndexOf("\n", index - 1) + 1;
    const lineEnd = text.indexOf("\n", index);
    const line = text.slice(lineStart, lineEnd < 0 ? text.length : lineEnd).trim();
    if (!/^(?:\/\/|\/\*|\*|#include|#pragma)/.test(line)) return index;
    cursor = index + Math.max(token.length, 1);
  }
  return -1;
}

function bestRowSemanticIndex(text, token, row, file, fallback) {
  const words = [...`${row.feature} ${row.pass}`.matchAll(/[A-Za-z_][A-Za-z0-9_:-]{3,}/g)]
    .map(match => match[0].toLowerCase())
    .filter(word => !weakWords.has(word) && !word.startsWith("verify-"));
  const actionPatterns = [];
  const contract = `${row.feature} ${row.pass}`;
  if (/생성|등록|추가|create|insert/i.test(contract)) actionPatterns.push(/create|add|insert|append|upsert/i);
  if (/수정|변경|저장|update|save|apply/i.test(contract)) actionPatterns.push(/update|save|apply|upsert|set/i);
  if (/삭제|delete|remove/i.test(contract)) actionPatterns.push(/delete|remove|erase/i);
  if (/조회|목록|상세|read|list|get|find/i.test(contract)) actionPatterns.push(/get|list|find|read|load|build|json/i);

  let best = { index: fallback, score: -1 };
  let cursor = 0;
  let inspected = 0;
  while (cursor < text.length && inspected < 96) {
    const index = text.indexOf(token, cursor);
    if (index < 0) break;
    inspected += 1;
    cursor = index + Math.max(token.length, 1);
    const line = lineNumberAt(text, index, file);
    const lineStart = text.lastIndexOf("\n", index - 1) + 1;
    const lineEnd = text.indexOf("\n", index);
    const sourceLine = text.slice(lineStart, lineEnd < 0 ? text.length : lineEnd).trim();
    if (/^(?:\/\/|\/\*|\*|#include|#pragma)/.test(sourceLine)) continue;
    const symbol = deriveSymbol(text, line, file, "semantic-token");
    const lowered = symbol.toLowerCase();
    const context = text.slice(Math.max(0, index - 600), Math.min(text.length, index + token.length + 600)).toLowerCase();
    let score = words.reduce((sum, word) => sum + (lowered.includes(word) ? 70 : context.includes(word) ? 8 : 0), 0);
    score += actionPatterns.reduce((sum, pattern) => sum + (pattern.test(symbol) ? 180 : 0), 0);
    if (!symbol.startsWith("file-scope:")) score += 45;
    if (score > best.score) best = { index, score };
  }
  return best.index;
}

function deriveSymbol(text, lineNumber, file, anchorKind = "") {
  const lines = text.split(/\r?\n/);
  if (file === "src/ingress/webrtc_http_server.cpp" && anchorKind === "exact-route") {
    const before = lines.slice(0, lineNumber).join("\n");
    if (before.lastIndexOf("WebRtcHttpServer::Start") >= 0) return "WebRtcHttpServer::Start";
  }
  const cacheKey = `${file}:${anchorKind === "exact-route" ? "route" : "default"}`;
  let timeline = symbolTimelineCache.get(cacheKey);
  if (!timeline) {
    let className = "";
    let candidate = "";
    timeline = [];
    for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    const classMatch = line.match(/\b(?:class|struct)\s+([A-Za-z_][A-Za-z0-9_]*)/);
    if (classMatch) className = classMatch[1];
    const checkMatch = line.match(/\bcheck\(["'`]([^"'`]+)/);
    if (checkMatch) candidate = `check:${checkMatch[1]}`;
    const shellMatch = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\(\)\s*\{/);
    if (shellMatch) candidate = shellMatch[1];
    const cppMatch = line.match(/^(?:(?:static|inline|constexpr|virtual|explicit)\s+)*(?:[A-Za-z_][A-Za-z0-9_:<>,*&]*\s+)+([A-Za-z_~][A-Za-z0-9_:~]*)\s*\([^;{}]*\)\s*(?:const\s*)?(?:noexcept\s*)?\{/);
    if (cppMatch) candidate = cppMatch[1];
    if (!(anchorKind === "exact-route" && file.startsWith("src/ingress/product_ui_"))) {
      const jsMatch = line.match(/\bfunction\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/);
      if (jsMatch) candidate = jsMatch[1];
      const arrowMatch = line.match(/\b(?:const|let|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=.*=>/);
      if (arrowMatch) candidate = arrowMatch[1];
    }
      timeline.push(candidate || (className ? `${className}::file-scope` : `file-scope:${path.basename(file)}:L${index + 1}`));
    }
    symbolTimelineCache.set(cacheKey, timeline);
  }
  const candidate = timeline[Math.max(0, Math.min(lineNumber - 1, timeline.length - 1))];
  if (candidate && !candidate.startsWith("file-scope:") && !candidate.endsWith("::file-scope")) return candidate;
  const current = lines[Math.max(0, lineNumber - 1)] || "";
  const member = current.match(/([A-Za-z_][A-Za-z0-9_]*)\s*(?:\(|[;=])/);
  if (member) return member[1];
  return candidate || `file-scope:${path.basename(file)}:L${lineNumber}`;
}

function lineNumberAt(text, index, file) {
  let offsets = newlineOffsetCache.get(file);
  if (!offsets) {
    offsets = [];
    for (let cursor = text.indexOf("\n"); cursor >= 0; cursor = text.indexOf("\n", cursor + 1)) {
      offsets.push(cursor);
    }
    newlineOffsetCache.set(file, offsets);
  }
  let low = 0;
  let high = offsets.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (offsets[mid] < index) low = mid + 1;
    else high = mid;
  }
  return low + 1;
}

function symbolKind(text, lineNumber) {
  const line = text.split(/\r?\n/)[Math.max(0, lineNumber - 1)] || "";
  if (/\bfunction\b|=>/.test(line)) return "javascript-function";
  if (/\bcheck\(/.test(line)) return "verifier-check";
  if (/\(\)\s*\{/.test(line)) return "shell-function";
  if (/\([^;]*\)/.test(line)) return "function-or-method";
  return "declaration-or-file-scope";
}

function contextAtLine(text, lineNumber) {
  const lines = text.split(/\r?\n/);
  const start = Math.max(0, lineNumber - 2);
  return lines.slice(start, Math.min(lines.length, lineNumber + 1)).join("\n");
}

function occurrenceNumber(text, anchor, index) {
  let count = 0;
  let cursor = 0;
  while (cursor < index) {
    const found = text.indexOf(anchor, cursor);
    if (found < 0 || found >= index) break;
    count += 1;
    cursor = found + Math.max(anchor.length, 1);
  }
  return count;
}

function nthIndex(text, anchor, occurrence) {
  if (!anchor || !Number.isInteger(occurrence) || occurrence < 0) return -1;
  let cursor = 0;
  for (let index = 0; index <= occurrence; index += 1) {
    const found = text.indexOf(anchor, cursor);
    if (found < 0) return -1;
    if (index === occurrence) return found;
    cursor = found + Math.max(anchor.length, 1);
  }
  return -1;
}

function ownerScore(prefix, file) {
  const rules = {
    UI: [/product_ui_/, /webrtc_http_server/, /http_auth/],
    AUTH: [/http_auth/, /product_ui_auth/, /webrtc_http_server/],
    SRC: [/source_view_registry/, /source_factory/, /onvif/, /ops_sources/, /webrtc_http_server/],
    RULE: [/event_rule_engine/, /scenario/, /analysis_query/, /product_ui_/, /webrtc_http_server/],
    EVT: [/event_manager/, /event_storage/, /ops_event_route_owner/, /webrtc_http_server/],
    CLIENT: [/product_ui_client/, /webrtc_http_server/, /session_manager/],
    MEDIA: [/rtsp/, /webrtc/, /session_manager/, /stream_registry/, /source_factory/],
    LAB: [/analysis/, /vlm/, /webrtc_http_server/],
    SAFE: [/webrtc_http_server/, /http_auth/, /verify_/],
    OPS: [/webrtc_http_server/, /verify_/, /release/, /readiness/, /evidence/],
  };
  const index = (rules[prefix] || []).findIndex(pattern => pattern.test(file));
  return index < 0 ? 0 : 520 - index * 55;
}

function oracleKind(row) {
  const text = `${row.feature} ${row.pass}`;
  if (/삭제|delete|remove/i.test(text)) return "delete-no-stale-state";
  if (/생성|create|등록|추가/i.test(text)) return "create-readback-state";
  if (/수정|update|변경|save|저장|apply/i.test(text)) return "update-transition-readback";
  if (/금지|거부|차단|no-|false|불변|유지/i.test(text)) return "negative-invariant-state";
  return "read-or-rendered-state";
}

function readText(rootDir, relative, errors, label) {
  if (!relative || path.isAbsolute(relative) || relative.includes("..")) {
    errors.push(`${label} file path invalid`);
    return null;
  }
  const target = path.join(rootDir, relative);
  if (!fs.existsSync(target)) {
    errors.push(`${label} file missing: ${relative}`);
    return null;
  }
  try { return fs.readFileSync(target, "utf8"); }
  catch { errors.push(`${label} file unreadable: ${relative}`); return null; }
}

function usableLegacyFile(file) {
  return typeof file === "string" && file.length > 0 &&
    file !== "test/fixtures/project_feature_implementation_evidence.json" &&
    !/feature_(?:implementation|semantic)_evidence/.test(file);
}

function featurePrefix(id) { return id.replace(/-\d+$/, ""); }
function splitAreas(value) { return String(value || "").split(",").map(item => item.trim()).filter(Boolean); }
function normalize(value) { return String(value || "").trim().replace(/\s+/g, " "); }
function sha256(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function escapeRegExp(value) { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
function resultCase(name, pass, detail) { return { name, pass, detail: pass ? "" : detail }; }
