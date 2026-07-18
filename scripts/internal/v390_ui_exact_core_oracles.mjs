// 파일 용도: UI/AUTH/SRC/RULE canonical case의 false-PASS 방지용 immutable runtime oracle catalog를 제공한다.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const canonical = readJson("test/fixtures/ui_fulltest_case_manifest_policy_v4.json");
const implementation = readJson("test/fixtures/project_feature_implementation_evidence.json");
const implementationById = new Map(implementation.items.map(item => [item.id, item]));
const corePrefixes = new Set(["UI", "AUTH", "SRC", "RULE"]);
const specializedRuleCases = new Set([
  ...Array.from({ length: 13 }, (_, index) => `RULE-${String(92 + index).padStart(3, "0")}`),
  "RULE-111",
]);

const routeRoots = Object.freeze({
  "/": "html",
  "/setup": '[data-testid="auth-setup-form"]',
  "/login": '[data-testid="auth-login-form"]',
  "/logout": 'form[action="/logout"]',
  "/password/change": '[data-testid="auth-password-change-form"]',
  "/invite/setup": '[data-testid="auth-invite-setup-form"]',
  "/client/request-access": '[data-testid="auth-access-request-form"]',
  "/client/live": '[data-testid="client-live-workspace"]',
  "/client/dashboard": '[data-testid="client-dashboard-shell"]',
  "/client/events": ".client-viewer-events",
  "/ops": '[data-testid="ops-home-page"]',
  "/ops/home": '[data-testid="ops-home-page"]',
  "/ops/dashboard": '[data-testid="ops-dashboard-page"]',
  "/ops/sources": '[data-testid="ops-sources-page"]',
  "/ops/rules": '[data-testid="ops-rules-page"]',
  "/ops/events": '[data-testid="ops-events-page"]',
  "/ops/vlm": '[data-testid="ops-vlm-page"]',
  "/ops/users": '[data-testid="ops-users-page"]',
  "/lab": "html",
});

const explicitMutationEndpoints = Object.freeze({
  "UI-004": ["POST", "/password/change"],
  "UI-005": ["POST", "/logout"],
  "UI-023": ["PUT", "/ops/api/vlm/profiles/{fixtureId}"],
  "UI-029": ["DELETE", "/ops/api/vlm/profiles/{fixtureId}"],
  "UI-109": ["PUT", "/ops/api/onvif/channels/{fixtureId}"],
  "AUTH-018": ["POST", "/ops/api/users"],
  "AUTH-019": ["PUT", "/ops/api/users/{fixtureId}"],
  "AUTH-020": ["POST", "/ops/api/users/{fixtureId}/disable"],
  "AUTH-033": ["POST", "/ops/api/invites"],
  "AUTH-036": ["POST", "/client/api/access-requests"],
  "AUTH-037": ["POST", "/ops/api/access-requests/{fixtureId}/approve"],
  "AUTH-038": ["POST", "/ops/api/access-requests/{fixtureId}/reject"],
  "AUTH-039": ["POST", "/client/api/access-requests"],
  "SRC-001": ["POST", "/ops/api/sources"],
  "SRC-002": ["POST", "/ops/api/sources"],
  "SRC-003": ["POST", "/ops/api/sources"],
  "SRC-004": ["POST", "/ops/api/sources"],
  "SRC-005": ["POST", "/ops/api/sources"],
  "SRC-008": ["POST", "/ops/api/sources"],
  "SRC-009": ["PUT", "/ops/api/sources/{fixtureId}"],
  "SRC-010": ["DELETE", "/ops/api/sources/{fixtureId}"],
  "SRC-017": ["POST", "/ops/api/views"],
  "SRC-018": ["PUT", "/ops/api/views/{fixtureId}"],
  "SRC-019": ["DELETE", "/ops/api/views/{fixtureId}"],
  "SRC-066": ["PUT", "/ops/api/onvif/channels/{fixtureId}"],
  "RULE-004": ["POST", "/lab/analysis/va-rules"],
  "RULE-005": ["PUT", "/lab/analysis/va-rules/{fixtureId}"],
  "RULE-006": ["DELETE", "/lab/analysis/va-rules/{fixtureId}"],
  "RULE-008": ["PUT", "/lab/analysis/va-rules/{fixtureId}"],
  "RULE-016": ["PUT", "/lab/analysis/va-rules/{fixtureId}"],
  "RULE-018": ["POST", "/lab/analysis/rules"],
  "RULE-019": ["PUT", "/lab/analysis/rules/{fixtureId}"],
  "RULE-020": ["DELETE", "/lab/analysis/rules/{fixtureId}"],
  "RULE-022": ["POST", "/lab/analysis/profiles"],
  "RULE-023": ["PUT", "/lab/analysis/profiles/{fixtureId}"],
  "RULE-024": ["DELETE", "/lab/analysis/profiles/{fixtureId}"],
});

