#!/usr/bin/env node
// 파일 용도: V390-REVIEW2-24 exact 424 native 실행 manifest의 positive/negative 계약을 검증한다.

import fs from "node:fs";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  buildNativeExactManifest,
  normalizeProductScreenRoute,
  validateNativeExactManifest,
} from "./v390_ui_native_exact_cases_lib.mjs";
import {
  canonicalRequestedProjection,
  expectedRuntimeObservation,
  runtimeObservedProjection,
  validateRequestedObservedEnvelope,
} from "./v390_ui_requested_observed_schema.mjs";
import {
  createV390UiCaseRuntime,
  seedExactAccessRequestFixture,
} from "./v390_ui_case_runtime.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const canonical = readJson("test/fixtures/ui_fulltest_case_manifest_policy_v4.json");
const implementation = readJson("test/fixtures/project_feature_implementation_evidence.json");
const manifest = readJson("test/fixtures/v390_ui_native_exact_cases.json");
const runnerSource = fs.readFileSync(path.join(rootDir, "scripts/internal/run_v390_ui_native_exact_cases.mjs"), "utf8");
const nativeLibrarySource = fs.readFileSync(path.join(rootDir, "scripts/internal/v390_ui_native_exact_cases_lib.mjs"), "utf8");
const runtimeSource = fs.readFileSync(path.join(rootDir, "scripts/internal/v390_ui_case_runtime.mjs"), "utf8");
const environmentSource = fs.readFileSync(path.join(rootDir, "scripts/internal/v390_acceptance_ui_environment.mjs"), "utf8");
const producerSource = fs.readFileSync(path.join(rootDir, "scripts/internal/v390_ui_policy_v4_evidence_producer.mjs"), "utf8");
const policyLibrarySource = fs.readFileSync(path.join(rootDir, "scripts/internal/ui_fulltest_evidence_policy_v4_lib.mjs"), "utf8");
const trackedFiles = new Set(execFileSync("git", ["ls-files"], { cwd: rootDir, encoding: "utf8" })
  .split("\n").filter(Boolean));
const sourceCache = new Map();
const checks = [];

check("generated manifest validates against canonical exact ordered 424", () => {
  const result = validateNativeExactManifest({ manifest, canonical, implementation });
  assert(result.caseCount === 424, `caseCount mismatch: ${result.caseCount}`);
  assert(result.unsupported === 0, `unsupported must be zero: ${result.unsupported}`);
  assert(result.positiveNative === 423, `positiveNative mismatch: ${result.positiveNative}`);
  assert(result.negativeRoute === 1, `negativeRoute mismatch: ${result.negativeRoute}`);
});

check("builder is deterministic and preserves exact case order", () => {
  const rebuilt = buildNativeExactManifest({ canonical, implementation });
  assert(JSON.stringify(rebuilt) === JSON.stringify(manifest), "generated manifest drift");
  assert(JSON.stringify(manifest.cases.map(item => item.caseId)) ===
    JSON.stringify(canonical.cases.map(item => item.testId)), "canonical ordered IDs drift");
});

check("admin-only ops users cases and runtime role schema stay authoritative", () => {
  const canonicalAdminCases = canonical.cases.filter(item => normalizeProductScreenRoute(item.route) === "/ops/users");
  const nativeAdminCases = manifest.cases.filter(item => item.screenRoute === "/ops/users");
  assert(canonicalAdminCases.length === 20, `canonical /ops/users case count mismatch: ${canonicalAdminCases.length}`);
  assert(nativeAdminCases.length === 20, `native /ops/users case count mismatch: ${nativeAdminCases.length}`);
  assert(canonicalAdminCases.every(item => item.accountRole === "admin"),
    "canonical /ops/users cases must use the product admin role");
  assert(nativeAdminCases.every(item => item.accountRole === "admin"),
    "native /ops/users cases must use the product admin role");

  const requested = canonicalRequestedProjection({
    canonicalRoute: "/ops/users",
    accountRole: "admin",
    viewport: { width: 390, height: 844 },
    theme: "light",
    controlAction: { selector: "#user-save-selected", actionAnchor: "CreateAuthUser" },
  });
  const observed = expectedRuntimeObservation({
    accountRole: "admin",
    viewport: { width: 390, height: 844 },
    theme: "light",
    screenRoute: "/ops/users",
    workflow: {
      primaryControl: {
        accountRole: "admin",
        route: "/ops/users",
        selector: "#user-save-selected",
        applicability: "required",
        expectedVisible: true,
        expectedEnabled: true,
      },
    },
  });
  assert(validateRequestedObservedEnvelope({ requested, observed }).length === 0,
    "requested/observed runtime schema rejected the product admin role");

  const invalidCanonical = structuredClone(canonical);
  invalidCanonical.cases[0].accountRole = "integrator";
  let invalidRoleMessage = "";
  try {
    buildNativeExactManifest({ canonical: invalidCanonical, implementation });
  } catch (error) {
    invalidRoleMessage = String(error?.message || error);
  }
  assert(invalidRoleMessage.includes("unsupported canonical account role"),
    `unsupported canonical account role was accepted: ${invalidRoleMessage}`);
});

check("API ownership routes normalize to product screens", () => {
  const expected = new Map([
    ["/ops/api/events/reviews", "/ops/events"],
    ["/client/api/views/{id}/events", "/client/events"],
    ["/ops/api/source-registry/reliability-timeline", "/ops/sources"],
    ["/ops/api/onvif/credential-provider-status", "/ops/sources"],
    ["/ops/api/audit", "/ops/users"],
  ]);
  for (const [source, screen] of expected) {
    assert(normalizeProductScreenRoute(source) === screen, `${source} did not normalize to ${screen}`);
  }
  for (const item of manifest.cases.filter(value => value.disposition === "native-executable")) {
    assert(!item.screenRoute.includes("/api/"), `${item.caseId} retains raw API screen route`);
  }
});

check("UI-018 remains a dedicated negative route case", () => {
  const item = manifest.cases.find(value => value.caseId === "UI-018");
  assert(item?.disposition === "negative-route", "UI-018 negative disposition missing");
  assert(item.canonicalRoute === "/lab" && item.screenRoute === "/lab", "UI-018 route mismatch");
  assert(item.actions.length === 1 && item.actions[0].kind === "navigate", "UI-018 action must be native navigate");
  assert(item.oracle.kind === "negative-route-status", "UI-018 negative status oracle missing");
  assert(item.oracle.allowedStatuses.includes(404), "UI-018 must accept only explicit negative status");
});

check("SAFE-017 keeps its cross-route negative behavior without changing UI-018 classification", () => {
  const item = manifest.cases.find(value => value.caseId === "SAFE-017");
  assert(item?.disposition === "native-executable", "SAFE-017 must remain in positive native count");
  assert(item.screenRoute === "/ops", "SAFE-017 product screen route mismatch");
  const negativeAction = item.actions.find(action => action.kind === "navigate-negative");
  assert(negativeAction?.route === "/lab", "SAFE-017 /lab negative action missing");
  assert(negativeAction.allowedStatuses.includes(404), "SAFE-017 404 oracle missing");
  assert(item.oracle.kind === "semantic-cross-route-negative-status", "SAFE-017 cross-route oracle missing");
});

