// 파일 용도: canonical 424 UI case를 native Playwright 실행 manifest로 생성하고 검증한다.

import crypto from "node:crypto";

export const nativeExactManifestSchema = "media-server.v390-ui-native-exact-cases.v1";
export const canonicalManifestSchema = "media-server.ui-fulltest-canonical-case-manifest.v1";
export const implementationManifestSchema = "media-server.feature-implementation-evidence.v2";

const dynamicSelectorPattern = /\$\{|<%|\{\{/.source;
const productScreenRoutes = new Set([
  "/",
  "/setup",
  "/login",
  "/logout",
  "/password/change",
  "/invite/setup",
  "/client/request-access",
  "/ops",
  "/ops/home",
  "/ops/dashboard",
  "/ops/sources",
  "/ops/rules",
  "/ops/users",
  "/ops/events",
  "/ops/vlm",
  "/client/live",
  "/client/dashboard",
  "/client/events",
]);

export function buildNativeExactManifest({ canonical, implementation }) {
  assert(canonical?.schema === canonicalManifestSchema, "unexpected canonical manifest schema");
  assert(implementation?.schema === implementationManifestSchema, "unexpected implementation manifest schema");
  assert(Array.isArray(canonical.cases) && canonical.cases.length === 424, "canonical exact case count must be 424");
  const implementationByManualId = new Map(
    implementation.items
      .filter(item => typeof item.manualUiCaseId === "string" && item.manualUiCaseId)
      .map(item => [item.manualUiCaseId, item]),
  );
  assert(implementationByManualId.size === 424, "implementation exact manual UI case count must be 424");

  const cases = canonical.cases.map(canonicalCase => {
    const implementationItem = implementationByManualId.get(canonicalCase.testId);
    assert(implementationItem, `${canonicalCase.testId} implementation item missing`);
    const negativeRoute = canonicalCase.testId === "UI-018";
    const crossRouteNegative = canonicalCase.testId === "SAFE-017";
    const screenRoute = negativeRoute ? canonicalCase.route : normalizeProductScreenRoute(canonicalCase.route);
    const canonicalSelector = normalizeCanonicalSelector(canonicalCase.controlAction?.selector);
    const targetSelector = canonicalSelector || routeRootSelector(screenRoute);
    const sourceKind = implementationItem.semanticEvidence?.stateOracle?.oracleKind || "";
    const expectedBehavior = implementationItem.semanticEvidence?.stateOracle?.expectedBehavior || "";
    const expectedBehaviorSha256 = implementationItem.semanticEvidence?.stateOracle?.expectedBehaviorSha256 || "";
    const actions = [nativeAction("navigate", {
      route: screenRoute,
      expectedCanonicalRoute: canonicalCase.route,
    })];
    if (!negativeRoute) {
      actions.push(nativeAction("wait-visible", {
        selector: targetSelector,
        selectorSource: canonicalSelector ? "canonical-control" : "route-root-fallback",
      }));
      if (canonicalSelector) {
        actions.push(nativeAction("interact", {
          selector: canonicalSelector,
          strategy: "runtime-control",
        }));
      }
      if (crossRouteNegative) {
        actions.push(nativeAction("navigate-negative", {
          route: canonicalCase.route,
          allowedStatuses: [404],
        }));
      }
    }
    return {
      caseId: canonicalCase.testId,
      featureId: canonicalCase.featureId,
      disposition: negativeRoute ? "negative-route" : "native-executable",
      dispatch: "playwright-native",
      canonicalRoute: canonicalCase.route,
      screenRoute,
      accountRole: canonicalCase.accountRole,
      viewport: structuredClone(canonicalCase.viewport),
      theme: canonicalCase.theme,
      controlAction: {
        selector: canonicalSelector,
        selectorSource: canonicalSelector ? "canonical-control" : "route-root-fallback",
        actionAnchor: canonicalCase.controlAction?.actionAnchor || "",
        targetSelector,
      },
      actions,
      oracle: {
        kind: negativeRoute
          ? "negative-route-status"
          : (crossRouteNegative ? "cross-route-negative-status" : initialOracleKind(sourceKind)),
        sourceKind,
        expectedBehavior,
        expectedBehaviorSha256,
        allowedStatuses: negativeRoute ? [404] : [200],
        completionRequired: !negativeRoute && !["read-or-rendered-state", "negative-invariant-state"].includes(sourceKind),
      },
      artifacts: {
        screenshot: true,
        trace: true,
        browserConsole: true,
        serverLog: true,
      },
    };
  });

  return {
    schema: nativeExactManifestSchema,
    sourceBindings: {
      canonicalSchema: canonical.schema,
      canonicalSha256: sha256Json(canonical),
      implementationSchema: implementation.schema,
      implementationSha256: sha256Json(implementation),
      selection: "canonical-exact-ordered-test-id",
    },
    counts: {
      exactCases: cases.length,
      positiveNative: cases.filter(item => item.disposition === "native-executable").length,
      negativeRoute: cases.filter(item => item.disposition === "negative-route").length,
      unsupported: 0,
    },
    evidenceBoundary: "execution manifest and contract are not actual 424-case UI fulltest or Step 26 eligibility evidence",
    cases,
  };
}

export function validateNativeExactManifest({ manifest, canonical, implementation }) {
  assert(manifest?.schema === nativeExactManifestSchema, "unexpected exact native manifest schema");
  const expected = buildNativeExactManifest({ canonical, implementation });
  assert(manifest.sourceBindings?.canonicalSha256 === expected.sourceBindings.canonicalSha256,
    "canonical source binding drift");
  assert(manifest.sourceBindings?.implementationSha256 === expected.sourceBindings.implementationSha256,
    "implementation source binding drift");
  assert(Array.isArray(manifest.cases) && manifest.cases.length === 424, "canonical exact case count must be 424");
  assertExact(manifest.cases.map(item => item.caseId), canonical.cases.map(item => item.testId),
    "canonical ordered case IDs");
  assertUnique(manifest.cases.map(item => item.caseId), "native exact case IDs");

  for (let index = 0; index < manifest.cases.length; index += 1) {
    const item = manifest.cases[index];
    const expectedItem = expected.cases[index];
    assert(item.featureId === expectedItem.featureId, `${item.caseId} featureId drift`);
    assert(item.accountRole === expectedItem.accountRole, `${item.caseId} accountRole drift`);
    assert(JSON.stringify(item.viewport) === JSON.stringify(expectedItem.viewport), `${item.caseId} viewport drift`);
    assert(item.theme === expectedItem.theme, `${item.caseId} theme drift`);
    assert(item.canonicalRoute === expectedItem.canonicalRoute, `${item.caseId} canonical route drift`);
    assert(!item.screenRoute.includes("/api/"), `${item.caseId} raw API screen route is forbidden`);
    assert(item.screenRoute === expectedItem.screenRoute, `${item.caseId} product screen route drift`);
    assert(item.disposition !== "unsupported", `${item.caseId} unsupported disposition is forbidden`);
    assert(item.disposition === expectedItem.disposition, `${item.caseId} disposition drift`);
    assert(item.dispatch === "playwright-native", `${item.caseId} native dispatch missing`);
    assert(Array.isArray(item.actions) && item.actions.length > 0, `${item.caseId} native actions missing`);
    assert(item.actions.every(action => action.dispatch === "playwright-native"), `${item.caseId} native action dispatch drift`);
    assert(JSON.stringify(item.actions) === JSON.stringify(expectedItem.actions), `${item.caseId} action plan drift`);
    assert(item.oracle?.sourceKind === expectedItem.oracle.sourceKind, `${item.caseId} oracle source kind drift`);
    assert(item.oracle?.expectedBehaviorSha256 === expectedItem.oracle.expectedBehaviorSha256,
      `${item.caseId} oracle digest drift`);
    assert(/^[a-f0-9]{64}$/.test(item.oracle.expectedBehaviorSha256), `${item.caseId} oracle digest invalid`);
    assert(JSON.stringify(item.oracle) === JSON.stringify(expectedItem.oracle), `${item.caseId} oracle contract drift`);
    assert(JSON.stringify(item.artifacts) === JSON.stringify(expectedItem.artifacts), `${item.caseId} artifact plan drift`);
  }

  const negative = manifest.cases.find(item => item.caseId === "UI-018");
  assert(negative?.disposition === "negative-route", "UI-018 negative route disposition missing");
  assert(negative.oracle?.kind === "negative-route-status", "UI-018 negative status oracle missing");
  assert(JSON.stringify(manifest) === JSON.stringify(expected), "generated exact native manifest drift");
  return {
    caseCount: manifest.cases.length,
    positiveNative: manifest.cases.filter(item => item.disposition === "native-executable").length,
    negativeRoute: manifest.cases.filter(item => item.disposition === "negative-route").length,
    unsupported: manifest.cases.filter(item => item.disposition === "unsupported").length,
  };
}

export function normalizeProductScreenRoute(route) {
  if (route === "/ops/api/events/reviews") return "/ops/events";
  if (route === "/client/api/views/{id}/events") return "/client/events";
  if (route === "/ops/api/audit") return "/ops/users";
  if (route.startsWith("/ops/api/source-registry/") || route.startsWith("/ops/api/onvif/")) {
    return "/ops/sources";
  }
  if (route === "/lab") return "/ops";
  assert(productScreenRoutes.has(route), `no product screen route mapping for ${route}`);
  return route;
}

function routeRootSelector(route) {
  if (route.startsWith("/ops")) return "body.ops-shell";
  if (route.startsWith("/client") && route !== "/client/request-access") return "body.client-shell";
  if (["/setup", "/login", "/logout", "/password/change", "/invite/setup"].includes(route)) return "body.auth-shell";
  if (route === "/client/request-access") return "body.product-shell";
  return "body";
}

function normalizeCanonicalSelector(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  if (new RegExp(dynamicSelectorPattern).test(value)) return null;
  return value;
}

function nativeAction(kind, fields) {
  return { kind, dispatch: "playwright-native", ...fields };
}

function initialOracleKind(sourceKind) {
  if (sourceKind === "read-or-rendered-state") return "navigation-dom";
  if (sourceKind === "negative-invariant-state") return "navigation-dom-invariant";
  return "action-completion-pending-v390-review2-25";
}

function sha256Json(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function assertExact(actual, expected, label) {
  assert(JSON.stringify(actual) === JSON.stringify(expected), `${label} mismatch`);
}

function assertUnique(values, label) {
  assert(new Set(values).size === values.length, `${label} contain duplicates`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