const explicitRequestOverrides = Object.freeze({
  // import-draft는 POST이지만 registry를 변경하지 않는 preview/read-model 계약이다.
  "SRC-031": Object.freeze({
    method: "POST",
    path: "/ops/api/onvif/import-draft",
    allowedStatuses: Object.freeze([200]),
  }),
  // canonical route의 {id} 표기는 runtime fixture가 아니라 권한이 부여된 view binding이다.
  "SRC-038": Object.freeze({
    method: "GET",
    path: "/client/api/views/{viewId}/events",
    allowedStatuses: Object.freeze([200]),
  }),
});

const jsonResponsePaths = Object.freeze({
  "GET /lab/analysis/rules": ["$.status", "$.rules"],
  "PUT /ops/api/vlm/profiles/{fixtureId}": ["$.ok", "$.vlmProfile"],
  "DELETE /ops/api/vlm/profiles/{fixtureId}": ["$.ok", "$.deleted"],
  "PUT /ops/api/onvif/channels/{fixtureId}": ["$.ok", "$.source", "$.publishedView"],
  "POST /ops/api/users": ["$.status", "$.user"],
  "PUT /ops/api/users/{fixtureId}": ["$.status", "$.user"],
  "POST /ops/api/users/{fixtureId}/disable": ["$.status", "$.user"],
  "POST /ops/api/invites": ["$.status", "$.invite"],
  "POST /client/api/access-requests": ["$.status", "$.accessRequest"],
  "POST /ops/api/access-requests/{fixtureId}/approve": ["$.status", "$.accessRequest"],
  "POST /ops/api/access-requests/{fixtureId}/reject": ["$.status", "$.accessRequest"],
  "POST /ops/api/sources": ["$.ok", "$.source"],
  "PUT /ops/api/sources/{fixtureId}": ["$.ok", "$.source"],
  "DELETE /ops/api/sources/{fixtureId}": ["$.ok", "$.source"],
  "POST /ops/api/views": ["$.ok", "$.view"],
  "PUT /ops/api/views/{fixtureId}": ["$.ok", "$.view"],
  "DELETE /ops/api/views/{fixtureId}": ["$.ok", "$.view"],
  "POST /ops/api/onvif/import-draft": ["$.ok", "$.credentialGate", "$.sourceDraft", "$.publishedViewDraft"],
  "GET /ops/api/source-registry/onboarding-quality": ["$.schema", "$.onboardingQualitySummary"],
  "GET /ops/api/source-registry/reliability-timeline": ["$.schema", "$.reliabilityTimeline"],
  "GET /ops/api/events/reviews": ["$.schema", "$.records"],
  "GET /client/api/views/{viewId}/events": ["$.ok", "$.events"],
  "GET /ops/api/source-registry/reliability-search-metrics": ["$.schema", "$.sourceReliabilitySearchResults"],
  "GET /ops/api/source-registry/backup-recovery-handoff": ["$.schema", "$.recoveryValidationPlan"],
  "GET /ops/api/onvif/credential-provider-status": ["$.schema", "$.providerReadiness"],
  "POST /lab/analysis/va-rules": ["$.ok", "$.vaRule"],
  "PUT /lab/analysis/va-rules/{fixtureId}": ["$.ok", "$.vaRule"],
  "DELETE /lab/analysis/va-rules/{fixtureId}": ["$.ok", "$.deleted"],
  "POST /lab/analysis/rules": ["$.ok", "$.rule"],
  "PUT /lab/analysis/rules/{fixtureId}": ["$.ok", "$.rule"],
  "DELETE /lab/analysis/rules/{fixtureId}": ["$.ok", "$.deleted"],
  "POST /lab/analysis/profiles": ["$.ok", "$.profile"],
  "PUT /lab/analysis/profiles/{fixtureId}": ["$.ok", "$.profile"],
  "DELETE /lab/analysis/profiles/{fixtureId}": ["$.ok", "$.deleted"],
});

const coreCases = canonical.cases.filter(item => corePrefixes.has(item.testId.split("-")[0]));
const coreBindingSha256 = "62e799c0460c633a6ea8a75934824aaa7cd28556452b5fddf6bc14053b8ec24d";
assert(coreProjectionSha256(coreCases) === coreBindingSha256,
  "core canonical/source semantic binding drift; review and update the independent oracle catalog explicitly");
