#!/usr/bin/env node
// 파일 용도: 391 action request envelope와 page background ledger 분리 계약을 검증한다.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertZeroActionCorrelationLeaks,
  buildCanonicalActionRequestCensus,
  classifyPageOwnedRequest,
  createActionRequestEnvelopeLedger,
  normalizeActionRequestEnvelope,
} from "./v390_ui_action_request_ledger.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const readJson = relative => JSON.parse(fs.readFileSync(path.join(rootDir, relative), "utf8"));
const manifest = readJson("test/fixtures/v390_ui_native_exact_cases.json");
const red = readJson("test/fixtures/v390_action_request_background_ledger_red_20260810.json");
const checks = [];
const check = (name, fn) => { fn(); checks.push(name); };
const reject = (fn, pattern) => {
  let error = null;
  try { fn(); } catch (caught) { error = caught; }
  assert(error instanceof Error && pattern.test(error.message),
    `expected rejection ${pattern}: ${error?.message || "none"}`);
};

check("latest actual UI-010 RED is SHA-bound and preserves exact primary evidence", () => {
  assert(red.sourceCommitSha === "a470638ed64987cace31c9a00cdda7f9d1f4000d" &&
    red.sourceBranch === "v3.9.0" && red.sourceWorktreeClean === true,
  "latest action/background RED source drift");
  assert(JSON.stringify(red.coverage) === JSON.stringify({
    target: 424, attempted: 9, pass: 8, fail: 1, notRun: 415, unsupported: 0,
  }), "latest action/background RED coverage drift");
  assert(red.firstFailure.caseId === "UI-010" &&
    red.firstFailure.declaredRequest.requestCandidates === 1 &&
    red.firstFailure.declaredRequest.responseCandidates === 1 &&
    red.firstFailure.declaredRequest.correlationPass === true &&
    red.firstFailure.leakedBackgroundRequests.requestCount === 7 &&
    red.firstFailure.leakedBackgroundRequests.responseCount === 7,
  "latest action/background RED failure shape drift");
  for (const artifact of Object.values(red.artifacts)) {
    assert(/^[0-9a-f]{64}$/.test(artifact.sha256), "RED artifact digest invalid");
    const absolute = path.join(rootDir, artifact.path);
    if (fs.existsSync(absolute)) {
      assert(crypto.createHash("sha256").update(fs.readFileSync(absolute)).digest("hex") ===
        artifact.sha256, `RED artifact hash drift: ${artifact.path}`);
    }
  }
});

check("canonical 391 request completions are exhaustively classified", () => {
  const census = buildCanonicalActionRequestCensus(manifest);
  assert(census.canonicalRequestActionCount === 391, "canonical request census drift");
  assert(JSON.stringify(census.methodCounts) === JSON.stringify({
    DELETE: 6, GET: 268, POST: 25, PUT: 92,
  }), "canonical request method census drift");
  assert(JSON.stringify(census.endpointShapeCounts) === JSON.stringify({
    "literal-exact": 281, "template-materialized": 110,
  }), "canonical endpoint materialization census drift");
  assert(JSON.stringify(census.requestTransportCounts) === JSON.stringify({
    "document-form": 11, "exact-api-fetch": 380,
  }), "canonical request transport census drift");
  assert(census.uniqueTemplateCount === 47 &&
    census.uniqueMaterializedPathCount === 142 &&
    census.duplicateActionIdCount === 0 &&
    census.duplicateCorrelationIdCount === 0,
  "canonical request identity census drift");
  assert(census.rows.every(row => row.expectedRequestCount === 1 &&
    row.expectedResponseCount === 1 && row.phase === "primary-action" &&
    row.requestOwnershipKind === "primary-action" && row.correlationId),
  "canonical request envelope scope/cardinality drift");
});