check("all cases declare native action, oracle seed, and artifact plan", () => {
  for (const item of manifest.cases) {
    assert(item.dispatch === "playwright-native", `${item.caseId} dispatch mismatch`);
    assert(Array.isArray(item.actions) && item.actions.length > 0, `${item.caseId} actions missing`);
    assert(item.actions.every(action => action.dispatch === "playwright-native"), `${item.caseId} non-native action`);
    assert(item.oracle?.sourceKind && item.oracle?.expectedBehaviorSha256, `${item.caseId} oracle seed missing`);
    assert(item.artifacts?.screenshot && item.artifacts?.trace && item.artifacts?.browserConsole && item.artifacts?.serverLog,
      `${item.caseId} artifact plan missing`);
    assert(item.accountRole && item.viewport?.width > 0 && item.viewport?.height > 0 && item.theme,
      `${item.caseId} role/viewport/theme missing`);
  }
});

check("REVIEW4-56 requires exact typed product workflows for all 424 cases", () => {
  assert(manifest.schema === "media-server.v390-ui-native-exact-cases.v2", "REVIEW3-41 manifest schema v2 missing");
  const workflowIds = [];
  const workflowClassCounts = {};
  for (const item of manifest.cases) {
    const workflow = item.workflow;
    assert(workflow?.schema === "media-server.v390-ui-case-native-workflow.v2", `${item.caseId} REVIEW4-56 workflow schema missing`);
    assert(workflow.workflowId === `${item.caseId}:native-workflow`, `${item.caseId} workflow ID mismatch`);
    workflowIds.push(workflow.workflowId);
    workflowClassCounts[workflow.workflowClass] = (workflowClassCounts[workflow.workflowClass] || 0) + 1;
    for (const field of ["setup", "inputs", "controlSequence", "expectedResults", "cleanup"]) {
      assert(Array.isArray(workflow[field]) && workflow[field].length > 0, `${item.caseId} ${field} missing`);
    }
    assert(workflow.inputs.some(input => input.actualValue !== undefined || input.seedReference?.fixtureId),
      `${item.caseId} actual workflow input missing`);
    assert(workflow.primaryControl?.applicability === "required" ||
      workflow.primaryControl?.applicability === "not-applicable",
    `${item.caseId} primary control applicability missing`);
    assert(typeof workflow.primaryControl.accountRole === "string" && workflow.primaryControl.accountRole.length > 0,
      `${item.caseId} primary control account role missing`);
    const requiresActionRoleBinding = workflow.primaryControl.route !== item.screenRoute ||
      workflow.primaryControl.accountRole !== item.accountRole;
    const actionRoleBinding = workflow.setup.find(setup => setup.kind === "bind-action-role-session");
    if (requiresActionRoleBinding) {
      assert(actionRoleBinding?.accountRole === workflow.primaryControl.accountRole &&
        actionRoleBinding?.route === workflow.primaryControl.route && actionRoleBinding?.required === true,
      `${item.caseId} cross-route/role action session binding missing`);
    } else {
      assert(!actionRoleBinding, `${item.caseId} redundant action role session binding forbidden`);
    }
    if (workflow.primaryControl.applicability === "required") {
      assert(typeof workflow.primaryControl.selector === "string" && workflow.primaryControl.selector.length > 0,
        `${item.caseId} exact primary control missing`);
      assert(!isRouteRootSelector(workflow.primaryControl.selector), `${item.caseId} route-root primary control forbidden`);
      assert(typeof workflow.primaryControl.expectedVisible === "boolean" &&
        typeof workflow.primaryControl.expectedEnabled === "boolean",
      `${item.caseId} primary control visibility/enabled contract missing`);
      assertSourceLocator(workflow.primaryControl.sourceLocator, `${item.caseId} primary control`);
      if (["actionable", "form-submit", "persisted-mutation"].includes(workflow.workflowClass)) {
        assert(workflow.primaryControl.expectedVisible === true && workflow.primaryControl.expectedEnabled === true,
          `${item.caseId} actionable primary control must be visible/enabled`);
      }
    } else {
      assert(["read-only-state", "hidden-disabled", "negative-route"].includes(workflow.workflowClass),
        `${item.caseId} control not-applicable is forbidden for ${workflow.workflowClass}`);
      assert(typeof workflow.primaryControl.reason === "string" && workflow.primaryControl.reason.length > 0,
        `${item.caseId} control not-applicable reason missing`);
      assertSourceLocator(workflow.primaryControl.sourceLocator, `${item.caseId} not-applicable action/state`);
      assertSourceLocator(workflow.primaryControl.readbackLocator, `${item.caseId} not-applicable readback`);
    }
    const endpointCount = workflow.productAction?.endpoint ? 1 : 0;
    const localActionCount = workflow.productAction?.localAction ? 1 : 0;
    assert(endpointCount + localActionCount === 1, `${item.caseId} product action must declare exactly one endpoint or local action`);
    if (workflow.productAction.endpoint) {
      assert(/^(GET|POST|PUT|DELETE)$/.test(workflow.productAction.endpoint.method || ""),
        `${item.caseId} product endpoint method missing`);
      assert(String(workflow.productAction.endpoint.path || "").startsWith("/"),
        `${item.caseId} product endpoint path missing`);
      assert(Array.isArray(workflow.productAction.endpoint.allowedStatuses) &&
        workflow.productAction.endpoint.allowedStatuses.length > 0,
      `${item.caseId} product endpoint status missing`);
      if (workflow.workflowClass === "form-submit") {
        assert(!hasMixedSuccessAndErrorStatuses(workflow.productAction.endpoint.allowedStatuses),
          `${item.caseId} form broad mixed success/error status set forbidden`);
        const submitAction = workflow.controlSequence.find(action => action.kind === "submit-form");
        assert(submitAction?.uiLifecycle?.schema === "media-server.v390-ui-form-lifecycle.v1" &&
          submitAction.uiLifecycle.adapter && Array.isArray(submitAction.uiLifecycle.fieldControls),
        `${item.caseId} typed form UI lifecycle missing`);
        assert(submitAction.uiLifecycle.fieldControls.map(field => field.name).join(",") ===
          submitAction.fields.join(","), `${item.caseId} typed form field order drift`);
      }
      if (workflow.workflowClass === "persisted-mutation") {
        const persistedAction = workflow.controlSequence.find(action => action.kind === "execute-persisted-action");
        assert(persistedAction?.uiLifecycle?.adapter && persistedAction.uiLifecycle.fixtureBinding?.fixtureId,
          `${item.caseId} persisted UI lifecycle adapter/binding missing`);
        assert(persistedAction.uiLifecycle.fixtureBinding.fixtureId ===
          workflow.inputs.find(input => input.kind === "reversible-fixture-record")?.actualValue?.id,
        `${item.caseId} persisted UI lifecycle fixture binding drift`);
      }
    } else {
      assert(workflow.productAction.localAction.type && workflow.productAction.localAction.target &&
        workflow.productAction.localAction.effect,
      `${item.caseId} local product action incomplete`);
    }
    assert(workflow.expectedProductState?.identity && workflow.expectedProductState?.locator?.file,
      `${item.caseId} expected product state missing`);
    assert(workflow.independentReadback?.identity && workflow.independentReadback?.locator?.file,
      `${item.caseId} independent readback missing`);
    assertSourceLocator(workflow.expectedProductState.locator, `${item.caseId} expected product state`);
    assertSourceLocator(workflow.independentReadback.locator, `${item.caseId} independent readback`);
    assert(workflow.expectedProductState.identity !== workflow.independentReadback.identity,
      `${item.caseId} state/readback identity self-compare forbidden`);
    assert(locatorIdentity(workflow.expectedProductState.locator) !== locatorIdentity(workflow.independentReadback.locator),
      `${item.caseId} state/readback locator self-compare forbidden`);
    if (workflow.workflowClass === "persisted-mutation" || workflow.workflowClass === "form-submit") {
      assert(workflow.cleanup.some(cleanup => {
        const inverseCount = cleanup.inverseAction?.endpoint ? 1 : 0;
        const inverseLocalCount = cleanup.inverseAction?.localAction ? 1 : 0;
        return ["restore-fixture-state", "delete-created-fixture"].includes(cleanup.kind) &&
          cleanup.beforeSnapshotRef && inverseCount + inverseLocalCount === 1 &&
          cleanup.afterReadback?.identity &&
          ["absent", "equal-before", "inactive-or-equal-before"].includes(cleanup.afterReadback?.expectation) &&
          cleanup.readback?.identity && cleanup.readback?.locator?.file;
      }),
      `${item.caseId} mutation cleanup restore/delete readback missing`);
    } else {
      assert(workflow.cleanup.some(cleanup => cleanup.kind === "no-op-cleanup" && cleanup.persistedMutation === false),
        `${item.caseId} nonmutation no-op cleanup missing`);
    }
    if (workflow.workflowClass === "form-submit") {
      const formInput = workflow.inputs.find(input => input.kind === "form-values");
      assert(formInput?.submit === true,
        `${item.caseId} form submit input missing`);
      assert(!containsLiteralAuthMaterial(formInput.actualValue), `${item.caseId} form auth literal forbidden`);
      assert(workflow.controlSequence.some(action => action.kind === "submit-form"),
        `${item.caseId} form submit action missing`);
      assert(!workflow.controlSequence.some(action => action.kind === "assert-form-contract"),
        `${item.caseId} form contract-only action forbidden`);
    }
    if (!item.controlAction.selector) {
      assert(workflow.primaryControl.applicability === "not-applicable" &&
        ["read-only-state", "hidden-disabled", "negative-route"].includes(workflow.workflowClass),
      `${item.caseId} selector-null generic workflow forbidden`);
      if (workflow.workflowClass === "negative-route") {
        assert(workflow.controlSequence.some(action => ["navigate", "navigate-negative"].includes(action.kind)) &&
          workflow.productAction.endpoint?.method === "GET" &&
          JSON.stringify(workflow.productAction.endpoint.allowedStatuses) === JSON.stringify([404]),
        `${item.caseId} selector-null exact negative-route readback action missing`);
      } else {
        assert(workflow.controlSequence.some(action => ["assert-product-state", "assert-product-boundary"].includes(action.kind)),
          `${item.caseId} selector-null exact product readback action missing`);
      }
    }
    const serialized = JSON.stringify(workflow);
    assert(!serialized.includes("runtime-control"), `${item.caseId} runtime-control is forbidden`);
    assert(!workflow.controlSequence.some(action => action.kind === "interact"), `${item.caseId} generic interact is forbidden`);
    assert(!serialized.includes('"submit":false'), `${item.caseId} submit:false is forbidden`);
    assert(!serialized.includes('"selector":"body"') && !serialized.includes('"selector":"body.'),
      `${item.caseId} body/route-root fallback is forbidden`);
    const runtimeReadbacks = workflow.controlSequence.filter(action => action.kind === "verify-independent-readback");
    if (workflow.workflowClass === "negative-route") {
      assert(runtimeReadbacks.length === 0, `${item.caseId} negative route must use its status readback`);
    } else {
      assert(runtimeReadbacks.length === 1, `${item.caseId} executable independent readback step missing`);
      const runtimeReadback = runtimeReadbacks[0];
      assert(runtimeReadback.readbackIdentity === workflow.independentReadback.identity &&
        runtimeReadback.expectedStateIdentity === workflow.expectedProductState.identity &&
        runtimeReadback.expectedBehaviorSha256 === workflow.expectedProductState.expectedBehaviorSha256 &&
        runtimeReadback.runtimeEvidenceRequired === true &&
        runtimeReadback.staticLocatorIsNotRuntimePass === true,
      `${item.caseId} independent readback action binding mismatch`);
      assert(workflow.controlSequence.indexOf(runtimeReadback) > 0,
        `${item.caseId} independent readback must follow the product action`);
    }
  }
  assert(new Set(workflowIds).size === 424, "workflow IDs must be unique");
  const expectedWorkflowClassCounts = {
    "read-only-state": 287,
    "form-submit": 15,
    "persisted-mutation": 35,
    actionable: 40,
    "negative-route": 2,
    "hidden-disabled": 45,
  };
  for (const [workflowClass, expectedCount] of Object.entries(expectedWorkflowClassCounts)) {
    assert(workflowClassCounts[workflowClass] === expectedCount,
      `${workflowClass} workflow count mismatch: ${workflowClassCounts[workflowClass] || 0}/${expectedCount}`);
  }
  assert(Object.values(workflowClassCounts).every(count => count > 0), "all six workflow classes must be nonzero");
  assert(Object.values(workflowClassCounts).reduce((sum, count) => sum + count, 0) === 424,
    "workflow class total must be exact 424");
  assert(!runnerSource.includes("interactWithRuntimeControl"), "runner generic runtime-control function is forbidden");
  assert(!runnerSource.includes('strategy: "runtime-control"'), "runner runtime-control strategy is forbidden");
  for (const forbidden of ["routeRootSelector", "body.ops-shell", "body.client-shell", "body.auth-shell", "body.product-shell"]) {
    assert(!nativeLibrarySource.includes(forbidden), `native workflow library fallback forbidden: ${forbidden}`);
  }

  const hiddenCases = manifest.cases.filter(item => ["#opsEventRuleIdInput", "#opsVaRuleIdInput"].includes(item.controlAction.selector));
  assert(hiddenCases.length > 0, "hidden control cases missing");
  for (const item of hiddenCases) {
    assert(item.workflow.controlSequence.some(action => action.kind === "assert-hidden-control"),
      `${item.caseId} hidden control must use a hidden assertion`);
    assert(!item.workflow.controlSequence.some(action => ["click", "fill", "select", "set-checked"].includes(action.kind)),
      `${item.caseId} hidden control must not be actionable`);
  }
  const requiredHiddenDisabled = manifest.cases
    .filter(item => item.workflow.workflowClass === "hidden-disabled" &&
      item.workflow.primaryControl.applicability === "required");
  assert(JSON.stringify(requiredHiddenDisabled.map(item => item.caseId).sort()) ===
    JSON.stringify(["RULE-017", "UI-022", "UI-111"]),
  `hidden/disabled exact control set drift: ${requiredHiddenDisabled.map(item => item.caseId).join(",")}`);
  assert(requiredHiddenDisabled.every(item =>
    item.workflow.controlSequence.some(action => ["assert-hidden-control", "assert-disabled-control"].includes(action.kind))),
  "hidden/disabled exact controls must use explicit state assertions");

  assert(manifest.cases.every(item => item.workflow.setup.some(setup => setup.kind === "seed-reviewed-state")),
    "all 424 cases must declare reviewed state seed");
  assert(manifest.cases.every(item => item.workflow.expectedResults.every(result =>
    /^[a-f0-9]{64}$/.test(result.expectedBehaviorSha256) && result.stateLocator?.file && result.readbackLocator?.file)),
  "all 424 cases must bind expected result state/readback locators");
  for (const caseId of ["SRC-038", "CLIENT-007"]) {
    const item = manifest.cases.find(candidate => candidate.caseId === caseId);
    assert(item?.controlAction.selector === '[data-testid="client-dashboard-safe-summary"]',
      `${caseId} rendered template selector was not resolved`);
    assert(item.workflow.controlSequence.some(action => action.kind === "assert-visible-read-model"),
      `${caseId} rendered selector must be a visible read-model workflow`);
  }
  const crossRoleCases = new Map([
    ["AUTH-014", "admin"],
    ["AUTH-015", "admin"],
    ["AUTH-033", "admin"],
    ["AUTH-037", "admin"],
    ["AUTH-038", "admin"],
    ["AUTH-039", "anonymous"],
  ]);
  for (const [caseId, accountRole] of crossRoleCases) {
    const item = manifest.cases.find(candidate => candidate.caseId === caseId);
    assert(item?.workflow.primaryControl.accountRole === accountRole,
      `${caseId} exact action role mismatch`);
    assert(item.workflow.setup.some(setup => setup.kind === "bind-action-role-session" &&
      setup.accountRole === accountRole && setup.route === item.workflow.primaryControl.route),
    `${caseId} exact action role session missing`);
  }
  const exactAuthWorkflowCases = new Map([
    ["AUTH-005", {
      selector: '[data-testid="auth-setup-form"] button[type="submit"]',
      route: "/setup", accountRole: "anonymous", method: "POST", path: "/setup",
    }],
    ["AUTH-007", {
      selector: '[data-testid="auth-login-form"] button[type="submit"]',
      route: "/login", accountRole: "anonymous", method: "POST", path: "/login",
    }],
    ["AUTH-014", {
      selector: "#user-save-selected",
      route: "/ops/users", accountRole: "admin", method: "POST", path: "/ops/api/users",
    }],
    ["AUTH-015", {
      selector: '#invite-create-form button[type="submit"]',
      route: "/ops/users", accountRole: "admin", method: "POST", path: "/ops/api/invites",
    }],
  ]);
  for (const [caseId, expected] of exactAuthWorkflowCases) {
    const item = manifest.cases.find(candidate => candidate.caseId === caseId);
    assert(item?.workflow.workflowClass === "form-submit", `${caseId} exact auth form workflow missing`);
    assert(item.workflow.primaryControl.selector === expected.selector &&
      item.workflow.primaryControl.route === expected.route &&
      item.workflow.primaryControl.accountRole === expected.accountRole,
    `${caseId} exact auth primary control mismatch`);
    assert(item.workflow.productAction.endpoint?.method === expected.method &&
      item.workflow.productAction.endpoint?.path === expected.path,
    `${caseId} exact auth endpoint mismatch`);
  }
  const correctedRuleWorkflows = new Map([
    ["UI-036", ["actionable", "[data-vlm-rule-draft-index]", null]],
    ["RULE-007", ["read-only-state", null, "/ops/rules"]],
    ["RULE-011", ["persisted-mutation", "#opsRulesComposerSave", "/lab/analysis/va-rules/{fixtureId}"]],
    ["RULE-012", ["persisted-mutation", "#opsRulesComposerSave", "/lab/analysis/va-rules/{fixtureId}"]],
    ["RULE-016", ["persisted-mutation", "#opsRulesComposerSave", "/lab/analysis/va-rules/{fixtureId}"]],
    ["RULE-025", ["read-only-state", null, "/ops/rules"]],
    ["RULE-030", ["persisted-mutation", "#opsRulesComposerSave", "/lab/analysis/profiles/{fixtureId}"]],
    ["RULE-073", ["persisted-mutation", "#opsRulesComposerSave", "/lab/analysis/rules/{fixtureId}"]],
    ["RULE-075", ["persisted-mutation", "#opsRulesComposerSave", "/lab/analysis/rules/{fixtureId}"]],
    ["RULE-101", ["actionable", "#opsRulesComposerSave", null]],
    ["RULE-102", ["actionable", "#opsEventRuleTypeSelect", null]],
  ]);
  for (const [caseId, [workflowClass, selector, endpointPath]] of correctedRuleWorkflows) {
    const item = manifest.cases.find(candidate => candidate.caseId === caseId);
    assert(item?.workflow.workflowClass === workflowClass, `${caseId} exact workflow class mismatch`);
    assert(item.workflow.primaryControl.selector === selector, `${caseId} exact primary control mismatch`);
    assert((item.workflow.productAction.endpoint?.path || null) === endpointPath,
      `${caseId} exact product endpoint mismatch`);
  }
  const rule101 = manifest.cases.find(item => item.caseId === "RULE-101");
  assert(rule101.workflow.productAction.localAction?.verificationEndpoint?.path ===
    "/lab/analysis/va-rules/{fixtureId}" &&
    JSON.stringify(rule101.workflow.productAction.localAction.verificationEndpoint.allowedStatuses) === "[400]" &&
    rule101.workflow.expectedResults[0].completion.localTransition.forbiddenRequests.some(request =>
      request.methods.includes("PUT") && request.pathPrefix === "/lab/analysis/va-rules/"),
  "RULE-101 UI no-write/API-400 split contract missing");
});