const catalog = deepFreeze(coreCases.map(buildOracle));
const catalogById = new Map(catalog.map(item => [item.caseId, item]));

export const coreExactOracleCaseIds = Object.freeze(catalog.map(item => item.caseId));

export function coreExactOracleFor(caseId) {
  return catalogById.get(String(caseId || "")) || null;
}

export function validateCoreExactOracleCatalog(candidateCatalog = catalog) {
  assert(Array.isArray(candidateCatalog), "core oracle catalog must be an array");
  assert(candidateCatalog.length === coreCases.length, `core oracle count mismatch: ${candidateCatalog.length}/${coreCases.length}`);
  const expectedIds = coreCases.map(item => item.testId);
  const actualIds = candidateCatalog.map(item => item?.caseId);
  assert(new Set(actualIds).size === actualIds.length, "core oracle case IDs must be unique");
  assert(JSON.stringify(actualIds) === JSON.stringify(expectedIds), "core oracle canonical order/coverage drift");
  for (let index = 0; index < candidateCatalog.length; index += 1) validateOracle(candidateCatalog[index], coreCases[index]);
  return Object.freeze({
    schema: "media-server.v390-ui-exact-core-oracle-validation.v1",
    caseCount: candidateCatalog.length,
    prefixCounts: Object.freeze(Object.fromEntries([...corePrefixes].map(prefix => [
      prefix,
      candidateCatalog.filter(item => item.caseId.startsWith(`${prefix}-`)).length,
    ]))),
    specializedCount: candidateCatalog.filter(item => item.classification === "existing-specialized").length,
    genericGet200ExistsOnlyCount: 0,
    coreBindingSha256,
  });
}