check("exact initiating object owns one request while concurrent polling remains page-owned", () => {
  const envelope = normalizeActionRequestEnvelope({
    method: "GET",
    urlPath: "/ops/dashboard",
    allowedStatuses: [200],
    correlationSource: "request-header",
  }, {
    caseId: "CENSUS-SYNTHETIC",
    phase: "primary-action",
    actionId: "CENSUS-SYNTHETIC:primary",
    correlationId: "CENSUS-SYNTHETIC:correlation",
  });
  const ledger = createActionRequestEnvelopeLedger(envelope);
  const primary = {};
  ledger.claim(primary, {
    method: "GET", target: "/ops/dashboard", requestKind: "application-fetch",
    registrationKind: "explicit-inner-request",
  });
  ledger.bindRequestIdentity(primary, {
    requestId: "request-52", caseRequestIdentity: "CENSUS-SYNTHETIC:request-52",
    caseRequestSequence: 52,
  });
  ledger.bindResponse(primary, {
    method: "GET", target: "/ops/dashboard", status: 200,
    requestId: "request-52", caseRequestIdentity: "CENSUS-SYNTHETIC:request-52",
    caseRequestSequence: 52, responseRequestObjectObserved: true,
  });
  const pageEntries = [
    "/ops/api/site-operations/export-handoff-bundle",
    "/ops/api/site-operations/client-notice-by-site-view-group",
    "/ops/api/site-operations/source-registry-projection",
    "/ops/api/site-operations/health-rollup",
    "/ops/api/site-operations/impact-graph",
    "/ops/api/site-operations/runbook-instance-ledger",
    "/ops/api/site-operations/approval-ticket-workflow",
  ].map(target => ({
    ...classifyPageOwnedRequest({ initialSettlingComplete: true,
      resourceType: "fetch", requestKind: "application-fetch" }),
    target,
  }));
  const evidence = ledger.close();
  assert(evidence.requestCount === 1 && evidence.responseCount === 1,
    "exact primary envelope did not remain 1/1");
  const leak = assertZeroActionCorrelationLeaks(pageEntries, {
    actionId: envelope.actionId,
    correlationId: envelope.correlationId,
  });
  assert(leak.pageOwnedEntryCount === 7 && leak.actionCorrelationLeakCount === 0,
    "concurrent polling page ledger separation drift");
});

check("same-endpoint background and all malformed ledgers fail closed", () => {
  const make = () => createActionRequestEnvelopeLedger(normalizeActionRequestEnvelope({
    method: "GET", urlPath: "/ops/dashboard", allowedStatuses: [200],
  }, {
    caseId: "SYNTHETIC", phase: "primary-action",
    actionId: "SYNTHETIC:action", correlationId: "SYNTHETIC:correlation",
  }));
  reject(() => make().close(), /request cardinality/i);
  const duplicate = make();
  const first = {};
  duplicate.claim(first, { method: "GET", target: "/ops/dashboard",
    requestKind: "application-fetch" });
  reject(() => duplicate.claim({}, { method: "GET", target: "/ops/dashboard",
    requestKind: "application-fetch" }), /cardinality exceeded/i);
  reject(() => duplicate.claim({}, { method: "GET", target: "/wrong",
    requestKind: "application-fetch" }), /envelope mismatch/i);
  duplicate.bindRequestIdentity(first, { requestId: "request-1",
    caseRequestIdentity: "SYNTHETIC:request-1", caseRequestSequence: 1 });
  reject(() => duplicate.bindResponse(first, { method: "POST", target: "/ops/dashboard",
    status: 200, responseRequestObjectObserved: true }), /method\/path/i);
  reject(() => duplicate.bindResponse(first, { method: "GET", target: "/ops/dashboard",
    status: 500, responseRequestObjectObserved: true }), /status/i);
  reject(() => assertZeroActionCorrelationLeaks([{
    ledgerOwner: "page", initiatorActionId: "SYNTHETIC:action", correlationId: "",
  }], { actionId: "SYNTHETIC:action", correlationId: "SYNTHETIC:correlation" }), /leak/i);
});

check("adapter/runner bind declared envelope and emit separate ledgers", () => {
  const adapter = fs.readFileSync(path.join(rootDir,
    "scripts/internal/v390_ui_native_adapter.mjs"), "utf8");
  const runner = fs.readFileSync(path.join(rootDir,
    "scripts/internal/run_v390_ui_native_exact_cases.mjs"), "utf8");
  for (const token of [
    "ledgerOwner", "ownerPhase", "actionRequestEnvelope", "pageOwnedRequestLedger",
    "actionCorrelationLeakCount",
  ]) assert(adapter.includes(token) || runner.includes(token),
    `action/background integration marker missing: ${token}`);
  assert(!adapter.includes("UI-010") &&
    !fs.readFileSync(path.join(rootDir,
      "scripts/internal/v390_ui_action_request_ledger.mjs"), "utf8").includes("UI-010"),
  "case-specific action/background exception is forbidden");
});

console.log("== v3.9.0 UI action request/background ledger contract ==");
for (const name of checks) console.log(`PASS ${name}`);
console.log(`PASS checks=${checks.length}`);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