check("REVIEW4-56 rejects fallback no-submit generic and self-comparison workflows", () => {
  expectInvalid("workflow-cleanup", mutate(value => { value.cases[0].workflow.cleanup = []; }), "workflow cleanup missing");
  expectInvalid("workflow-id-duplicate", mutate(value => {
    value.cases[1].workflow.workflowId = value.cases[0].workflow.workflowId;
  }), "workflow IDs contain duplicates");
  expectInvalid("generic-workflow-action", mutate(value => {
    value.cases[0].workflow.controlSequence.push({ kind: "interact", dispatch: "playwright-native" });
  }), "action/workflow drift");
  expectInvalid("route-root-fallback", mutate(value => {
    value.cases[0].workflow.primaryControl = {
      ...value.cases[0].workflow.primaryControl,
      applicability: "required", selector: "body", expectedVisible: true, expectedEnabled: true,
    };
  }), "route-root primary control forbidden");
  const formCaseIndex = manifest.cases.findIndex(item => item.workflow?.workflowClass === "form-submit");
  expectInvalid("form-submit-false", mutate(value => {
    value.cases[formCaseIndex].workflow.inputs.find(input => input.kind === "form-values").submit = false;
  }), "submit:false is forbidden");
  expectInvalid("form-contract-only", mutate(value => {
    const item = value.cases[formCaseIndex];
    item.workflow.controlSequence = item.workflow.controlSequence.map(action =>
      action.kind === "submit-form" ? { ...action, kind: "assert-form-contract" } : action);
    item.actions = structuredClone(item.workflow.controlSequence);
  }), "form submit action missing");
  expectInvalid("form-mixed-status", mutate(value => {
    value.cases[formCaseIndex].workflow.productAction.endpoint.allowedStatuses = [302, 400];
  }), "form broad mixed success/error status set forbidden");
  const authFormCaseIndex = manifest.cases.findIndex(item => item.workflow?.workflowClass === "form-submit" &&
    Object.keys(item.workflow.inputs.find(input => input.kind === "form-values")?.actualValue || {})
      .some(field => /password|token|confirm/i.test(field)));
  expectInvalid("form-literal-secret", mutate(value => {
    const formInput = value.cases[authFormCaseIndex].workflow.inputs.find(input => input.kind === "form-values");
    const secretField = Object.keys(formInput.actualValue).find(field => /password|token|confirm/i.test(field));
    formInput.actualValue[secretField] = "checked-in-secret";
  }), "form auth literal forbidden");
  const mutationCaseIndex = manifest.cases.findIndex(item => item.workflow?.workflowClass === "persisted-mutation");
  expectInvalid("mutation-cleanup-inverse-missing", mutate(value => {
    value.cases[mutationCaseIndex].workflow.cleanup[0].inverseAction = { endpoint: null, localAction: null };
  }), "mutation cleanup inverse/readback missing");
  const selectorNullIndex = manifest.cases.findIndex(item => !item.controlAction.selector);
  expectInvalid("selector-null-generic", mutate(value => {
    const item = value.cases[selectorNullIndex];
    item.workflow.primaryControl = {
      ...item.workflow.primaryControl,
      applicability: "required", selector: "body.ops-shell", expectedVisible: true, expectedEnabled: true,
    };
  }), "route-root primary control forbidden");
  expectInvalid("state-readback-self-compare", mutate(value => {
    const item = value.cases[0];
    item.workflow.independentReadback.identity = item.workflow.expectedProductState.identity;
    item.workflow.independentReadback.locator = structuredClone(item.workflow.expectedProductState.locator);
  }), "state/readback identity self-compare forbidden");
  expectInvalid("dual-action-declaration", mutate(value => {
    value.cases[0].workflow.productAction.localAction = {
      type: "generic", target: "runtime", effect: "unknown",
    };
  }), "product action must declare exactly one endpoint or local action");
  const unknown = structuredClone(canonical);
  const candidate = unknown.cases.find(item => item.testId === "UI-001");
  candidate.controlAction.selector = "#unclassified-runtime-control";
  let failed = false;
  try {
    buildNativeExactManifest({ canonical: unknown, implementation });
  } catch (error) {
    failed = true;
    assert(String(error.message).includes("canonical primary control source missing"),
      `unexpected unknown selector error: ${error.message}`);
  }
  assert(failed, "unclassified selector must fail manifest generation");
});