function buildOracle(canonicalCase) {
  const evidence = implementationById.get(canonicalCase.testId);
  assert(evidence, `${canonicalCase.testId} implementation evidence missing`);
  const semantic = evidence.semanticEvidence;
  const proof = semantic.review4Proof;
  const obligation = proof.semanticObligation;
  const requirement = proof.requirement;
  const screenRoute = normalizeScreenRoute(canonicalCase.route);
  const reviewedSelector = semantic.controlSelector?.applicability === "required"
    ? semantic.controlSelector.value
    : null;
  const selector = reviewedSelector || routeRoots[screenRoute] || "body";
  const mutationEndpoint = explicitMutationEndpoints[canonicalCase.testId] || null;
  const requestOverride = explicitRequestOverrides[canonicalCase.testId] || null;
  const operation = String(requirement.operation || "read");
  const mutation = Boolean(mutationEndpoint);
  const negative = proof.flowKind === "negative-invariant";
  const method = requestOverride?.method || mutationEndpoint?.[0] || "GET";
  const endpointPath = requestOverride?.path || mutationEndpoint?.[1] ||
    preferredReadEndpoint(canonicalCase, obligation.routeTokens, screenRoute);
  const semanticTokens = unique([
    ...(obligation.fieldTokens || []),
    ...(obligation.schemaTokens || []),
    ...(obligation.outcomeTokens || []),
    proof.evidenceToken,
    semantic.actionHandler?.symbol,
    canonicalCase.controlAction?.actionAnchor,
  ].map(String).filter(Boolean));
  const baselineForbiddenFields = [
    "literalPassword",
    "plaintextCredential",
    "unredactedTokenHash",
    "genericPassSubstitution",
  ];
  const negativeBoundaries = obligation.negativeBoundaries || [];
  const forbiddenFields = unique([
    ...baselineForbiddenFields,
    ...negativeBoundaries.flatMap(boundary => boundary.tokens || []),
    ...(canonicalCase.accountRole === "viewer" ? ["sourceUrl", "rawLocator", "credentialMaterial"] : []),
  ]);
  const forbiddenMaterialTokens = unique([
    ...baselineForbiddenFields,
    ...negativeBoundaries.flatMap(boundary => (boundary.tokens || []).filter(token =>
      !isNarrativeBoundaryToken(boundary.kind, token))),
    ...(canonicalCase.accountRole === "viewer" ? ["sourceUrl", "rawLocator", "credentialMaterial"] : []),
  ]);
  const classification = specializedRuleCases.has(canonicalCase.testId) ? "existing-specialized" : "core-exact";
  const runnerAction = classification === "existing-specialized"
    ? "delegate-existing-specialized"
    : (mutation ? `exact-${operation}` : (negative ? "assert-negative-invariant" : "assert-semantic-readback"));
  const stateMutation = mutation;
  const fixtureId = `${canonicalCase.testId.toLowerCase()}-exact-fixture`;
  const expectedBehaviorSha256 = semantic.stateOracle.expectedBehaviorSha256;
  const verifier = semantic.verifierAssertion;
  const allowedStatuses = requestOverride?.allowedStatuses ||
    (mutation ? successStatuses(method, endpointPath) : readStatuses(canonicalCase));
  const responseContract = executableResponseContract(canonicalCase.testId, method, endpointPath, selector);
  const forbiddenNetwork = stateMutation ? [] : ["POST", "PUT", "PATCH", "DELETE"]
    .filter(forbiddenMethod => forbiddenMethod !== method)
    .map(forbiddenMethod => ({
    method: forbiddenMethod,
    path: `${protectedWritePrefix(canonicalCase.testId, screenRoute)}/`,
  }));
  const requiredAttributes = selectorRequiredAttributes(selector);
  return {
    schema: "media-server.v390-ui-exact-core-oracle.v1",
    caseId: canonicalCase.testId,
    featureId: canonicalCase.featureId,
    family: canonicalCase.testId.split("-")[0],
    classification,
    specializedOracleId: classification === "existing-specialized" ? `existing:${canonicalCase.testId}` : null,
    route: canonicalCase.route,
    role: canonicalCase.accountRole,
    screenRoute,
    accountRole: canonicalCase.accountRole,
    viewport: { ...canonicalCase.viewport },
    theme: canonicalCase.theme,
    oracleKey: `${canonicalCase.testId}:${expectedBehaviorSha256}`,
    expectedBehavior: {
      text: semantic.stateOracle.expectedBehavior,
      sha256: expectedBehaviorSha256,
    },
    visibleControl: {
      selector,
      action: runnerAction,
      kind: reviewedSelector ? "reviewed-product-control" : "reviewed-route-root",
      requiredVisible: true,
      requiredEnabled: mutation || Boolean(reviewedSelector),
      actionAnchor: canonicalCase.controlAction?.actionAnchor || semantic.actionHandler.symbol,
    },
    action: {
      kind: classification === "existing-specialized" ? "existing-specialized" :
        (mutation ? `exact-${operation}` : (negative ? "exact-negative-invariant" : "exact-readback")),
      fixtureId: "{fixtureId}",
      semanticPayload: {
        operation,
        expectation: requirement.expectation,
        surface: requirement.surface,
        requiredFields: semanticTokens,
        featureContractSha256: proof.featureContractSha256,
      },
    },
    api: {
      request: {
        method,
        path: endpointPath,
        allowedStatuses,
        body: method === "GET" ? null : {
          fixtureId: "{fixtureId}",
          requiredFields: semanticTokens,
          semanticPayloadSha256: proof.featureContractSha256,
        },
      },
      bodyAssertions: [
        {
          kind: "verifier-backed-semantic-response",
          verifier: `${verifier.file}#${verifier.symbol}`,
          expectedBehaviorSha256,
        },
        {
          kind: "case-specific-outcome",
          tokens: semanticTokens.length > 0 ? semanticTokens : [semantic.relation.semanticKey],
          minimumMatches: 1,
          requiredOutcomeSha256: obligation.requiredOutcome.sha256,
        },
      ],
      forbiddenFields,
    },
    domAssertions: [
      { kind: "route", operator: "equals", expected: screenRoute },
      { kind: "visible-control", selector, property: "visible", operator: "equals", expected: true },
      {
        kind: "semantic-control-readback",
        selector,
        actionAnchor: canonicalCase.controlAction?.actionAnchor || semantic.actionHandler.symbol,
        expectedBehaviorSha256,
      },
    ],
    requests: [{
      method,
      path: endpointPath,
      allowedStatuses,
      responseSchema: responseContract.responseSchema,
      body: method === "GET" ? null : {
        fixtureId: "{fixtureId}",
        requiredFields: semanticTokens,
        semanticPayloadSha256: proof.featureContractSha256,
      },
      ...responseContract.assertions,
      forbiddenJsonKeys: forbiddenFields,
    }],
    dom: [{
      selector,
      requiredTextTokens: [],
      forbiddenTextTokens: [],
      forbiddenMaterialTokens,
      requiredAttributes,
      expectedBehaviorSha256,
    }],
    forbiddenNetwork,
    stateSnapshots: [
      {
        phase: "before",
        identity: `${canonicalCase.testId}:before:${semantic.stateOracle.locator.contextSha256}`,
        source: `${semantic.handler.file}#${semantic.handler.symbol}`,
        expectation: "capture-authoritative-state",
      },
      {
        phase: "after",
        identity: `${canonicalCase.testId}:after:${verifier.assertedSemanticDigest}`,
        source: `${verifier.file}#${verifier.symbol}`,
        expectation: stateMutation ? "changed-only-at-fixture" : "equal-before",
      },
    ],
    network: {
      correlationId: `${canonicalCase.testId}:core-exact-primary`,
      requiredRequests: [{ sequence: 1, method, path: endpointPath, allowedStatuses }],
      forbiddenRequests: stateMutation ? [] : [
        {
          methods: ["POST", "PUT", "PATCH", "DELETE"].filter(forbiddenMethod => forbiddenMethod !== method),
          pathPrefix: `${protectedWritePrefix(canonicalCase.testId, screenRoute)}/`,
        },
      ],
      forbidUncorrelatedPrimaryCompletion: true,
    },
    beforeAfterState: {
      beforeIdentity: `${canonicalCase.testId}:before:${semantic.stateOracle.locator.contextSha256}`,
      afterIdentity: `${canonicalCase.testId}:after:${verifier.assertedSemanticDigest}`,
      comparison: stateMutation ? "case-fixture-created-or-updated" : "authoritative-state-equal-before",
      expectedBehaviorSha256,
      requireIndependentReadback: true,
      rejectDomSelfComparison: true,
    },
    cleanup: stateMutation ? {
      strategy: method === "POST" ? "delete-created-fixture" : "restore-authoritative-snapshot",
      targets: ["{fixtureId}", endpointPath],
      mode: method === "POST" ? "delete-created-fixture" : "restore-authoritative-snapshot",
      fixtureId: "{fixtureId}",
      finalExpectation: "equal-before-or-absent",
      verification: `${canonicalCase.testId}:fresh-authoritative-cleanup-readback`,
    } : {
      strategy: "no-op-with-state-proof",
      targets: [oracleStateTarget(canonicalCase.testId, endpointPath)],
      mode: "no-op-with-state-proof",
      fixtureId: null,
      finalExpectation: "equal-before",
      verification: `${canonicalCase.testId}:fresh-authoritative-no-write-readback`,
    },
    owner: {
      file: semantic.handler.file,
      symbol: semantic.handler.symbol,
      anchor: semantic.handler.anchor,
      contextSha256: semantic.handler.contextSha256,
      actionFile: semantic.actionHandler.file,
      actionSymbol: semantic.actionHandler.symbol,
      actionContextSha256: semantic.actionHandler.contextSha256,
      verifierFile: verifier.file,
      verifierSymbol: verifier.symbol,
      verifierContextSha256: semantic.stateOracle.locator.contextSha256,
    },
  };
}

