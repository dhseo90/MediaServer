// 파일 용도: canonical exact 424 branch가 소비하는 browser callback/raw/Node schema 경로를 전수 결속한다.

import { buildCanonicalActionRequestCensus } from "./v390_ui_action_request_ledger.mjs";
import {
  browserCallbackSchemaCensus,
  callbackResultSchema,
} from "./v390_ui_browser_callback_boundary.mjs";
import { runtimeObservedSchema } from "./v390_ui_requested_observed_schema.mjs";

export const browserCallbackReachabilitySchema =
  "media-server.v390-ui-browser-callback-reachability.v1";

export function buildCanonicalBrowserCallbackReachability(manifest) {
  if (manifest?.schema !== "media-server.v390-ui-native-exact-cases.v2" ||
      !Array.isArray(manifest.cases) || manifest.cases.length !== 424) {
    throw new Error("canonical browser callback reachability requires exact native 424 manifest");
  }
  const contractById = new Map(browserCallbackSchemaCensus.map(item => [item.callbackId, item]));
  const requestCensus = buildCanonicalActionRequestCensus(manifest);
  const requestByCase = new Map(requestCensus.rows.map(row => [row.caseId, row]));
  const seen = new Set();
  const rows = manifest.cases.map(item => {
    if (!item?.caseId || seen.has(item.caseId)) {
      throw new Error(`canonical browser callback reachability case ID drift: ${String(item?.caseId || "")}`);
    }
    seen.add(item.caseId);
    const primary = item.actions?.find(action => action?.semanticCompletion?.phase === "primary-action");
    const completionMode = String(primary?.semanticCompletion?.completionMode || "");
    if (!["request", "local", "navigation"].includes(completionMode)) {
      throw new Error(`${item.caseId} browser callback completion mode is invalid: ${completionMode}`);
    }
    const requestRow = requestByCase.get(item.caseId) || null;
    if ((completionMode === "request") !== Boolean(requestRow)) {
      throw new Error(`${item.caseId} browser callback request reachability mismatch`);
    }
    const completionCallbackId = completionMode === "request" &&
      requestRow.requestTransport === "exact-api-fetch"
      ? "runner.endpoint-request"
      : "runtime.location-pathname";
    const callbacks = [
      callbackBinding(contractById, "adapter.navigation-owner", callbackResultSchema),
      callbackBinding(contractById, "adapter.runtime-context", runtimeObservedSchema),
      callbackBinding(contractById, "adapter.control-observation", runtimeObservedSchema),
      callbackBinding(contractById, completionCallbackId, callbackResultSchema),
    ];
    return Object.freeze({
      caseId: item.caseId,
      completionMode,
      requestTransport: requestRow ? requestRow.requestTransport : "not-applicable",
      runtimeObservedConsumer: true,
      runtimeObservedSchema,
      callbacks: Object.freeze(callbacks),
    });
  });
  return Object.freeze({
    schema: browserCallbackReachabilitySchema,
    canonicalCaseCount: rows.length,
    requestCount: requestCensus.rows.length,
    rows: Object.freeze(rows),
  });
}

function callbackBinding(contractById, callbackId, downstreamSchema) {
  const contract = contractById.get(callbackId);
  if (!contract) throw new Error(`browser callback reachability contract missing: ${callbackId}`);
  return Object.freeze({
    callbackId,
    serializedInputSchema: contract.serializedInputSchema,
    browserRawOutputSchema: contract.browserRawOutputSchema,
    nodeNormalizedSchema: contract.nodeNormalizedSchema,
    downstreamSchema,
  });
}