check("runner owns native execution, role state, first-fail, and artifact fields", () => {
  for (const snippet of [
    "createNativePlaywrightAdapter",
    "playwright-native",
    "role state missing",
    "not run after previous native case failure",
    "screenshotPath",
    "tracePath",
    "browserConsolePath",
    "serverLogReference",
    "uiFulltestPass: false",
  ]) {
    assert(runnerSource.includes(snippet), `runner source missing ${snippet}`);
  }
  const encounteredSetupKinds = [...new Set(manifest.cases.flatMap(item =>
    item.workflow.setup.map(setup => setup.kind)))].sort();
  const encounteredActionKinds = [...new Set(manifest.cases.flatMap(item =>
    item.workflow.controlSequence.map(action => action.kind)))].sort();
  const encounteredCleanupKinds = [...new Set(manifest.cases.flatMap(item =>
    item.workflow.cleanup.map(cleanup => cleanup.kind)))].sort();
  assert(JSON.stringify(extractRunnerKindAllowlist("supportedSetupKinds")) === JSON.stringify(encounteredSetupKinds),
    "runner setup allowlist does not exactly cover current workflow kinds");
  assert(JSON.stringify(extractRunnerKindAllowlist("supportedActionKinds")) === JSON.stringify(encounteredActionKinds),
    "runner action allowlist does not exactly cover current workflow kinds");
  assert(JSON.stringify(extractRunnerKindAllowlist("supportedCleanupKinds")) === JSON.stringify(encounteredCleanupKinds),
    "runner cleanup allowlist does not exactly cover current workflow kinds");
  for (const snippet of [
    "runner unsupported setup kind",
    "runner unsupported action kind",
    "runner unsupported cleanup kind",
    "independent readback failed for",
    "primary action remained pending after independent readback",
  ]) {
    assert(runnerSource.includes(snippet), `runner explicit non-synthetic failure missing: ${snippet}`);
  }
  for (const removedFailure of [
    "cross-role action session adapter is unavailable",
    "persisted workflow seed adapter is unavailable",
    "runtime secret adapter is unavailable",
    "mutation cleanup adapter is unavailable",
  ]) {
    assert(!runnerSource.includes(removedFailure), `runner still has an unavailable adapter boundary: ${removedFailure}`);
  }
  const runtimeModulePath = path.join(rootDir, "scripts/internal/v390_ui_case_runtime.mjs");
  assert(fs.existsSync(runtimeModulePath), "exact case runtime owner module missing");
  for (const snippet of [
    "createV390UiCaseRuntime",
    "prepareCase",
    "freshRoleStorageState",
    "resolveSecretRef",
    "switchActionRoleSession",
    "restoreCase",
    "verifyCleanupReadback",
  ]) {
    assert(runtimeSource.includes(snippet), `exact case runtime owner missing ${snippet}`);
    assert(runnerSource.includes(snippet), `exact runner is not wired to ${snippet}`);
  }
  const persistedSeedCount = manifest.cases.filter(item => item.workflow.setup.some(setup =>
    setup.kind === "seed-reviewed-state" && setup.persistedMutation === true)).length;
  const mutationCleanupCount = manifest.cases.filter(item => item.workflow.cleanup.some(cleanup =>
    ["restore-fixture-state", "delete-created-fixture"].includes(cleanup.kind))).length;
  const crossRoleCount = manifest.cases.filter(item => item.workflow.setup.some(setup =>
    setup.kind === "bind-action-role-session" && setup.accountRole !== item.accountRole)).length;
  const secretRefCount = manifest.cases.filter(item => JSON.stringify(item.workflow.inputs).includes("secretRef")).length;
  assert(persistedSeedCount === 50, `persisted seed closure drift: ${persistedSeedCount}/50`);
  assert(mutationCleanupCount === 50, `mutation cleanup closure drift: ${mutationCleanupCount}/50`);
  assert(crossRoleCount === 6, `cross-role closure drift: ${crossRoleCount}/6`);
  assert(secretRefCount === 11, `secretRef case closure drift: ${secretRefCount}/11`);
  assert(runnerSource.indexOf("validateRunnerWorkflowCompatibility(manifest.cases)") <
    runnerSource.indexOf("if (options.planOnly)"),
  "plan-only must validate runner workflow compatibility before reporting PASS");
});