function validateOracle(oracle, canonicalCase) {
  assert(oracle?.schema === "media-server.v390-ui-exact-core-oracle.v1", `${canonicalCase.testId} oracle schema mismatch`);
  assert(oracle.caseId === canonicalCase.testId && oracle.featureId === canonicalCase.featureId,
    `${canonicalCase.testId} case/feature identity drift`);
  assert(oracle.route === canonicalCase.route && oracle.role === canonicalCase.accountRole && oracle.accountRole === canonicalCase.accountRole,
    `${canonicalCase.testId} route/role drift`);
  assert(oracle.visibleControl?.selector && oracle.visibleControl?.action && oracle.visibleControl.requiredVisible === true,
    `${canonicalCase.testId} visible product control/root missing`);
  assert(oracle.expectedBehavior?.text && /^[a-f0-9]{64}$/.test(oracle.expectedBehavior?.sha256 || ""),
    `${canonicalCase.testId} expectedBehavior contract missing`);
  assert(!["generic", "interact", "get-200", "exists-only"].includes(oracle.action?.kind),
    `${canonicalCase.testId} generic action forbidden`);
  assert(oracle.action?.semanticPayload?.featureContractSha256?.length === 64,
    `${canonicalCase.testId} semantic API payload digest missing`);
  assert(Array.isArray(oracle.action.semanticPayload.requiredFields) && oracle.action.semanticPayload.requiredFields.length > 0,
    `${canonicalCase.testId} API payload/semantic fields missing`);
  assert(oracle.api?.request?.method && oracle.api.request.path && oracle.api.request.allowedStatuses.length > 0,
    `${canonicalCase.testId} exact API request missing`);
  assert(Array.isArray(oracle.api.bodyAssertions) && oracle.api.bodyAssertions.length >= 2 &&
    oracle.api.bodyAssertions.some(item => item.kind === "verifier-backed-semantic-response" && item.expectedBehaviorSha256?.length === 64) &&
    oracle.api.bodyAssertions.some(item => item.kind === "case-specific-outcome" && item.requiredOutcomeSha256?.length === 64),
  `${canonicalCase.testId} API body assertions are generic or incomplete`);
  assert(Array.isArray(oracle.api.forbiddenFields) && oracle.api.forbiddenFields.length >= 4,
    `${canonicalCase.testId} forbidden field contract missing`);
  assert(Array.isArray(oracle.requests) && oracle.requests.length === 1 &&
    oracle.requests[0].method === oracle.api.request.method && oracle.requests[0].path === oracle.api.request.path &&
    executableRequestAssertionsValid(oracle.requests[0], canonicalCase.testId) &&
    oracle.requests[0].forbiddenJsonKeys.length >= 4 &&
    (oracle.requests[0].body === null || oracle.requests[0].body.fixtureId === "{fixtureId}"),
  `${canonicalCase.testId} runner request/body oracle missing`);
  assert(Array.isArray(oracle.domAssertions) && oracle.domAssertions.length >= 3 &&
    oracle.domAssertions.some(item => item.kind === "route") &&
    oracle.domAssertions.some(item => item.kind === "visible-control") &&
    oracle.domAssertions.some(item => item.kind === "semantic-control-readback" && item.expectedBehaviorSha256?.length === 64),
  `${canonicalCase.testId} DOM oracle is exists-only`);
  assert(Array.isArray(oracle.dom) && oracle.dom.length >= 1 && oracle.dom.every(item =>
    item.selector && item.expectedBehaviorSha256?.length === 64 &&
    Array.isArray(item.requiredTextTokens) && Array.isArray(item.forbiddenTextTokens) &&
    Array.isArray(item.forbiddenMaterialTokens) && item.forbiddenMaterialTokens.length >= 4 &&
    Array.isArray(item.requiredAttributes) && item.requiredAttributes.length > 0 &&
    item.requiredAttributes.every(attribute => attribute.name && attribute.operator && attribute.value !== undefined)),
  `${canonicalCase.testId} runner DOM assertion shape missing`);
  assert(Array.isArray(oracle.forbiddenNetwork) && oracle.forbiddenNetwork.every(item =>
    ["POST", "PUT", "PATCH", "DELETE"].includes(item.method) && item.path.endsWith("/") &&
    !item.path.includes("{") && item.method !== oracle.requests[0].method),
  `${canonicalCase.testId} forbidden network shape missing`);
  assert(Array.isArray(oracle.stateSnapshots) && oracle.stateSnapshots.length === 2 &&
    oracle.stateSnapshots[0].phase === "before" && oracle.stateSnapshots[1].phase === "after" &&
    oracle.stateSnapshots[0].identity !== oracle.stateSnapshots[1].identity,
  `${canonicalCase.testId} runner state snapshot shape missing`);
  assert(oracle.network?.correlationId === `${canonicalCase.testId}:core-exact-primary` &&
    oracle.network.requiredRequests?.length === 1 && oracle.network.forbidUncorrelatedPrimaryCompletion === true &&
    oracle.network.forbiddenRequests.every(request => request.pathPrefix.endsWith("/") &&
      !request.methods.includes(oracle.requests[0].method)),
  `${canonicalCase.testId} exact network correlation missing`);
  assert(oracle.beforeAfterState?.beforeIdentity !== oracle.beforeAfterState?.afterIdentity &&
    oracle.beforeAfterState.requireIndependentReadback === true &&
    oracle.beforeAfterState.rejectDomSelfComparison === true,
  `${canonicalCase.testId} before/after state oracle is self-comparison`);
  assert(oracle.cleanup?.strategy && Array.isArray(oracle.cleanup.targets) && oracle.cleanup.targets.length > 0 &&
    oracle.cleanup?.verification?.startsWith(`${canonicalCase.testId}:`) &&
    ["equal-before", "equal-before-or-absent"].includes(oracle.cleanup.finalExpectation),
  `${canonicalCase.testId} cleanup readback missing`);
  const shouldSpecialize = specializedRuleCases.has(canonicalCase.testId);
  assert((oracle.classification === "existing-specialized") === shouldSpecialize,
    `${canonicalCase.testId} specialized classification drift`);
  if (shouldSpecialize) assert(oracle.specializedOracleId === `existing:${canonicalCase.testId}`,
    `${canonicalCase.testId} specialized oracle link missing`);
  for (const field of ["contextSha256", "actionContextSha256", "verifierContextSha256"]) {
    assert(/^[a-f0-9]{64}$/.test(oracle.owner?.[field] || ""), `${canonicalCase.testId} owner ${field} missing`);
  }
  const genericGet200 = oracle.api.request.method === "GET" &&
    JSON.stringify(oracle.api.request.allowedStatuses) === "[200]" &&
    oracle.api.bodyAssertions.every(item => ["exists", "visible"].includes(item.kind));
  assert(!genericGet200, `${canonicalCase.testId} generic GET200/exists-only oracle forbidden`);
}