check("self-contained runtime closes invite, auth readback, preference, and visual-session gaps", () => {
  for (const snippet of [
    "normalizeInviteSeedResponse",
    "seedExactAccessRequestFixture",
    "resolveAuthoritativeReadback",
    "cleanupExpectedRecord",
    "freshAuthoritativeReadback",
    "verifyMutationReadback",
  ]) {
    assert(runtimeSource.includes(snippet), `case runtime missing P0 closure: ${snippet}`);
  }
  const accessStoreRoot = fs.mkdtempSync("/private/tmp/media_server_v390_ui-access-seed-");
  try {
    const usersFile = path.join(accessStoreRoot, "users.json");
    fs.writeFileSync(usersFile, '{"users":[],"invites":[],"accessRequests":[]}\n', { mode: 0o600 });
    const seeded = seedExactAccessRequestFixture(usersFile, {
      requestId: "reviewed-request-id",
      username: "reviewed-request-user",
      viewId: "9001",
    });
    const stored = JSON.parse(fs.readFileSync(usersFile, "utf8")).accessRequests;
    assert(seeded.requestId === "reviewed-request-id" && stored.length === 1 &&
      stored[0].requestId === "reviewed-request-id" && stored[0].status === "pending",
    "access-request seed did not preserve the reviewed fixture identity/status");
  } finally {
    fs.rmSync(accessStoreRoot, { recursive: true, force: true });
  }
  assert(!runtimeSource.includes("fetch(`${httpBase}/client/api/access-requests`"),
    "access-request seed must not accept a random product-generated ID");
  assert(runtimeSource.includes('inviteId || value?.requestId'),
    "authoritative record identity must include inviteId/requestId");
  assert(runtimeSource.includes('mode: "whole-response"'),
    "client preference cleanup must compare the authoritative whole response");
  for (const collection of [
    '"/ops/api/sources"',
    '"/ops/api/views"',
    '"/ops/api/users"',
    '"/ops/api/access-requests"',
  ]) {
    assert(runtimeSource.includes(collection), `authoritative collection readback missing: ${collection}`);
  }
  assert(runtimeSource.includes('mode: "source-view-pair"'),
    "ONVIF/source channel cleanup must use paired source/view readback");
  assert(runtimeSource.includes("buildOnvifPairPayload"),
    "ONVIF runtime seed/restore must use the product source+publishedView schema");
  assert(!runtimeSource.includes("if (!allowedStatuses.includes(response.status) && !tolerate)"),
    "runtime readback must not tolerate undeclared 401/405/500 responses");

  assert(environmentSource.includes('.media_server.client_live_layout_preferences.jsonl'),
    "self-contained environment does not own the product preference storage path");
  assert(!environmentSource.includes('path.join(state.temporaryRoot, "ui-preferences.json")'),
    "self-contained environment still snapshots a non-product preference file");

  const visualFunction = runnerSource.slice(
    runnerSource.indexOf("async function executeVisualMatrix"),
    runnerSource.indexOf("async function executeWorkflowSetup"),
  );
  assert(visualFunction.includes("caseRuntime.freshRoleStorageState"),
    "visual matrix must acquire a fresh role session for every probe");
  assert(!visualFunction.includes("resolveRoleState("),
    "visual matrix must not reuse bootstrap storage state after exact mutations");

  const adapterSource = fs.readFileSync(path.join(rootDir, "scripts/internal/v390_ui_native_adapter.mjs"), "utf8");
  for (const snippet of ["safePersistedRequestBodyProjection", "safeFormResponseProjection"]) {
    assert(adapterSource.includes(snippet), `native adapter safe identity capture missing: ${snippet}`);
  }
  assert(!adapterSource.includes("safeResponseBody = payload"),
    "native adapter must not persist raw form responses containing invite/auth material");

  for (const snippet of [
    "preparePersistedUiLifecycle",
    "assertPersistedRequestBinding",
    "prepareFormSubmitUiLifecycle",
    "applyTypedFormInputs",
    "captureFormResponseIdentity",
    "runtimeMutationReadback",
    "primaryFailure",
    "cleanupFailure",
    "browserCloseFailure",
  ]) {
    assert(runnerSource.includes(snippet), `exact runner P0/P1 lifecycle closure missing: ${snippet}`);
  }
  const persistedCases = manifest.cases.filter(item => item.workflow.workflowClass === "persisted-mutation");
  assert(persistedCases.length === 35, `persisted lifecycle count drift: ${persistedCases.length}/35`);
  assert(new Set(persistedCases.map(item => item.workflow.controlSequence
    .find(action => action.kind === "execute-persisted-action")?.uiLifecycle?.adapter)).size >= 8,
  "persisted workflows must use domain-specific UI lifecycle adapters");
  const channelCases = persistedCases.filter(item => item.workflow.controlSequence
    .find(action => action.kind === "execute-persisted-action")?.uiLifecycle?.adapter === "channel-source-view-pair");
  assert(channelCases.length === 10 && channelCases.every(item => {
    const binding = item.workflow.controlSequence
      .find(action => action.kind === "execute-persisted-action")?.uiLifecycle?.requestBinding;
    return ["atomic-pair", "ordered-source-view-pair"].includes(binding?.mode) &&
      Array.isArray(binding.expectedRequests) &&
      binding.expectedRequests.length === (binding.mode === "atomic-pair" ? 1 : 2);
  }), "channel workflows must bind the atomic ONVIF or ordered source/view request transaction");
  const formCases = manifest.cases.filter(item => item.workflow.workflowClass === "form-submit");
  assert(formCases.length === 15, `form lifecycle count drift: ${formCases.length}/15`);
  assert(formCases.every(item => item.workflow.controlSequence.find(action => action.kind === "submit-form")
    ?.uiLifecycle?.fieldControls.every(field => ["fill", "select", "check", "hidden-binding"].includes(field.control))),
  "form workflows must classify every field by typed UI control");
  for (const snippet of ["liveGridSize", "liveDensity", "liveDockSide", "ordered-source-view-pair"]) {
    assert(runnerSource.includes(snippet), `persisted UI lifecycle mutation/binding closure missing: ${snippet}`);
  }

  for (const caseId of ["SRC-001", "SRC-002", "SRC-003", "SRC-004", "SRC-005", "SRC-017"]) {
    const cleanup = manifest.cases.find(item => item.caseId === caseId)?.workflow.cleanup[0];
    assert(cleanup?.inverseAction?.localAction?.type === "restore-source-view-snapshot" &&
      cleanup.afterReadback?.expectation === "inactive-or-equal-before",
    `${caseId} soft-delete endpoint must not masquerade as absent cleanup`);
  }
  const mutationCases = manifest.cases.filter(item =>
    ["persisted-mutation", "form-submit"].includes(item.workflow.workflowClass));
  assert(mutationCases.every(item => {
    const cleanup = item.workflow.cleanup.find(candidate =>
      ["restore-fixture-state", "delete-created-fixture"].includes(candidate.kind));
    return cleanup?.inverseAction?.localAction?.type?.startsWith("restore-") &&
      ["equal-before", "inactive-or-equal-before"].includes(cleanup.afterReadback?.expectation);
  }), "every persisted/form mutation must restore owned state or prove source/view inactive isolation");
  for (const snippet of ["restoreProductMutationState", "restoreSourceViewState"]) {
    assert(runtimeSource.includes(snippet), `runtime product-memory cleanup closure missing: ${snippet}`);
  }

  for (const snippet of [
    "roleStateMapPath",
    "storageStatePaths",
    "serverLogPath",
    "registrySeedPayloadPaths",
    "artifactPaths",
    "loopback",
  ]) {
    assert(runtimeSource.includes(snippet), `runtime descriptor containment closure missing: ${snippet}`);
  }
});

check("case runtime keeps generated secrets ephemeral and rejects state path escape", () => {
  const temporaryRoot = fs.mkdtempSync("/private/tmp/media_server_v390_ui-case-runtime-");
  try {
    const stateFile = path.join(temporaryRoot, "users.json");
    const roleMapPath = path.join(temporaryRoot, "roles.json");
    const descriptorPath = path.join(temporaryRoot, "descriptor.json");
    const serverLogPath = path.join(temporaryRoot, "server.log");
    const eventStoragePath = path.join(temporaryRoot, "events.jsonl");
    fs.writeFileSync(stateFile, '{"users":[]}\n', { mode: 0o600 });
    fs.writeFileSync(roleMapPath, `${JSON.stringify({ schema: "media-server.v390-ui-role-state-map.v1", roles: {} })}\n`, { mode: 0o600 });
    fs.writeFileSync(serverLogPath, "", { mode: 0o600 });
    fs.writeFileSync(eventStoragePath, "", { mode: 0o600 });
    const descriptorFixture = stateFiles => ({
      schema: "media-server.v390-ui-runtime-descriptor.v1",
      temporaryRoot,
      httpBase: "http://127.0.0.1:1",
      httpPort: 1,
      roleStateMapPath: roleMapPath,
      serverLogPath,
      eventStoragePath,
      registrySeedPayloadPaths: {},
      artifactPaths: {},
      stateFiles,
      auth: { usersFile: stateFile, usernames: { operator: "operator" }, storageStatePaths: {} },
    });
    fs.writeFileSync(descriptorPath, `${JSON.stringify({
      ...descriptorFixture([stateFile]),
    })}\n`, { mode: 0o600 });
    const runtime = createV390UiCaseRuntime({
      rootDir,
      httpBase: "http://127.0.0.1:1",
      runtimeDescriptorPath: descriptorPath,
      roleStateMapPath: roleMapPath,
      roleSecretsJson: JSON.stringify({ roles: { operator: "contract-current-secret" }, refs: {} }),
    });
    const item = { caseId: "CONTRACT", accountRole: "operator" };
    const generated = runtime.resolveSecretRef("CONTRACT:fixture-password", { item, field: "password" });
    assert(generated === runtime.resolveSecretRef("CONTRACT:fixture-password", { item, field: "confirm" }),
      "same runtime secretRef must resolve consistently inside one case runtime");
    assert(generated !== "contract-current-secret" && generated.length >= 24,
      "new fixture password must be generated independently of the current role password");
    assert(runtime.resolveSecretRef("CONTRACT:fixture-current-password", { item, field: "currentPassword" }) === "contract-current-secret",
      "current-password secretRef must bind the actual role credential");
    assert(!fs.readFileSync(descriptorPath, "utf8").includes(generated),
      "generated runtime secret leaked into the safe descriptor");

    const escapedPath = path.join("/private/tmp", `v390-case-runtime-escape-${process.pid}.json`);
    fs.writeFileSync(escapedPath, "{}\n", { mode: 0o600 });
    fs.writeFileSync(descriptorPath, `${JSON.stringify({
      ...descriptorFixture([escapedPath]),
      auth: { usersFile: stateFile, usernames: {}, storageStatePaths: {} },
    })}\n`, { mode: 0o600 });
    let rejected = false;
    try {
      createV390UiCaseRuntime({ rootDir, httpBase: "http://127.0.0.1:1", runtimeDescriptorPath: descriptorPath, roleStateMapPath: roleMapPath });
    } catch (error) {
      rejected = String(error.message).includes("escapes temporary root");
    }
    fs.rmSync(escapedPath, { force: true });
    assert(rejected, "runtime descriptor accepted a state file outside its temporary root");
  } finally {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
});

check("canonical requested route and runtime screen route are explicit projections", () => {
  const canonicalById = new Map(canonical.cases.map(item => [item.testId, item]));
  const projected = manifest.cases.filter(item => item.canonicalRoute !== item.screenRoute);
  assert(projected.length === 39, `canonical/runtime route projection count mismatch: ${projected.length}`);
  for (const item of manifest.cases) {
    assert(item.canonicalRoute === canonicalById.get(item.caseId)?.route,
      `${item.caseId} canonical requested route drift`);
    assert(item.disposition === "negative-route" || !item.screenRoute.includes("/api/"),
      `${item.caseId} runtime screen route retains API ownership route`);
  }
});

check("runner and producer share typed capture schema while qualifier is independently implemented", () => {
  for (const source of [nativeLibrarySource, runnerSource, producerSource]) {
    assert(source.includes("v390_ui_requested_observed_schema.mjs"),
      "requested/observed capture schema is not shared by runner and producer");
  }
  assert(policyLibrarySource.includes("v390_ui_policy_v4_independent_qualifier.mjs") &&
    !policyLibrarySource.includes("v390_ui_requested_observed_schema.mjs"),
  "Policy qualifier reuses the producer requested/observed validator");
  assert(runnerSource.includes("canonicalRequestedProjection(item)"),
    "runner requested canonical projection missing");
  assert(!runnerSource.includes("requested: {\n      route: item.screenRoute"),
    "legacy requested screen-route/role object remains");
  assert(runnerSource.includes("observeRequestedObservedState"),
    "runner does not independently observe screen route/role/viewport/theme/control action");
  const adapterSource = fs.readFileSync(path.join(rootDir, "scripts/internal/v390_ui_native_adapter.mjs"), "utf8");
  assert(adapterSource.includes("response.status === 401") &&
    adapterSource.includes("whoami observation failed with status") &&
    adapterSource.includes("whoami observation returned an invalid authenticated principal"),
  "adapter folds whoami transport/status/schema failures into anonymous role");
  assert(!adapterSource.includes("principal = null"),
    "adapter retains whoami failure-to-anonymous fallback");
  assert(!producerSource.includes("result.observed || result.requested"),
    "producer still falls back from missing observed to requested");
  const source = manifest.cases.find(item => item.caseId === "SRC-031");
  const requested = canonicalRequestedProjection(source);
  const observed = expectedRuntimeObservation(source);
  assert(requested.route === "/ops/api/onvif/import-draft" && observed.screenRoute === "/ops/sources",
    "SRC-031 canonical API request/runtime screen projection mismatch");
  assert(validateRequestedObservedEnvelope({
    requested,
    observed,
    canonicalCase: canonical.cases.find(item => item.testId === source.caseId),
    nativeCase: source,
  }).length === 0, "valid requested/observed envelope rejected");

  const negativeCases = [
    ["requested-role-alias", value => { value.requested.role = value.requested.accountRole; }, "requested-fields-mismatch"],
    ["requested-control-missing", value => { delete value.requested.controlAction; }, "requested-fields-mismatch"],
    ["observed-route-alias", value => { value.observed.route = value.observed.screenRoute; }, "observed-fields-mismatch"],
    ["observed-missing", value => { value.observed = undefined; }, "observed-object-missing"],
    ["observed-api-route", value => { value.observed.screenRoute = value.requested.route; }, "observed-screenRoute-api-route-forbidden"],
    ["viewport-string", value => { value.observed.viewport.width = "390"; }, "observed-viewport-invalid"],
    ["theme-invalid", value => { value.observed.theme = "system"; }, "observed-theme-invalid"],
    ["control-manifest-copy", value => { value.observed.controlAction = structuredClone(value.requested.controlAction); }, "observed-controlAction-fields-mismatch"],
  ];
  for (const [label, mutateEnvelope, expectedError] of negativeCases) {
    const candidate = { requested: structuredClone(requested), observed: structuredClone(observed) };
    mutateEnvelope(candidate);
    const errors = validateRequestedObservedEnvelope({
      ...candidate,
      canonicalCase: canonical.cases.find(item => item.testId === source.caseId),
      nativeCase: source,
    });
    assert(errors.includes(expectedError), `${label} did not fail with ${expectedError}: ${errors.join(",")}`);
  }
  for (const [label, mutateObserved, expectedError] of [
    ["raw-extra-alias", value => { value.route = value.screenRoute; }, "observed-fields-mismatch"],
    ["raw-missing-control-state", value => { delete value.controlAction.exists; }, "observed-controlAction-fields-mismatch"],
    ["raw-missing-provenance", value => { delete value.provenance.accountRole; }, "observed-provenance-fields-mismatch"],
    ["raw-forged-provenance", value => { value.provenance.theme = "runner-default"; }, "observed-provenance-theme-mismatch"],
  ]) {
    const raw = structuredClone(observed);
    mutateObserved(raw);
    let message = "";
    try { runtimeObservedProjection(raw); } catch (error) { message = String(error?.message || error); }
    assert(message.includes(expectedError), `${label} raw observation drift was normalized away: ${message}`);
  }
});

check("missing, reordered, unsupported, API-screen, and field drift are rejected", () => {
  expectInvalid("missing", mutate(value => value.cases.pop()), "canonical exact case count");
  expectInvalid("reordered", mutate(value => value.cases.reverse()), "canonical ordered case IDs");
  expectInvalid("unsupported", mutate(value => { value.cases[0].disposition = "unsupported"; }), "unsupported disposition");
  expectInvalid("api-screen", mutate(value => { value.cases[0].screenRoute = "/ops/api/audit"; }), "raw API screen route");
  expectInvalid("role-drift", mutate(value => { value.cases[0].accountRole = "admin"; }), "accountRole drift");
  expectInvalid("viewport-drift", mutate(value => { value.cases[0].viewport.width = 1180; }), "viewport drift");
  expectInvalid("oracle-drift", mutate(value => { value.cases[0].oracle.expectedBehaviorSha256 = "0".repeat(64); }), "oracle digest drift");
});

const result = runChecks();
console.log("");
console.log("== v3.9.0 exact native UI case contract summary ==");
console.log("- canonicalExactCases: 424");
console.log("- positiveNative: 423");
console.log("- negativeRoute: 1");
console.log("- unsupported: 0");
console.log(`- pass: ${result.pass}`);
console.log(`- fail: ${result.fail}`);
console.log("- actualBrowserExecution: not-run-by-this-contract");
if (result.fail > 0) process.exit(1);

function mutate(fn) {
  const value = structuredClone(manifest);
  fn(value);
  return value;
}

function expectInvalid(label, value, expectedMessage) {
  let failed = false;
  try {
    validateNativeExactManifest({ manifest: value, canonical, implementation });
  } catch (error) {
    failed = true;
    assert(String(error.message).includes(expectedMessage), `${label} missing error ${expectedMessage}: ${error.message}`);
  }
  assert(failed, `${label} must fail`);
}

function countKinds(items) {
  const counts = {};
  for (const item of items) counts[item.kind] = (counts[item.kind] || 0) + 1;
  return counts;
}

function isRouteRootSelector(value) {
  return value === "body" || /^body\.(?:ops|client|auth|product)-shell$/.test(value || "");
}

function locatorIdentity(value) {
  return `${value?.file || ""}#${value?.symbol || ""}#${value?.contextSha256 || ""}`;
}

function assertSourceLocator(locator, label) {
  assert(locator?.file && locator?.anchor, `${label} source locator file/anchor missing`);
  assert(!path.isAbsolute(locator.file) && !locator.file.split(/[\\/]/).includes(".."),
    `${label} source locator path must stay repository-relative`);
  assert(trackedFiles.has(locator.file), `${label} source locator is not tracked: ${locator.file}`);
  const source = sourceCache.has(locator.file)
    ? sourceCache.get(locator.file)
    : fs.readFileSync(path.join(rootDir, locator.file), "utf8");
  sourceCache.set(locator.file, source);
  assert(source.includes(locator.anchor), `${label} source anchor missing from ${locator.file}`);
  assert(/^[a-f0-9]{64}$/.test(locator.contextSha256 || ""), `${label} context digest missing`);
  assert(locator.anchorSha256 === sha256Text(locator.anchor), `${label} source anchor digest drift`);
  if (locator.sourceFileSha256) {
    const sourceFileSha256 = sha256Text(source);
    assert(locator.sourceFileSha256 === sourceFileSha256, `${label} source file digest drift`);
    assert(locator.contextSha256 === sourceFileSha256,
      `${label} override context digest must bind the actual tracked source file`);
  }
}

function hasMixedSuccessAndErrorStatuses(statuses) {
  const values = Array.isArray(statuses) ? statuses : [];
  return values.some(status => status >= 200 && status < 400) &&
    values.some(status => status >= 400 && status < 600);
}

function containsLiteralAuthMaterial(value) {
  if (!value || typeof value !== "object") return false;
  for (const [key, fieldValue] of Object.entries(value)) {
    if (/^(?:password|currentPassword|confirm|confirmPassword|token)$/i.test(key) &&
        (!fieldValue || typeof fieldValue !== "object" || Array.isArray(fieldValue) ||
         typeof fieldValue.secretRef !== "string" || fieldValue.secretRef.length === 0 ||
         fieldValue.redacted !== true)) {
      return true;
    }
    if (fieldValue && typeof fieldValue === "object" && containsLiteralAuthMaterial(fieldValue)) return true;
  }
  return false;
}

function extractRunnerKindAllowlist(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = runnerSource.match(new RegExp(`const ${escaped} = Object\\.freeze\\(\\[([\\s\\S]*?)\\]\\);`));
  assert(match, `runner allowlist missing: ${name}`);
  return [...match[1].matchAll(/"([^"]+)"/g)].map(item => item[1]).sort();
}

function sha256Text(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function check(name, fn) {
  checks.push({ name, fn });
}

function runChecks() {
  let pass = 0;
  let fail = 0;
  for (const item of checks) {
    try {
      item.fn();
      pass += 1;
      console.log(`[pass] ${item.name}`);
    } catch (error) {
      fail += 1;
      console.log(`[fail] ${item.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { pass, fail };
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), "utf8"));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