function isNarrativeBoundaryToken(kind, token) {
  const normalized = String(token || "").trim().toLowerCase();
  const narrativeByKind = {
    "client-viewer-boundary": new Set(["client", "viewer"]),
    "debug-redaction": new Set(["debug"]),
    "no-auto-apply": new Set(["자동 적용"]),
    "no-mutation": new Set(["changed", "mutation", "변경"]),
    "no-send": new Set(["delivery", "send", "발송"]),
    "no-write": new Set(["write"]),
    "provider-boundary": new Set(["provider"]),
    "raw-material-redaction": new Set(["raw"]),
    "source-url-redaction": new Set(["source url"]),
  };
  return narrativeByKind[kind]?.has(normalized) === true;
}

function preferredReadEndpoint(canonicalCase, routeTokens, screenRoute) {
  const apiRoute = (routeTokens || []).find(value => /^\/(?:ops|client)\/api\//.test(value) || value.startsWith("/lab/"));
  if (apiRoute) return apiRoute;
  if (/^\/(?:ops|client)\/api\//.test(canonicalCase.route) || canonicalCase.route.startsWith("/lab/")) return canonicalCase.route;
  return screenRoute;
}

function normalizeScreenRoute(route) {
  if (route === "/" || route === "/setup" || route === "/login" || route === "/logout" || route === "/password/change" || route === "/invite/setup") return route;
  if (route.startsWith("/client/api/")) return "/client/events";
  if (route === "/ops/api/events/reviews") return "/ops/events";
  if (route.startsWith("/ops/api/onvif/") || route.startsWith("/ops/api/source-registry/")) return "/ops/sources";
  return route;
}

function protectedWritePrefix(caseId, screenRoute) {
  if (caseId.startsWith("AUTH-") || screenRoute === "/ops/users") return "/ops/api";
  if (caseId.startsWith("SRC-") || screenRoute === "/ops/sources") return "/ops/api";
  if (caseId.startsWith("RULE-") || screenRoute === "/ops/rules") return "/lab/analysis";
  if (screenRoute.startsWith("/client/")) return "/client/api";
  return "/ops/api";
}

function selectorRequiredAttributes(selector) {
  if (selector === "html") return [{ name: "lang", operator: "equals", value: "ko" }];
  if (/[ >+~]/.test(selector)) {
    const tail = selector.trim().split(/\s+|>/).filter(Boolean).at(-1) || "";
    const tailId = tail.match(/#([A-Za-z0-9_-]+)/)?.[1];
    if (tailId) return [{ name: "id", operator: "equals", value: tailId }];
    const tailClass = tail.match(/\.([A-Za-z0-9_-]+)/)?.[1];
    if (tailClass) return [{ name: "class", operator: "includes", value: tailClass }];
    const tailData = tail.match(/\[(data-[A-Za-z0-9_-]+)/)?.[1];
    if (tailData) return [{ name: tailData, operator: "present", value: "present" }];
    const tailTag = tail.match(/^([A-Za-z][A-Za-z0-9-]*)/)?.[1];
    if (tailTag) return [{ name: "data-oracle-tag", operator: "equals", value: tailTag.toLowerCase() }];
  }
  const testId = selector.match(/data-testid=["']([^"']+)/)?.[1];
  if (testId) return [{ name: "data-testid", operator: "equals", value: testId }];
  const id = selector.match(/#([A-Za-z0-9_-]+)/)?.[1];
  if (id) return [{ name: "id", operator: "equals", value: id }];
  const action = selector.match(/action=["']([^"']+)/)?.[1];
  if (action) return [{ name: "action", operator: "equals", value: action }];
  const dataAttribute = selector.match(/\[(data-[A-Za-z0-9_-]+)/)?.[1];
  if (dataAttribute) return [{ name: dataAttribute, operator: "present", value: "present" }];
  const className = selector.match(/\.([A-Za-z0-9_-]+)/)?.[1];
  if (className) return [{ name: "class", operator: "includes", value: className }];
  return [{ name: "data-oracle-owner", operator: "equals", value: "verifier-backed" }];
}

function executableResponseContract(caseId, method, endpointPath, selector) {
  if (caseId === "UI-018") {
    return {
      responseSchema: "negative-route",
      assertions: { requiredBodyTokens: ["not found|Not Found"] },
    };
  }
  if (["/password/change", "/logout"].includes(endpointPath)) {
    return { responseSchema: "redirect", assertions: { requiredBodyTokens: [] } };
  }
  const responsePaths = jsonResponsePaths[`${method} ${endpointPath}`];
  if (responsePaths) {
    return {
      responseSchema: "json",
      assertions: { requiredJsonPaths: [...responsePaths], requiredBodyTokens: [] },
    };
  }
  const token = htmlResponseToken(selector);
  assert(token, `${caseId} executable HTML response token missing for ${selector}`);
  // runtime은 requiredJsonPaths가 빈 배열이어도 truthy로 처리하므로 HTML에는 해당 필드를 넣지 않는다.
  return { responseSchema: "html", assertions: { requiredBodyTokens: [token] } };
}

function executableRequestAssertionsValid(request, caseId) {
  const paths = request.requiredJsonPaths;
  const bodyTokens = request.requiredBodyTokens;
  assert(!JSON.stringify(request).includes("$<"), `${caseId} synthetic JSONPath token forbidden`);
  assert(!JSON.stringify(request).includes("<verifier:"), `${caseId} verifier token cannot be a runtime response path`);
  if (request.responseSchema === "json") {
    return Array.isArray(paths) && paths.length >= 2 &&
      paths.every(value => /^\$\.[A-Za-z_][A-Za-z0-9_]*(?:\.(?:[A-Za-z_][A-Za-z0-9_]*|\*))*(?:\.\*)?$/.test(value)) &&
      Array.isArray(bodyTokens) && bodyTokens.length === 0;
  }
  if (request.responseSchema === "html" || request.responseSchema === "negative-route") {
    return paths === undefined && Array.isArray(bodyTokens) && bodyTokens.length >= 1 && bodyTokens.every(Boolean);
  }
  if (request.responseSchema === "redirect") {
    return paths === undefined && Array.isArray(bodyTokens) && bodyTokens.length === 0 &&
      request.allowedStatuses.length === 1 && request.allowedStatuses[0] === 302;
  }
  return false;
}

function htmlResponseToken(selector) {
  if (selector === "html") return 'lang="ko"';
  const testId = selector.match(/data-testid=["']([^"']+)/)?.[1];
  if (testId) return `data-testid="${testId}"`;
  const id = selector.match(/#([A-Za-z0-9_-]+)/)?.[1];
  if (id) return `id="${id}"`;
  const action = selector.match(/action=["']([^"']+)/)?.[1];
  if (action) return `action="${action}"`;
  const dataAttribute = selector.match(/\[(data-[A-Za-z0-9_-]+)/)?.[1];
  if (dataAttribute) return dataAttribute;
  return selector.match(/\.([A-Za-z0-9_-]+)/)?.[1] || "";
}

function oracleStateTarget(caseId, endpointPath) {
  return `${caseId}:${endpointPath}:authoritative-state`;
}

function successStatuses(method, endpointPath) {
  if (["/password/change", "/logout"].includes(endpointPath)) return [302];
  if (/\/(?:approve|reject|disable)$/.test(endpointPath)) return [200];
  if (method === "POST") return [201];
  return [200];
}

function readStatuses(canonicalCase) {
  return canonicalCase.testId === "UI-018" ? [404] : [200];
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function coreProjectionSha256(cases) {
  const projection = cases.map(item => {
    const semantic = implementationById.get(item.testId)?.semanticEvidence;
    return [
      item.testId, item.route, item.accountRole, item.controlAction?.selector, item.controlAction?.actionAnchor,
      semantic?.handler?.contextSha256, semantic?.actionHandler?.contextSha256,
      semantic?.stateOracle?.expectedBehaviorSha256,
      semantic?.verifierAssertion?.file, semantic?.verifierAssertion?.symbol,
      semantic?.verifierAssertion?.assertionAnchor, semantic?.verifierAssertion?.command,
    ];
  });
  return crypto.createHash("sha256").update(JSON.stringify(projection)).digest("hex");
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), "utf8"));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
