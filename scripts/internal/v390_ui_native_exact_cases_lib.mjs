// 파일 용도: canonical 424 UI case를 native Playwright 실행 manifest로 생성하고 검증한다.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { allowedCompletionSources } from "./v390_ui_completion_oracle_lib.mjs";
import {
  canonicalRequestedProjection,
  expectedRuntimeObservation,
  validateRequestedObservedEnvelope,
} from "./v390_ui_requested_observed_schema.mjs";
import {
  buildExactRuntimeOracleCatalog,
  exactRuntimeOracleCaseIds,
  validateExactRuntimeOracleCatalog,
} from "./v390_ui_exact_oracle_catalog.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export const nativeExactManifestSchema = "media-server.v390-ui-native-exact-cases.v2";
export const canonicalManifestSchema = "media-server.ui-fulltest-canonical-case-manifest.v1";
export const implementationManifestSchema = "media-server.feature-implementation-evidence.v2";
export const caseNativeWorkflowSchema = "media-server.v390-ui-case-native-workflow.v2";
export const nativeExactPreExecutionFailureStatus = "pre-execution-failed";
export const nativeExactExecutionFailureStatus = "execution-failed";
export const review4WorkflowClasses = Object.freeze([
  "actionable",
  "form-submit",
  "persisted-mutation",
  "read-only-state",
  "hidden-disabled",
  "negative-route",
]);

const endpointOwnedActionCases = new Set([
  "AUTH-020",
  "SRC-008",
  "SRC-010",
  "SRC-019",
  "SRC-031",
]);

const endpointOwnedActionSpecs = Object.freeze({
  "AUTH-020": Object.freeze({ method: "POST", path: "/ops/api/users/{fixtureId}/disable", allowedStatuses: Object.freeze([200]) }),
  "SRC-008": Object.freeze({ method: "POST", path: "/ops/api/sources", allowedStatuses: Object.freeze([201]) }),
  "SRC-010": Object.freeze({ method: "DELETE", path: "/ops/api/sources/{fixtureId}", allowedStatuses: Object.freeze([200]) }),
  "SRC-019": Object.freeze({ method: "DELETE", path: "/ops/api/views/{fixtureId}", allowedStatuses: Object.freeze([200]) }),
  "SRC-031": Object.freeze({ method: "POST", path: "/ops/api/onvif/import-draft", allowedStatuses: Object.freeze([200]) }),
});

export function createNativeExactPreExecutionFailureSummary({
  error,
  manifest,
  canonical,
  phase = "manifest-validation",
} = {}) {
  const requestedExactCases = Array.isArray(canonical?.cases) ? canonical.cases.length : 424;
  const manifestCases = Array.isArray(manifest?.cases) ? manifest.cases : [];
  const caseIds = manifestCases.length === requestedExactCases
    ? manifestCases.map(item => item.caseId || item.testId || "")
    : Array.from({ length: requestedExactCases }, (_, index) => `not-run-${String(index + 1).padStart(3, "0")}`);
  const message = error instanceof Error ? error.message : String(error || "pre-execution validation failed");
  return {
    schema: "media-server.ui-automation-evidence.v4",
    result: "FAIL",
    executionStatus: nativeExactPreExecutionFailureStatus,
    failure: {
      phase,
      error: message,
    },
    actualBrowserExecution: false,
    requestedExactCases,
    executed: 0,
    notRun: requestedExactCases,
    unsupported: 0,
    uiFulltestPass: false,
    policyV4Qualification: {
      status: "not-run",
      reason: nativeExactPreExecutionFailureStatus,
    },
    childResourcesAcquired: false,
    cleanupRequired: false,
    coverage: {
      targetCount: requestedExactCases,
      obligationIds: caseIds,
      captured: 0,
      fail: 0,
      notRun: requestedExactCases,
      unsupported: 0,
      unapprovedExclusions: 0,
      manualIntervention: 0,
    },
    cases: caseIds.map(caseId => ({
      testId: caseId,
      caseId,
      status: "not-run",
      rawOutcome: "not-run-pre-execution-failure",
      reason: message,
    })),
    evidenceBoundary: "pre-execution validation failed before browser or case resources were acquired; this is neither UI execution nor Policy v4 evidence",
  };
}

export function createNativeExactExecutionFailureSummary({
  error,
  manifest,
  results = [],
  phase = "native-execution",
} = {}) {
  const manifestCases = Array.isArray(manifest?.cases) ? manifest.cases : [];
  const resultById = new Map(results.map(item => [item.caseId || item.testId, item]));
  const message = error instanceof Error ? error.message : String(error || "native execution failed");
  const cases = manifestCases.map(item => {
    const result = resultById.get(item.caseId) || {
      caseId: item.caseId,
      featureId: item.featureId,
      status: "not-run",
      reason: "not run after native execution failure",
    };
    const status = result.status === "PASS" ? "captured" : result.status;
    return {
      testId: item.caseId,
      caseId: item.caseId,
      featureId: result.featureId || item.featureId,
      status,
      rawOutcome: result.status === "PASS"
        ? "completed"
        : (result.status === "FAIL" ? "runner-error" : "not-run-after-first-failure"),
      reason: result.reason || (result.status === "PASS" ? "" : message),
      diagnosticArtifacts: result.diagnosticArtifacts || undefined,
    };
  });
  const captured = cases.filter(item => item.rawOutcome === "completed").length;
  const fail = cases.filter(item => item.rawOutcome === "runner-error").length;
  const notRun = cases.filter(item => item.rawOutcome === "not-run-after-first-failure").length;
  return {
    schema: "media-server.ui-automation-evidence.v4",
    contractFixture: false,
    result: "FAIL",
    executionStatus: nativeExactExecutionFailureStatus,
    executionKind: "actual-native-visible-dom",
    failure: { phase, error: message },
    actualBrowserExecution: captured + fail > 0,
    requestedExactCases: manifestCases.length,
    executed: captured + fail,
    notRun,
    unsupported: 0,
    uiFulltestPass: false,
    policyV4Qualification: {
      status: "not-run",
      reason: nativeExactExecutionFailureStatus,
    },
    childResourcesAcquired: true,
    cleanupRequired: true,
    coverage: {
      targetCount: manifestCases.length,
      obligationIds: manifestCases.map(item => item.caseId),
      captured,
      fail,
      notRun,
      unsupported: 0,
      unapprovedExclusions: 0,
      manualIntervention: 0,
    },
    cases,
    evidenceBoundary: "native execution or raw evidence production failed; Policy v4 qualification was not run",
  };
}

export function validateNativeExactCaptureSummary(summary, expectedExactCases = 424) {
  const errors = [];
  if (summary?.schema !== "media-server.ui-automation-evidence.v4") errors.push("raw capture schema mismatch");
  if (summary?.contractFixture !== false) errors.push("raw capture cannot be a contract fixture");
  if (summary?.result !== "CAPTURED") errors.push("raw capture result must be CAPTURED");
  if (summary?.executionKind !== "actual-native-visible-dom") errors.push("raw capture execution kind mismatch");
  if (summary?.uiFulltestPass !== false) errors.push("raw capture cannot claim UI fulltest PASS");
  if (summary?.manualIntervention !== false) errors.push("raw capture manual intervention mismatch");
  if (summary?.selectedAdapter?.engine !== "playwright-native" || summary?.selectedAdapter?.fallbackUsed !== false) {
    errors.push("raw capture native adapter mismatch");
  }
  if (Number(summary?.coverage?.targetCount) !== expectedExactCases ||
      Number(summary?.coverage?.captured) !== expectedExactCases ||
      Number(summary?.coverage?.fail) !== 0 || Number(summary?.coverage?.notRun) !== 0 ||
      Number(summary?.coverage?.unsupported) !== 0 || Number(summary?.coverage?.unapprovedExclusions) !== 0 ||
      Number(summary?.coverage?.manualIntervention) !== 0) {
    errors.push("raw capture exact coverage mismatch");
  }
  if (!Array.isArray(summary?.cases) || summary.cases.length !== expectedExactCases ||
      summary.cases.some(item => item.rawOutcome !== "completed")) {
    errors.push("raw capture case ledger mismatch");
  }
  return errors;
}

export function validateNativeExactPreExecutionFailureSummary(summary, expectedExactCases = 424) {
  const errors = [];
  if (summary?.schema !== "media-server.ui-automation-evidence.v4") errors.push("pre-execution summary schema mismatch");
  if (summary?.result !== "FAIL") errors.push("pre-execution summary result must remain FAIL");
  if (summary?.executionStatus !== nativeExactPreExecutionFailureStatus) errors.push("pre-execution status mismatch");
  if (!String(summary?.failure?.phase || "") || !String(summary?.failure?.error || "")) errors.push("pre-execution failure phase/error missing");
  if (summary?.actualBrowserExecution !== false) errors.push("pre-execution summary cannot claim browser execution");
  if (Number(summary?.executed) !== 0 || Number(summary?.notRun) !== expectedExactCases) errors.push("pre-execution executed/notRun mismatch");
  if (Number(summary?.coverage?.targetCount) !== expectedExactCases ||
      Number(summary?.coverage?.captured) !== 0 ||
      Number(summary?.coverage?.notRun) !== expectedExactCases ||
      Number(summary?.coverage?.fail) !== 0) {
    errors.push("pre-execution coverage mismatch");
  }
  if (!Array.isArray(summary?.cases) || summary.cases.length !== expectedExactCases ||
      summary.cases.some(item => item.status !== "not-run")) errors.push("pre-execution case ledger mismatch");
  if (summary?.uiFulltestPass !== false) errors.push("pre-execution summary cannot claim UI PASS");
  if (summary?.policyV4Qualification?.status !== "not-run") errors.push("pre-execution summary cannot claim Policy v4 eligibility");
  if (summary?.childResourcesAcquired !== false || summary?.cleanupRequired !== false) errors.push("pre-execution resource lifecycle mismatch");
  return errors;
}

export function validateNativeExactCleanupContract({
  stageAttempted,
  summary,
  acceptanceEnvironmentCleanup,
  expectedExactCases = 424,
} = {}) {
  const errors = [];
  if (!stageAttempted) return errors;
  if (!summary) return ["UI child summary missing"];
  const preExecution = summary.executionStatus === nativeExactPreExecutionFailureStatus;
  if (preExecution) {
    errors.push(...validateNativeExactPreExecutionFailureSummary(summary, expectedExactCases));
    if (summary.childResourcesAcquired === false && summary.cleanupRequired === false) {
      if (acceptanceEnvironmentCleanup?.status !== "PASS" ||
          acceptanceEnvironmentCleanup?.serversStopped !== true ||
          acceptanceEnvironmentCleanup?.portsClean !== true ||
          acceptanceEnvironmentCleanup?.temporaryArtifactsRemoved !== true ||
          acceptanceEnvironmentCleanup?.runtimeEvidence !== true ||
          acceptanceEnvironmentCleanup?.verificationSource !== "pid-port-artifact-before-after-observation") {
        errors.push("acceptance-owned UI environment cleanup is not measured PASS");
      }
      return errors;
    }
  }
  if (summary.cleanup?.serversStopped !== true ||
      summary.cleanup?.portsClean !== true ||
      summary.cleanup?.temporaryArtifactsRemoved !== true) {
    errors.push("UI child resources were acquired without measured cleanup");
  }
  return errors;
}

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

const formContracts = new Map([
  ['[data-testid="auth-setup-form"]', { method: "post", action: "/setup", fields: ["username", "password", "confirm"] }],
  ['[data-testid="auth-login-form"]', { method: "post", action: "/login", fields: ["username", "password"] }],
  ['[data-testid="auth-password-change-form"]', { method: "post", action: "/password/change", fields: ["currentPassword", "password", "confirm"] }],
  ['[data-testid="auth-invite-setup-form"]', { method: "post", action: "/invite/setup", fields: ["token", "password", "confirm"] }],
  ["#request-form", { method: "", action: "", fields: ["username", "displayName", "contact", "viewId", "reason"] }],
]);

const localOnlyMutationCases = new Set([
  "UI-026", "UI-036", "UI-046", "RULE-092", "RULE-093", "RULE-094", "RULE-095", "RULE-096", "RULE-100", "RULE-101", "RULE-102", "RULE-103", "RULE-104", "RULE-111", "CLIENT-002", "CLIENT-005", "SAFE-038",
]);
const forcedPersistedMutationCases = new Set([
  "RULE-011", "RULE-012", "RULE-016", "RULE-026", "RULE-027", "RULE-028", "RULE-029", "RULE-030",
  "RULE-031", "RULE-032", "RULE-033", "RULE-034", "RULE-035", "RULE-036", "RULE-037", "RULE-038", "RULE-039",
  "RULE-041", "RULE-042", "RULE-043", "RULE-044", "RULE-045", "RULE-046", "RULE-047", "RULE-048", "RULE-049",
  "RULE-050", "RULE-051", "RULE-052", "RULE-053",
  "RULE-054", "RULE-055", "RULE-056", "RULE-057", "RULE-058", "RULE-059", "RULE-060", "RULE-061", "RULE-062",
  "RULE-063", "RULE-064", "RULE-065", "RULE-066", "RULE-067", "RULE-068", "RULE-069", "RULE-070", "RULE-071",
  "RULE-072", "RULE-074",
  "RULE-076", "RULE-077", "RULE-078", "RULE-079", "RULE-080", "RULE-081", "RULE-082", "RULE-083",
  "RULE-084", "RULE-085", "RULE-086", "RULE-087", "RULE-088", "RULE-089", "RULE-090", "RULE-091",
  "RULE-073", "RULE-075",
]);
const endpointActionCases = new Set();
const readOnlyBoundaryCases = new Set(["RULE-007", "RULE-025"]);
const explicitHiddenControlCases = new Set(["RULE-017"]);
const formMutationCases = new Set(["UI-004", "UI-005", "UI-008", "AUTH-036"]);
const supportedAccountRoles = new Set(["anonymous", "admin", "operator", "viewer"]);
const actionRoleOverrides = new Map([
  ["AUTH-014", "admin"],
  ["AUTH-015", "admin"],
  ["AUTH-033", "admin"],
  ["AUTH-037", "admin"],
  ["AUTH-038", "admin"],
  ["AUTH-039", "anonymous"],
  ["RULE-097", "viewer"],
]);
const formSubmitOverrides = new Map([
  ["UI-008", {
    selector: "#request-form",
    submitSelector: '#request-form button[type="submit"]',
    route: "/client/request-access",
    method: "POST",
    path: "/client/api/access-requests",
    fields: ["username", "displayName", "contact", "viewId", "reason"],
    allowedStatuses: [201],
  }],
  ["UI-004", {
    selector: '[data-testid="auth-password-change-form"]',
    submitSelector: '[data-testid="auth-password-change-form"] button[type="submit"]',
    route: "/password/change",
    method: "POST",
    path: "/password/change",
    fields: ["currentPassword", "password", "confirm"],
    allowedStatuses: [302],
  }],
  ["UI-005", {
    selector: 'form[action="/logout"]',
    submitSelector: 'form[action="/logout"] button[type="submit"]',
    route: "/ops/home",
    method: "POST",
    path: "/logout",
    fields: [],
    allowedStatuses: [302],
  }],
  ["AUTH-036", {
    selector: "#request-form",
    submitSelector: '#request-form button[type="submit"]',
    route: "/client/request-access",
    method: "POST",
    path: "/client/api/access-requests",
    fields: ["username", "displayName", "contact", "viewId", "reason"],
    allowedStatuses: [201],
  }],
  ["AUTH-005", {
    selector: '[data-testid="auth-setup-form"]',
    submitSelector: '[data-testid="auth-setup-form"] button[type="submit"]',
    route: "/setup",
    method: "POST",
    path: "/setup",
    fields: ["username", "password", "confirm"],
    allowedStatuses: [302],
  }],
  ["AUTH-007", {
    selector: '[data-testid="auth-login-form"]',
    submitSelector: '[data-testid="auth-login-form"] button[type="submit"]',
    route: "/login",
    method: "POST",
    path: "/login",
    fields: ["username", "password"],
    allowedStatuses: [403],
  }],
  ["AUTH-014", {
    selector: "#user-form",
    submitSelector: "#user-save-selected",
    route: "/ops/users",
    method: "POST",
    path: "/ops/api/users",
    fields: ["username", "displayName", "password", "confirmPassword", "role", "viewId"],
    allowedStatuses: [201],
  }],
  ["AUTH-015", {
    selector: "#invite-create-form",
    submitSelector: '#invite-create-form button[type="submit"]',
    route: "/ops/users",
    method: "POST",
    path: "/ops/api/invites",
    fields: ["username", "displayName", "role", "viewId", "ttlSeconds"],
    allowedStatuses: [201],
  }],
  ["AUTH-033", {
    selector: "#invite-create-form",
    submitSelector: '#invite-create-form button[type="submit"]',
    route: "/ops/users",
    method: "POST",
    path: "/ops/api/invites",
    fields: ["username", "displayName", "role", "viewId", "ttlSeconds"],
    allowedStatuses: [201],
  }],
]);

const mutationPrimaryControls = new Map([
  ["UI-004", { selector: '[data-testid="auth-password-change-form"] button[type="submit"]', route: "/password/change" }],
  ["UI-005", { selector: 'form[action="/logout"] button[type="submit"]', route: "/ops/home" }],
  ["UI-023", { selector: "#opsVlmSaveProfile", route: "/ops/vlm" }],
  ["UI-026", { selector: '[data-vlm-option-id="local-qwen3-vl-4b"]', route: "/ops/vlm" }],
  ["UI-029", { selector: '[data-delete-vlm-profile="ui-029-review4-fixture"]', route: "/ops/vlm" }],
  ["UI-109", { selector: "#channel-save-selected", route: "/ops/sources" }],
  ["AUTH-018", { selector: "#user-save-selected", route: "/ops/users" }],
  ["AUTH-019", { selector: "#user-save-selected", route: "/ops/users" }],
  ["AUTH-036", { selector: '#request-form button[type="submit"]', route: "/client/request-access" }],
  ["AUTH-037", { selector: '[data-request-approve="auth-037-review4-fixture"]', route: "/ops/users" }],
  ["AUTH-038", { selector: '[data-request-reject="auth-038-review4-fixture"]', route: "/ops/users" }],
  ["AUTH-039", { selector: '#request-form button[type="submit"]', route: "/client/request-access" }],
  ["SRC-001", { selector: "#channel-save-selected", route: "/ops/sources" }],
  ["SRC-002", { selector: "#channel-save-selected", route: "/ops/sources" }],
  ["SRC-003", { selector: "#channel-save-selected", route: "/ops/sources" }],
  ["SRC-004", { selector: "#channel-save-selected", route: "/ops/sources" }],
  ["SRC-005", { selector: "#channel-save-selected", route: "/ops/sources" }],
  ["SRC-009", { selector: "#channel-save-selected", route: "/ops/sources" }],
  ["SRC-017", { selector: "#channel-save-selected", route: "/ops/sources" }],
  ["SRC-018", { selector: "#channel-save-selected", route: "/ops/sources" }],
  ["SRC-066", { selector: "#channel-save-selected", route: "/ops/sources" }],
  ["RULE-004", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-005", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-006", { selector: '[data-ops-rule-action="delete-va"]', route: "/ops/rules" }],
  ["RULE-008", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-011", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-012", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-016", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-018", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-019", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-020", { selector: '[data-ops-rule-action="delete-event-template"]', route: "/ops/rules" }],
  ["RULE-022", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-023", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-024", { selector: '[data-ops-rule-action="delete-profile"]', route: "/ops/rules" }],
  ["RULE-026", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-027", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-028", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-029", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-030", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-031", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-032", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-033", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-034", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-035", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-036", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-037", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-038", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-039", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-041", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-042", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-043", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-044", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-045", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-046", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-047", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-048", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-049", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-050", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-051", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-052", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-053", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-054", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-055", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-056", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-057", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-058", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-059", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-060", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-061", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-062", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-063", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-064", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-065", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-066", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-067", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-068", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-069", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-070", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-071", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-072", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-074", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-076", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-077", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-078", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-079", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-080", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-081", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-082", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-083", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-084", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-085", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-086", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-087", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-088", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-089", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-090", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-091", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-092", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-093", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-094", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-095", { selector: "#opsRulesRefresh", route: "/ops/rules" }],
  ["RULE-096", { selector: "#opsRulesRefresh", route: "/ops/rules" }],
  ["RULE-100", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-073", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-075", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-101", { selector: "#opsRulesComposerSave", route: "/ops/rules" }],
  ["RULE-102", { selector: "#opsEventRuleTypeSelect", route: "/ops/rules" }],
  ["RULE-103", { selector: "#opsRulesRefresh", route: "/ops/rules" }],
  ["RULE-104", { selector: "[data-approval-gated-rule-draft-route]", route: "/ops/events" }],
  ["RULE-111", { selector: "[data-vlm-rule-draft-index]", route: "/ops/rules" }],
  ["EVT-021", { selector: "[data-event-review-save]", route: "/ops/events" }],
  ["CLIENT-002", { selector: '[data-action="toggle-playback"]', route: "/client/live" }],
  ["CLIENT-005", { selector: "#liveAllStop", route: "/client/live" }],
  ["CLIENT-009", { selector: "#liveSaveLayoutPreference", route: "/client/live" }],
  ["SAFE-038", { selector: "[data-vlm-rule-draft-index]", route: "/ops/rules" }],
  ["UI-036", { selector: "[data-vlm-rule-draft-index]", route: "/ops/rules" }],
  ["UI-046", { selector: "[data-incident-rule-draft-route]", route: "/ops/events" }],
]);

const readModelPrimaryOverrides = new Map([
  ["UI-009", { selector: '[data-testid="ops-home-page"]', route: "/ops/home" }],
  ["RULE-001", { selector: "#opsVaRuleRows > tr:first-child", route: "/ops/rules" }],
  ["RULE-002", { selector: "#opsEventRuleRows > tr:first-child", route: "/ops/rules" }],
  ["RULE-003", { selector: "#opsProfileRows > tr:first-child", route: "/ops/rules" }],
  ["RULE-010", { selector: "#opsVaRuleTemplateSeedSelect", route: "/ops/rules" }],
  ["RULE-013", { selector: "#opsVaRuleGeometrySummary", route: "/ops/rules" }],
  ["RULE-021", { selector: "#opsEventRuleDetailSummary", route: "/ops/rules" }],
  ["RULE-097", { selector: '[data-testid="client-live-source-tree"]', route: "/client/live" }],
  ["RULE-098", { selector: "#opsRulesValidationList", route: "/ops/rules" }],
  ["EVT-003", { selector: "#dashRootCauseList", route: "/ops/dashboard" }],
  ["EVT-018", { selector: "#alertDeliveryTest", route: "/ops/events" }],
  ["EVT-022", { selector: "#event-review-audit-list", route: "/ops/events" }],
  ["SAFE-053", { selector: "[data-incident-rule-draft-route]", route: "/ops/events" }],
  ["SAFE-060", { selector: '[data-testid="ops-operational-action-pack"]', route: "/ops/events" }],
  ["SAFE-061", { selector: '[data-testid="ops-rule-what-if-preview"]', route: "/ops/events" }],
]);

const overrideControlSourceCatalog = new Map([
  ["#dashIncidentTimelineSource", {
    file: "src/ingress/product_ui_server_pages.cpp",
    anchor: '<select id="dashIncidentTimelineSource" aria-label="출처">',
  }],
  ["#eventStorageBadges", {
    file: "src/ingress/product_ui_server_pages.cpp",
    anchor: '<div id="eventStorageBadges" class="badge-row"><span class="chip">로딩 중</span></div>',
  }],
  ["#alertDeliveryTest", {
    file: "src/ingress/product_ui_server_pages.cpp",
    anchor: '<button id="alertDeliveryTest" class="button-secondary" type="button">Fixture 전송</button>',
  }],
  ["#event-review-audit-list", {
    file: "src/ingress/product_ui_server_pages.cpp",
    anchor: '<div id="event-review-audit-list" class="audit-list" data-audit-area="events"></div>',
  }],
  ["#dashIncidentTimeline", {
    file: "src/ingress/product_ui_server_pages.cpp",
    anchor: '<div id="dashIncidentTimeline" class="root-cause-list">',
  }],
  ["#dashRootCauseList", {
    file: "src/ingress/product_ui_server_pages.cpp",
    anchor: '<div id="dashRootCauseList" class="root-cause-list">',
  }],
  ["#eventRecordRows", {
    file: "src/ingress/product_ui_server_pages.cpp",
    anchor: '<tbody id="eventRecordRows"><tr><td colspan="7">로딩 중</td></tr></tbody>',
  }],
  ["#opsRuntimeEvidenceWindowRows", {
    file: "src/ingress/product_ui_server_pages.cpp",
    anchor: '<div id="opsRuntimeEvidenceWindowRows" class="runtime-evidence-window-list">',
  }],
  [".client-preview-redaction-strip", {
    file: "src/ingress/webrtc_http_server.cpp",
    anchor: '<div class="client-preview-redaction-strip" data-client-review="admin-preview" data-admin-preview-state="',
  }],
  ['[data-testid="client-live-workspace"]', {
    file: "src/ingress/product_ui_client_scripts.cpp",
    anchor: '<div class="live-workspace-layout live-sketch-layout client-live-layout" data-testid="client-live-workspace"',
  }],
  ["#opsRulesRefresh", {
    file: "src/ingress/product_ui_server_pages.cpp",
    anchor: ')" << RefreshIconButtonHtml("opsRulesRefresh", "button-secondary", "새로고침") << R"(',
  }],
  ['[data-testid="ops-home-page"]', {
    file: "src/ingress/product_ui_server_pages.cpp",
    anchor: '<section class="panel ops-workspace ops-workspace-home" data-ops-panel="home" data-testid="ops-home-page">',
  }],
  ["#opsVaRuleRows > tr:first-child", {
    file: "src/ingress/product_ui_server_pages.cpp",
    anchor: '<tbody id="opsVaRuleRows"><tr><td colspan="9">로딩 중</td></tr></tbody>',
  }],
  ["#opsEventRuleRows > tr:first-child", {
    file: "src/ingress/product_ui_server_pages.cpp",
    anchor: '<tbody id="opsEventRuleRows"><tr><td colspan="6">로딩 중</td></tr></tbody>',
  }],
  ["#opsProfileRows > tr:first-child", {
    file: "src/ingress/product_ui_server_pages.cpp",
    anchor: '<tbody id="opsProfileRows"><tr><td colspan="7">로딩 중</td></tr></tbody>',
  }],
  ["#opsVaRuleTemplateSeedSelect", {
    file: "src/ingress/product_ui_server_pages.cpp",
    anchor: '<select id="opsVaRuleTemplateSeedSelect"></select>',
  }],
  ["#opsVaRuleGeometrySummary", {
    file: "src/ingress/product_ui_server_pages.cpp",
    anchor: '<p id="opsVaRuleGeometrySummary" class="form-note">미리보기 영역을 눌러 점을 추가합니다. 라인은 2점, 영역은 3점 이상이 필요합니다.</p>',
  }],
  ["#opsEventRuleDetailSummary", {
    file: "src/ingress/product_ui_server_pages.cpp",
    anchor: '<p id="opsEventRuleDetailSummary" class="form-note">조건, geometry, cooldown을 불러오는 중입니다.</p>',
  }],
  ['[data-testid="client-live-source-tree"]', {
    file: "src/ingress/product_ui_client_scripts.cpp",
    anchor: '<aside class="live-source-dock client-live-dock" data-testid="client-live-source-tree"',
  }],
  ["#opsRulesValidationList", {
    file: "src/ingress/product_ui_server_pages.cpp",
    anchor: '<div id="opsRulesValidationList" class="validation-list"></div>',
  }],
  ['[data-ops-rule-action="view-va"][data-ops-rule-id="9890"]', {
    file: "src/ingress/product_ui_page_scripts.cpp",
    anchor: "opsRuleActionButton('상세', 'view-va', id)",
  }],
  ['[data-testid="auth-setup-form"] button[type="submit"]', {
    file: "src/ingress/product_ui_auth_pages.cpp",
    anchor: 'out << R"(    <form class="auth-form auth-form-grid" method="post" action="/setup" data-testid="auth-setup-form">',
  }],
  ['[data-testid="auth-password-change-form"] button[type="submit"]', {
    file: "src/ingress/product_ui_auth_pages.cpp",
    anchor: 'out << R"(    <form class="auth-form auth-form-grid" method="post" action="/password/change" data-testid="auth-password-change-form">',
  }],
  ['form[action="/logout"] button[type="submit"]', {
    file: "src/ingress/product_ui_auth_pages.cpp",
    anchor: '<form method="post" action="/logout"><button class="button-secondary" type="submit">로그아웃</button></form>',
  }],
  ["#opsVlmSaveProfile", {
    file: "src/ingress/product_ui_server_pages.cpp",
    anchor: '<button id="opsVlmSaveProfile" class="button-primary" type="button">profile 저장</button>',
  }],
  ['[data-vlm-option-id="local-qwen3-vl-4b"]', {
    file: "src/ingress/product_ui_page_scripts.cpp",
    anchor: 'data-vlm-option-id="${escapeHtml(option.id)}"',
  }],
  ['[data-delete-vlm-profile="ui-029-review4-fixture"]', {
    file: "src/ingress/product_ui_page_scripts.cpp",
    anchor: 'data-delete-vlm-profile="${escapeHtml(profile.id || \'\')}"',
  }],
  ["#channel-save-selected", {
    file: "src/ingress/webrtc_http_server.cpp",
    anchor: '<button id="channel-save-selected" class="button-primary" type="submit" form="channel-form">저장</button>',
  }],
  ["#user-save-selected", {
    file: "src/ingress/webrtc_http_server.cpp",
    anchor: '<button id="user-save-selected" class="button-primary" type="submit" form="user-form">저장</button>',
  }],
  ['#request-form button[type="submit"]', {
    file: "src/ingress/product_ui_auth_pages.cpp",
    anchor: '<form id="request-form" class="auth-form auth-form-grid" data-testid="auth-access-request-form" data-access-route="request-access">',
  }],
  ["[data-request-approve]", {
    file: "src/ingress/product_ui_ops_users_script.cpp",
    anchor: 'data-request-approve="${escapeHtml(displayValue(request.requestId))}"',
  }],
  ["[data-request-reject]", {
    file: "src/ingress/product_ui_ops_users_script.cpp",
    anchor: 'data-request-reject="${escapeHtml(displayValue(request.requestId))}"',
  }],
  ['[data-request-approve="auth-037-review4-fixture"]', {
    file: "src/ingress/product_ui_ops_users_script.cpp",
    anchor: 'data-request-approve="${escapeHtml(displayValue(request.requestId))}"',
  }],
  ['[data-request-reject="auth-038-review4-fixture"]', {
    file: "src/ingress/product_ui_ops_users_script.cpp",
    anchor: 'data-request-reject="${escapeHtml(displayValue(request.requestId))}"',
  }],
  ["#opsRulesComposerSave", {
    file: "src/ingress/product_ui_server_pages.cpp",
    anchor: '<button id="opsRulesComposerSave" class="button-primary" type="button">저장</button>',
  }],
  ["#opsEventRuleTypeSelect", {
    file: "src/ingress/product_ui_server_pages.cpp",
    anchor: '<select id="opsEventRuleTypeSelect" aria-label="종류"></select>',
  }],
  ['[data-ops-rule-action="delete-va"]', {
    file: "src/ingress/product_ui_page_scripts.cpp",
    anchor: "opsRuleActionButton('삭제', 'delete-va', id, 'danger')",
  }],
  ['[data-ops-rule-action="delete-event-template"]', {
    file: "src/ingress/product_ui_page_scripts.cpp",
    anchor: "opsRuleActionButton('삭제', 'delete-event-template', id, 'danger')",
  }],
  ['[data-ops-rule-action="delete-profile"]', {
    file: "src/ingress/product_ui_page_scripts.cpp",
    anchor: "builtIn ? '' : opsRuleActionButton('삭제', 'delete-profile', id, 'danger')",
  }],
  ["[data-event-review-save]", {
    file: "src/ingress/product_ui_page_scripts.cpp",
    anchor: 'button type="button" class="button button-secondary button-compact" data-event-review-save',
  }],
  ['[data-action="toggle-playback"]', {
    file: "src/ingress/product_ui_client_scripts.cpp",
    anchor: 'data-action="toggle-playback" title="타일 ${tile.index + 1} 재생"',
  }],
  ["#liveAllStop", {
    file: "src/ingress/product_ui_client_scripts.cpp",
    anchor: '<button id="liveAllStop" class="ghost danger" type="button">전체 연결 해제</button>',
  }],
  ["#liveSaveLayoutPreference", {
    file: "src/ingress/product_ui_client_scripts.cpp",
    anchor: '<button id="liveSaveLayoutPreference" class="ghost" type="button">레이아웃 저장</button>',
  }],
  ["[data-vlm-rule-draft-index]", {
    file: "src/ingress/product_ui_page_scripts.cpp",
    anchor: 'data-vlm-rule-draft-index="${index}"',
  }],
  ["[data-incident-rule-draft-route]", {
    file: "src/ingress/product_ui_page_scripts.cpp",
    anchor: '<a class="button button-secondary button-compact" data-incident-rule-draft-route href="${escapeHtml(draftRoute)}">룰 draft 검토</a>',
  }],
  ['[data-testid="ops-operational-action-pack"]', {
    file: "src/ingress/product_ui_server_pages.cpp",
    anchor: '<section class="section-card ops-workspace-wide operational-action-pack" data-testid="ops-operational-action-pack" data-operational-action-pack="manual-workflow-links">',
  }],
  ['[data-testid="ops-rule-what-if-preview"]', {
    file: "src/ingress/product_ui_server_pages.cpp",
    anchor: '<section class="section-card ops-workspace-wide rule-what-if-preview" data-testid="ops-rule-what-if-preview" data-rule-what-if-preview="selected-incident-draft-only">',
  }],
  ["[data-approval-gated-rule-draft-route]", {
    file: "src/ingress/product_ui_page_scripts.cpp",
    anchor: 'data-approval-gated-rule-draft-route="manual-approval-staged-only"',
  }],
  ['#invite-create-form button[type="submit"]', {
    file: "src/ingress/webrtc_http_server.cpp",
    anchor: '<form id="invite-create-form" class="inline-form">',
  }],
]);

const fillControls = new Set([
  "#opsIncidentSearchInput",
  "#opsVlmDisabledReason",
  "#opsScenarioBuilderClasses",
  "#dashVaQualityFilterInput",
]);

const checkboxControls = new Set([
  "#opsVlmProfileEnabled",
  "#opsEventRuleLoiteringGroundPlaneToggle",
]);

const disabledControls = new Set(["#opsVlmExternalTransferWarningAck"]);
const hiddenControls = new Set(["#opsEventRuleIdInput", "#opsVaRuleIdInput"]);
const detailsControls = new Set(['[data-testid="ops-context-actions"]']);
const enabledControls = new Set([
  "#add-channel",
  "#opsRulesComposerSave",
  "#opsRulesRefresh",
  '[data-action="toggle-playback"]',
  "#liveAllStop",
  '[data-vlm-option-id="local-qwen3-vl-4b"]',
  "[data-vlm-rule-draft-index]",
  "#alertDeliveryTest",
]);
const linkControls = new Set(["#opsRulesReviewEventRecordLink", "[data-incident-rule-draft-route]", "[data-approval-gated-rule-draft-route]"]);

const selectControls = new Map([
  ["#opsEventRulePresetSelect", "road"],
  ["#opsVaRuleReidSelect", "assist"],
  ["#opsProfileDetectorSelect", "dummy"],
  ["#opsEventRuleModeSelect", "scenario"],
  ["#opsVaRuleTrackerSelect", "kalman-lite"],
  ["#opsEventRuleTriggerDirectionSelect", "forward"],
  ["#opsEventRuleTypeSelect", "re-entry"],
  ["#opsScenarioBuilderType", "re-entry"],
  ["#opsVlmRuleDraftKindSelect", "line-crossing"],
  ["#eventRecordsEvidenceSelect", "snapshot"],
  ["#dashIncidentTimelineSource", "log-tail"],
]);

const seededSelectControls = new Set(["#opsVaRuleTemplateSeedSelect"]);

const readModelControls = new Set([
  '[data-testid="client-live-action-reduction"]',
  '[data-testid="client-dashboard-shell"]',
  '[data-testid="client-dashboard-safe-summary"]',
  '[data-testid="client-safe-source-status-digest"]',
  ".client-viewer-events",
  ".ops-workspace-diagnostic-grid",
  "#clientDashboardPresetStatus",
  "#dashSiteClientNoticePreviewList",
  "#opsVlmPrivacyGuardList",
  "#opsVlmStatus",
  "#opsVlmRuntimeStatusList",
  "#v320ActionReadinessChecklistGrid",
  "#opsVlmEvaluationRows",
  '[data-testid="ops-incident-rule-suggestion-review"]',
  "#opsIncidentTriageBoardRows",
  "#dashRuntimeOpsList",
  '[data-testid="ops-operational-action-pack"]',
  '[data-testid="ops-rule-what-if-preview"]',
  "#opsV320ResolutionTimeline",
  "#eventStorageBadges",
  "#event-review-audit-list",
  "#dashIncidentTimeline",
  "#eventRecordRows",
  "#opsRuntimeEvidenceWindowRows",
  ".client-preview-redaction-strip",
  '[data-testid="client-live-workspace"]',
  "#v320SourceReliabilityGrid",
  "#v320AiReviewQualityGrid",
  "#v320OperatorResolutionFlowGrid",
  '[data-testid="client-safe-resolution-digest"]',
  "#v320ResolutionSearchMetricsGrid",
  "#v330IncidentSourceCorrelationGrid",
  "#v330OperatorRecheckRecoveryQueueGrid",
  '[data-testid="client-safe-source-status-digest"]',
  '[data-testid="source-reliability-search-metrics"]',
  '[data-testid="source-backup-recovery-handoff"]',
  '[data-testid="ops-continuity-drill-workspace"]',
  '[data-testid="client-safe-maintenance-digest"]',
  "#v350IncidentCommandHandoffGrid",
  '[data-testid="client-impact-forecast"]',
  '[data-testid="client-operations-notice"]',
  "#dashCommandWorkspaceExportBundleMap",
  "#dashCommandWorkspaceVlmAssistedExplanation",
  '[data-v360-simulation-workspace-entry="simulation-route-family"]',
  "#dashSimulationWorkspaceLedgerList > [data-v360-simulation-run-ledger-entry]:nth-child(2)",
  "#dashSimulationWorkspaceNoticePreviewList > [data-v360-client-notice-preview-entry]:first-child",
  "#dashSimulationWorkspaceWhatIfReplayList > [data-v360-rule-va-what-if-replay-entry]:first-child",
  "#dashSimulationWorkspaceExportBundleList > [data-v360-simulation-export-bundle-entry]:first-child",
  "#dashSimulationWorkspaceFieldEvidenceAdapterList > [data-v360-field-evidence-simulation-adapter-entry]:first-child",
  "#dashSimulationWorkspaceVlmAssistedExplanationList > [data-v360-vlm-assisted-simulation-explanation-entry]:first-child",
  "#dashSiteOperationsSiteList > [data-v370-site-operations-workspace-entry]:first-child",
  "#dashSiteClientNoticePreviewList > [data-v370-client-notice-by-site-view-group-entry]:first-child",
  "#dashSiteRuleVaWhatIfCandidateList > [data-v370-rule-va-what-if-by-site-entry]:first-child",
  "#dashSiteFieldEvidenceAttachmentList > [data-v370-field-evidence-attachment-entry]:first-child",
  "#dashSiteLimitedSafeExecutionPilotList > [data-v370-limited-safe-execution-pilot-entry]:first-child",
  "#dashSiteOutcomeReconciliationSourceList > [data-v370-outcome-reconciliation-entry]:first-child",
  "#dashSiteExportHandoffBundleList > [data-v370-export-handoff-bundle-entry]:first-child",
  "#dashActionControlRequestList > [data-v380-action-control-entry]:first-child",
  "#dashActionOutcomeSourceList > [data-v380-outcome-observer-entry]:first-child",
  "#dashActionReceiptBundleList > [data-v380-action-receipt-entry]:first-child",
  "#opsIncidentActionReadinessQueueRows",
  '[data-testid="client-action-notice-preview"]',
  '[data-testid="client-action-notice-preview"] .client-action-notice-item:first-child',
  "#opsVlmRuleDraftBridgeStatus",
  "#dashActionExecutionDeferralList",
  "#dashFieldEvidenceBridgeList",
  '[data-testid="auth-password-policy"]',
  "#channelScopePolicy",
  "#opsRulesValidationList",
  "#opsVaRuleTrackingSummary",
  "#opsVaRuleGeometryMinimumText",
  "#dashSimulationWorkspaceVlmAssistedExplanationList",
  "#opsEvidenceIntakeFieldReadinessRows",
  "#dashIncidentTimeline",
  "#dashReidAssistDecisionList",
  "#dashRootCauseList",
  '[data-testid="ops-scenario-builder"]',
  "#opsEventRuleSettingsHeading",
  "#opsEventRulePresetSummary",
  "#opsOperatorOutcomeMemoryRows",
  "#dashRuntimeTrendSparkline",
  "#dashRootCauseActionOutput",
  '[data-testid="ops-vlm-event-review-card"]',
  "#eventReviewRows",
  "#dashCommandWorkspaceLedgerList",
  "#opsRulesDetailPanel",
  "#opsApprovalGatedRuleDraftReadinessRows",
  '[data-testid="client-live-dock-event-feed"]',
  '[data-testid="client-live-va-overlay-toggle"]',
  '[data-testid="client-safe-followup-digest"]',
  '[data-testid="client-safe-incident-digest"]',
  '[data-testid="client-safe-event-digest"]',
]);

const localCompletionContracts = new Map([
  ["UI-026", {
    requiredRequests: [
      { sequence: 1, method: "GET", urlPath: "/ops/api/vlm/install-connection/dry-run", allowedStatuses: [200] },
    ],
    postconditions: [
      { selector: '[data-vlm-option-id="local-qwen3-vl-4b"]', property: "text", operator: "equals", value: "선택됨" },
      { selector: "#opsVlmSelectionSummary", property: "text", operator: "includes", value: "Qwen3-VL-4B" },
    ],
    forbiddenRequests: [
      { methods: ["POST", "PUT", "DELETE"], pathPrefix: "/ops/api/vlm/profiles" },
      { methods: ["POST", "PUT", "DELETE"], pathPrefix: "/ops/api/vlm/install-connection" },
    ],
  }],
  ["UI-036", {
    postconditions: [
      { selector: "#opsRulesDetailPanel", property: "hidden", operator: "equals", value: false },
      { selector: "#opsEventRulePresetSelect", property: "value", operator: "equals", value: "custom" },
      { selector: "#opsRulesStatus", property: "text", operator: "includes", value: "저장" },
    ],
    forbiddenRequests: [
      { methods: ["POST", "PUT", "DELETE"], pathPrefix: "/lab/analysis/rules" },
      { methods: ["POST", "PUT", "DELETE"], pathPrefix: "/lab/analysis/va-rules" },
    ],
  }],
  ["UI-046", {
    postconditions: [
      { selector: '[data-testid="ops-rules-page"]', property: "exists", operator: "equals", value: true },
      { selector: '[data-testid="ops-rules-page"]', property: "url", operator: "includes", value: "/ops/rules" },
    ],
    forbiddenRequests: [
      { methods: ["POST", "PUT", "DELETE"], pathPrefix: "/lab/analysis/rules" },
      { methods: ["POST", "PUT", "DELETE"], pathPrefix: "/lab/analysis/va-rules" },
    ],
  }],
  ["UI-049", {
    postconditions: [
      { selector: "#opsScenarioBuilderType", property: "value", operator: "equals", value: "re-entry" },
      { selector: "#opsScenarioBuilderBaseline", property: "text", operator: "includes", value: "reEntryZoneIds" },
      { selector: "#opsScenarioBuilderBaseline", property: "text", operator: "includes", value: "A→B" },
    ],
    forbiddenRequests: [
      { methods: ["POST", "PUT", "DELETE"], pathPrefix: "/lab/analysis/rules" },
      { methods: ["POST", "PUT", "DELETE"], pathPrefix: "/ops/api/events" },
    ],
  }],
  ["SRC-024", {
    postconditions: [
      { selector: "#channel-detail-panel", property: "hidden", operator: "equals", value: false },
      { selector: "#channel-editor-mode", property: "text", operator: "includes", value: "새 채널" },
      { selector: "#channel-editor-title", property: "text", operator: "includes", value: "채널 추가" },
    ],
    forbiddenRequests: [
      { methods: ["POST", "DELETE"], pathPrefix: "/webrtc/session" },
    ],
  }],
  ["RULE-101", {
    postconditions: [
      { selector: "#opsRulesStatus", property: "text", operator: "includes", value: "저장 전 검증 실패" },
      { selector: "#opsRulesReviewConflictDetail", property: "text", operator: "includes", value: "룰 대상(사람)이 템플릿 대상(차량)을 모두 포함하지 않습니다" },
      { selector: "#opsRulesReviewConflictDetail", property: "text", operator: "includes", value: "프로파일 대상(사람)이 템플릿 대상(차량)과 맞지 않습니다" },
    ],
    forbiddenRequests: [
      { methods: ["PUT"], pathPrefix: "/lab/analysis/va-rules/" },
    ],
  }],
  ["RULE-092", {
    postconditions: [
      { selector: "#opsRulesStatus", property: "text", operator: "includes", value: "저장 전 검증 실패" },
      { selector: "#opsRulesReviewConflictDetail", property: "text", operator: "includes", value: "이미 사용 중" },
    ],
    forbiddenRequests: [
      { methods: ["POST", "PUT", "DELETE"], pathPrefix: "/lab/analysis/rules" },
    ],
  }],
  ["RULE-093", {
    postconditions: [
      { selector: "#opsRulesStatus", property: "text", operator: "includes", value: "저장 전 검증 실패" },
      { selector: "#opsRulesReviewMissingDetail", property: "text", operator: "includes", value: "분석 프로파일 9997 reference 없음" },
      { selector: "#opsRulesReviewMissingDetail", property: "text", operator: "includes", value: "이벤트 템플릿 9998 reference 없음" },
    ],
    forbiddenRequests: [{ methods: ["PUT"], pathPrefix: "/lab/analysis/va-rules/" }],
  }],
  ["RULE-094", {
    postconditions: [
      { selector: "#opsRulesStatus", property: "text", operator: "includes", value: "저장 전 검증 실패" },
      { selector: "#opsRulesReviewMissingDetail", property: "text", operator: "includes", value: "분석 프로파일 9694 비활성" },
      { selector: "#opsRulesReviewMissingDetail", property: "text", operator: "includes", value: "이벤트 템플릿 9794 비활성" },
    ],
    forbiddenRequests: [{ methods: ["PUT"], pathPrefix: "/lab/analysis/va-rules/" }],
  }],
  ["RULE-095", {
    postconditions: [
      { selector: "#opsRulesValidationList", property: "text", operator: "includes", value: "source-mismatch" },
      { selector: "#opsRulesValidationList", property: "text", operator: "includes", value: "PublishedView 소스와 다릅니다" },
    ],
    forbiddenRequests: [{ methods: ["POST", "PUT", "DELETE"], pathPrefix: "/lab/analysis/" }],
  }],
  ["RULE-096", {
    postconditions: [
      { selector: "#opsRulesValidationList", property: "text", operator: "includes", value: "inactive-view" },
      { selector: "#opsRulesValidationList", property: "text", operator: "includes", value: "inactive-channel" },
    ],
    forbiddenRequests: [{ methods: ["POST", "PUT", "DELETE"], pathPrefix: "/lab/analysis/" }],
  }],
  ["RULE-100", {
    postconditions: [
      { selector: "#opsRulesStatus", property: "text", operator: "includes", value: "저장 전 검증 실패" },
      { selector: "#opsRulesStatus", property: "text", operator: "includes", value: "같은 채널에 priority" },
      { selector: "#opsRulesStatus", property: "text", operator: "includes", value: "이미 있습니다" },
    ],
    forbiddenRequests: [{ methods: ["PUT"], pathPrefix: "/lab/analysis/va-rules/" }],
  }],
  ["RULE-102", {
    postconditions: [
      { selector: "#opsRulesReviewLoop", property: "hidden", operator: "equals", value: false },
      { selector: "#opsRulesReviewEventTypeTitle", property: "text", operator: "includes", value: "re-entry" },
      { selector: "#opsRulesReviewEventTypeDetail", property: "text", operator: "includes", value: "EventRecord eventType 후보는 re-entry" },
      { selector: "#opsRulesReviewConflictDetail", property: "text", operator: "includes", value: "중복 ID, priority, source/class 충돌이 없습니다" },
      { selector: "#opsRulesReviewMissingDetail", property: "text", operator: "includes", value: "별도 참조 누락이 없습니다" },
      { selector: "#opsRulesReviewPresetDetail", property: "text", operator: "includes", value: "preset" },
      { selector: "#opsRulesReviewCoverageDetail", property: "text", operator: "includes", value: "verify-va-event-coverage-report" },
      { selector: "#opsRulesReviewEventRecordLink", property: "href", operator: "startsWith", value: "/ops/events#eventType=" },
    ],
    forbiddenRequests: [
      { methods: ["POST", "PUT", "DELETE"], pathPrefix: "/lab/analysis/rules" },
      { methods: ["POST", "PUT", "DELETE"], pathPrefix: "/lab/analysis/va-rules" },
    ],
  }],
  ["RULE-103", {
    postconditions: [
      { selector: "#opsEventRuleRows", property: "text", operator: "includes", value: "9913" },
      { selector: "#opsEventRuleRows", property: "text", operator: "includes", value: "9914" },
      { selector: "#opsEventRuleRows", property: "text", operator: "includes", value: "re-entry" },
    ],
    forbiddenRequests: [{ methods: ["POST", "PUT", "DELETE"], pathPrefix: "/lab/analysis/" }],
  }],
  ["RULE-104", {
    postconditions: [
      { selector: '[data-testid="ops-approval-gated-rule-draft-readiness"]', property: "url", operator: "includes", value: "/ops/rules?draftEventId=" },
      { selector: "#opsApprovalGatedRuleDraftContext", property: "text", operator: "includes", value: "approval" },
      { selector: "#opsApprovalGatedRuleDraftBadges", property: "text", operator: "includes", value: "approvalDraft=1" },
      { selector: "#opsApprovalGatedRuleDraftRows", property: "text", operator: "includes", value: "noAutoSave true" },
      { selector: "#opsApprovalGatedRuleDraftRows", property: "text", operator: "includes", value: "noAutoApply true" },
      { selector: "#opsApprovalGatedRuleDraftRows", property: "text", operator: "includes", value: "ruleRegistryWritePerformed false" },
      { selector: "#opsApprovalGatedRuleDraftRows", property: "text", operator: "includes", value: "fullReplayEngineExecuted false" },
    ],
    forbiddenRequests: [
      { methods: ["POST", "PUT", "DELETE"], pathPrefix: "/lab/analysis/rules" },
      { methods: ["POST", "PUT", "DELETE"], pathPrefix: "/lab/analysis/profiles" },
    ],
  }],
  ["RULE-111", {
    postconditions: [
      { selector: "#opsRulesDetailPanel", property: "hidden", operator: "equals", value: false },
      { selector: "#opsEventRuleTypeSelect", property: "value", operator: "equals", value: "line-crossing" },
      { selector: "#opsEventRuleClassesSummary", property: "text", operator: "includes", value: "사람" },
      { selector: "#opsEventRuleConfidenceInput", property: "value", operator: "equals", value: "0.8" },
      { selector: "#opsEventRuleMinDurationInput", property: "value", operator: "equals", value: "1000" },
      { selector: "#opsEventRuleLineDirectionSelect", property: "value", operator: "equals", value: "any" },
      { selector: "#opsRulesStatus", property: "text", operator: "includes", value: "이벤트 템플릿 draft에 반영" },
      { selector: "#opsVlmRuleDraftBridgeStatus", property: "text", operator: "includes", value: "ruleRegistryWrite=false" },
    ],
    forbiddenRequests: [
      { methods: ["POST", "PUT", "DELETE"], pathPrefix: "/lab/analysis/" },
      { methods: ["POST", "PUT", "DELETE"], pathPrefix: "/ops/api/vlm/" },
      { methods: ["POST", "PUT", "DELETE"], pathPrefix: "/ops/api/events" },
    ],
  }],
  ["CLIENT-002", {
    seedRequirements: [{ kind: "live-tile-state", state: "idle", minimumCount: 1 }],
    requiredRequests: [
      { sequence: 1, method: "POST", urlPath: "/client/api/views/client-002-review4-fixture/webrtc/session", allowedStatuses: [200] },
      { sequence: 2, method: "POST", urlPath: "/client/api/views/client-002-review4-fixture/webrtc/session/client-002-review4-session/answer", allowedStatuses: [200] },
    ],
    postconditions: [
      { selector: '[data-action="toggle-playback"]', property: "ariaLabel", operator: "includes", value: "정지" },
      { selector: '[data-role="tile-playback-icon"]', property: "text", operator: "equals", value: "■" },
    ],
  }],
  ["CLIENT-005", {
    seedRequirements: [{ kind: "live-session", state: "active", minimumCount: 1, sessionId: "client-005-review4-session" }],
    requiredRequests: [
      { sequence: 1, method: "DELETE", urlPath: "/client/api/views/client-005-review4-fixture/webrtc/session/client-005-review4-session", allowedStatuses: [200] },
    ],
    postconditions: [
      { selector: '[data-action="toggle-playback"]', property: "ariaLabel", operator: "includes", value: "재생" },
      { selector: '[data-role="tile-playback-icon"]', property: "text", operator: "equals", value: "▶" },
    ],
  }],
  ["SAFE-038", {
    postconditions: [
      { selector: "#opsRulesDetailPanel", property: "hidden", operator: "equals", value: false },
      { selector: "#opsEventRulePresetSelect", property: "value", operator: "equals", value: "custom" },
      { selector: "#opsRulesStatus", property: "text", operator: "includes", value: "저장" },
    ],
    forbiddenRequests: [
      { methods: ["POST", "PUT", "DELETE"], pathPrefix: "/lab/analysis/rules" },
      { methods: ["POST", "PUT", "DELETE"], pathPrefix: "/lab/analysis/va-rules" },
      { methods: ["POST", "PUT", "DELETE"], pathPrefix: "/ops/api/events" },
    ],
  }],
]);

const readModelCompletionContracts = new Map([
  ["RULE-097", {
    textIncludesAll: ["REVIEW4 RULE-097 view"],
  }],
  ["RULE-098", {
    textIncludesAll: ["view-rule-not-allowed", "9898", "PublishedView 허용 룰 목록"],
  }],
  ["RULE-010", {
    property: "selectedValues",
    value: ["9201"],
  }],
  ["RULE-013", {
    textIncludesAll: ["라인 점 2/2", "저장 가능", "양방향"],
  }],
  ["RULE-021", {
    textIncludesAll: ["조건:", "확정 500ms", "재알림 1초", "geometry: 영역 4점", "cooldown: 1초"],
  }],
  ["UI-030", {
    textIncludesAll: [
      "latency:",
      "jsonStability:",
      "explanationQuality:",
      "hallucinationRisk:",
      "languageQuality:",
    ],
  }],
  ["UI-052", {
    textIncludesAll: [
      "ui-052-review4-fixture",
      "release-safe",
      "manual draft only",
      "dry-run only",
      "source check only",
      "external delivery 미수행",
      "rule write 없음",
      "source write 없음",
    ],
  }],
  ["UI-053", {
    textIncludesAll: [
      "ui-053-review4-fixture",
      "candidate-only-manual-rule-save",
      "draftComparison",
      "candidate-ready",
      "conditionPreview",
      "line-crossing",
      "draft-only",
      "manual save",
      "no full replay",
      "rule write 없음",
      "no auto apply",
      "/ops/rules draft-only 검토",
    ],
  }],
  ["UI-064", {
    textIncludesAll: [
      "SOURCE HEALTH",
      "RECENT FAILURE",
      "OPERATOR RECHECK",
      "/ops/api/source-health",
      "BOUNDARY",
      "check only",
      "sourceRegistryWritePerformed false",
      "sourceUrlExposed false",
    ],
  }],
  ["UI-065", {
    textIncludesAll: [
      "CORRECTION REVIEW",
      "evidence-uncertain",
      "UNCERTAINTY REASON",
      "low-evidence-confidence",
      "QUALITY BADGE",
      "uncertain",
      "BOUNDARY",
      "provider-free Ops-only",
      "runtimeProviderCallPerformed false",
      "rawProviderMaterialExposed false",
    ],
  }],
  ["UI-066", {
    textIncludesAll: [
      "ASSIGNMENT TARGET",
      "OPERATOR NOTE",
      "CLOSE / REOPEN",
      "AUDIT TRAIL",
      "required",
      "Ops-only redacted",
      "/ops/api/events/reviews/{eventId}",
      "operator-resolution-flow-update",
    ],
  }],
  ["UI-067", {
    textIncludesAll: [
      "READINESS STATUS",
      "RULE DRAFT",
      "EVIDENCE BUNDLE",
      "NOTIFICATION READINESS",
      "BOUNDARY",
      "Ops-only checklist",
      "autoActionWritePerformed false",
      "externalDeliveryPerformed false",
      "manual-approval-required",
    ],
  }],
  ["UI-068", {
    textIncludesAll: [
      "판정 digest",
      "허용된 판정 상태 요약만 표시됩니다.",
      "viewer-safe",
      "view scope",
      "operator note 숨김",
      "closed",
      "closed event",
    ],
  }],
  ["UI-069", {
    textIncludesAll: [
      "RESOLUTION FILTERS",
      "SAVED VIEWS",
      "OPERATIONS METRIC SUMMARY",
      "BOUNDARY",
      "Ops-only search metrics",
      "savedViewsPersisted false",
      "savedViewWritePerformed false",
      "clientDigestChanged false",
      "sourceUrlExposed false",
      "rawJsonExposed false",
    ],
  }],
  ["UI-070", {
    textIncludesAll: [
      "SOURCE CAUSE",
      "CLOSURE IMPACT",
      "SOURCE HANDOFF",
      "BOUNDARY",
      "Ops-only correlation",
      "/ops/api/source-health",
      "sourceRegistryWritePerformed false",
      "eventRecordWritePerformed false",
      "resolutionDetailAttached true",
      "sourceReliabilityContextReused true",
      "sourceHealthAuditLinked true",
    ],
  }],
  ["UI-071", {
    textIncludesAll: [
      "FAILED-ONLY RECHECK",
      "RETRY CANDIDATE",
      "DRY-RUN RESULT",
      "OPERATOR NOTE",
      "SOURCE RECHECK",
      "BOUNDARY",
      "read model only",
      "/ops/api/source-health",
      "persistentRecoveryQueueCreated false",
      "eventRecordWritePerformed false",
      "recoveryQueueReadModelCreated true",
      "recoveryQueueWritePerformed false",
      "autoRecoveryApplied false",
    ],
  }],
  ["UI-072", {
    textIncludesAll: [
      "소스 상태 digest",
      "허용된 소스 상태와 연결 요약만 표시됩니다.",
      "viewer-safe",
      "view scope",
      "locator 숨김",
      "video",
      "metadata",
    ],
  }],
  ["UI-073", {
    textIncludesAll: [
      "Reliability Search",
      "source health filters",
      "saved reliability views",
      "reconnect/stale/offline metric summary",
      "savedViewsPersisted: false",
      "savedViewWritePerformed: false",
    ],
  }],
  ["UI-074", {
    textIncludesAll: [
      "Backup Handoff",
      "handoff inputs",
      "recovery validation plan",
      "sourceHealthSnapshotPersisted: false",
      "recoveryValidationPlanPersisted: false",
    ],
  }],
  ["UI-075", {
    textIncludesAll: [
      "Ops Continuity Drill Workspace",
      "drill package",
      "validation status",
      "source health drift",
      "automaticRecoveryPerformed: false",
      "sourceRegistryWritePerformed: false",
    ],
  }],
  ["UI-080", {
    textIncludesAll: [
      "SOURCE CAUSE",
      "CONTINUITY DRILL",
      "COMMAND PLAN DRAFT",
      "BOUNDARY",
      "/ops/api/live-operations/command-plan",
      "read-only handoff",
      "commandPlanExecuted false",
      "viewerClientExposureAdded false",
    ],
  }],
  ["UI-088", {
    textIncludesAll: [
      "route family",
      "/ops/api/live-operations/simulation/input-pack",
      "/ops/api/live-operations/simulation/run-contract",
    ],
  }],
  ["UI-089", {
    textIncludesAll: [
      "simulation-run:",
      "operator-note-required",
      "inputRef=",
      "resultDiff=",
      "previous=",
      "blocker=",
      "changedFields=",
    ],
  }],
  ["UI-090", {
    textIncludesAll: [
      "timelineHint=",
      "deliveryState=preview-only",
    ],
  }],
  ["UI-091", {
    textIncludesAll: [
      "thresholdCandidate",
      "presetCandidate",
      "scenarioCandidate",
      "eventRecordRef=",
      "delta=",
      "before=",
      "after=",
    ],
  }],
  ["UI-092", {
    textIncludesAll: [
      "simulationInputRefs=",
      "simulationOutputRefs=",
      "readinessBlockerRefs=",
      "redactionPolicy=",
    ],
  }],
  ["UI-093", {
    textIncludesAll: [
      "conditional-not-run",
      "simulationReadinessBlockerRef=",
      "executionStatus=not-run",
      "notRunReason=",
      "conditionRefs=",
    ],
  }],
  ["UI-094", {
    textIncludesAll: [
      "simulationBlockerSummary=",
      "impactDiffSummary=",
      "defaultEnabled=false",
    ],
  }],
  ["UI-095", {
    textIncludesAll: [
      "source=",
      "view=",
      "route=/ops/api/site-operations/source-registry-projection",
    ],
  }],
  ["UI-096", {
    textIncludesAll: [
      "site=",
      "group=",
      "viewGroup=",
      "status=",
    ],
  }],
  ["UI-097", {
    textIncludesAll: [
      "thresholdCandidate",
      "scenarioCandidate",
      "ruleCandidate=",
      "source=",
      "readiness=",
    ],
  }],
  ["UI-098", {
    textIncludesAll: [
      "siteRunbookEvidenceRef",
      "conditionalNotRunEvidence",
      "runbook=",
      "approval=",
      "execution=not-run",
      "fieldSmoke=",
    ],
  }],
  ["UI-099", {
    textIncludesAll: [
      "sourceRecheckRef",
      "noticeQueueRef",
      "approval=",
      "status=approval-gated-not-run",
      "key=",
    ],
  }],
  ["UI-100", {
    textIncludesAll: [
      "source-reconciliation",
      "not-run",
    ],
  }],
  ["UI-101", {
    textIncludesAll: [
      "siteRefs=",
      "runbookRefs=",
      "evidenceRefs=",
      "approvalRefs=",
      "outcomeRefs=",
    ],
  }],
  ["UI-102", {
    textIncludesAll: [
      "required=",
    ],
  }],
  ["UI-103", {
    textIncludesAll: [
      "notice",
    ],
  }],
  ["UI-104", {
    textIncludesAll: [
      "readiness",
      "candidate=",
      "observed=",
    ],
  }],
  ["UI-105", {
    textIncludesAll: [
      "candidate=",
      "outcome=",
    ],
  }],
]);

export function buildNativeExactManifest({ canonical, implementation }) {
  assert(canonical?.schema === canonicalManifestSchema, "unexpected canonical manifest schema");
  assert(implementation?.schema === implementationManifestSchema, "unexpected implementation manifest schema");
  assert(Array.isArray(canonical.cases) && canonical.cases.length === 424, "canonical exact case count must be 424");
  const runtimeOracleCatalog = buildExactRuntimeOracleCatalog({ implementation });
  const runtimeOracleById = new Map(runtimeOracleCatalog.map(item => [item.caseId, item]));
  const runtimeOracleValidation = validateExactRuntimeOracleCatalog(runtimeOracleCatalog);
  assert(JSON.stringify(exactRuntimeOracleCaseIds) === JSON.stringify(canonical.cases.map(item => item.testId)),
    "exact runtime oracle catalog must preserve canonical ordered 424 IDs");
  for (const item of canonical.cases) {
    assert(supportedAccountRoles.has(item.accountRole),
      `${item.testId} unsupported canonical account role: ${item.accountRole || "missing"}`);
  }
  const implementationByManualId = new Map(
    implementation.items
      .filter(item => typeof item.manualUiCaseId === "string" && item.manualUiCaseId)
      .map(item => [item.manualUiCaseId, item]),
  );
  assert(implementationByManualId.size === 424, "implementation exact manual UI case count must be 424");

  const cases = canonical.cases.map(canonicalCase => {
    const implementationItem = implementationByManualId.get(canonicalCase.testId);
    assert(implementationItem, `${canonicalCase.testId} implementation item missing`);
    const exactRuntimeOracle = runtimeOracleById.get(canonicalCase.testId);
    assert(exactRuntimeOracle?.caseId === canonicalCase.testId,
      `${canonicalCase.testId} exact runtime oracle missing`);
    const negativeRoute = canonicalCase.testId === "UI-018";
    const crossRouteNegative = canonicalCase.testId === "SAFE-017";
    const screenRoute = negativeRoute ? canonicalCase.route : normalizeProductScreenRoute(canonicalCase.route);
    const canonicalSelector = normalizeCanonicalSelector(canonicalCase.controlAction?.selector, canonicalCase);
    const workflowClass = classifyWorkflow({ canonicalCase, implementationItem, canonicalSelector });
    const primaryControl = resolvePrimaryControl({
      canonicalCase,
      implementationItem,
      canonicalSelector,
      screenRoute,
      workflowClass,
    });
    const targetSelector = primaryControl.applicability === "required" ? primaryControl.selector : null;
    const sourceKind = implementationItem.semanticEvidence?.stateOracle?.oracleKind || "";
    const expectedBehavior = implementationItem.semanticEvidence?.stateOracle?.expectedBehavior || "";
    const expectedBehaviorSha256 = implementationItem.semanticEvidence?.stateOracle?.expectedBehaviorSha256 || "";
    const expectedNetworkUrlIncludes = inferNetworkUrlIncludes(canonicalCase);
    const workflowParts = buildCaseNativeWorkflow({
      canonicalCase,
      implementationItem,
      screenRoute,
      canonicalSelector,
      targetSelector,
      workflowClass,
      primaryControl,
      negativeRoute,
      crossRouteNegative,
    });
    const primaryActionPlan = primaryWorkflowAction(workflowParts.controlSequence, negativeRoute);
    const actions = workflowParts.controlSequence.map(action => ({
      ...action,
      ...(action.kind === "wait-visible" ? {} : {
        semanticCompletion: buildActionSemanticCompletion({
          caseId: canonicalCase.testId,
          screenRoute,
          action,
          negativeRoute,
          primaryActionId: primaryActionPlan.actionId,
          primaryControl,
          productAction: workflowParts.productAction,
          expectedProductState: workflowParts.expectedProductState,
          independentReadback: workflowParts.independentReadback,
          workflowInputs: workflowParts.inputs,
        }),
      }),
    }));
    const primaryCompletion = primarySemanticCompletion(actions);
    const hasCrossRouteNegative = actions.some(action => action.kind === "navigate-negative");
    const completionSources = [...new Set([
      primaryCompletion.requiredSource,
      ...primaryCompletion.attestedAlternatives,
    ])];
    const caseValue = {
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
        selector: targetSelector,
        requestedSelector: canonicalCase.controlAction?.selector ?? null,
        canonicalSelector,
        selectorSource: primaryControl.source,
        actionAnchor: canonicalCase.controlAction?.actionAnchor || "",
        actionRoute: primaryControl.route,
        targetSelector,
      },
      actions,
      workflow: {
        schema: caseNativeWorkflowSchema,
        workflowId: `${canonicalCase.testId}:native-workflow`,
        workflowClass,
        semanticClassification: workflowParts.semanticClassification,
        setup: workflowParts.setup,
        inputs: workflowParts.inputs,
        primaryControl,
        productAction: workflowParts.productAction,
        expectedProductState: workflowParts.expectedProductState,
        independentReadback: workflowParts.independentReadback,
        exactRuntimeOracle: {
          schema: exactRuntimeOracle.schema,
          caseId: exactRuntimeOracle.caseId,
          classification: exactRuntimeOracle.classification || "case-specific-runtime-oracle",
          route: exactRuntimeOracle.route,
          role: exactRuntimeOracle.role,
          featureMeaning: exactRuntimeOracle.featureMeaning || exactRuntimeOracle.expectedBehavior,
          specSha256: sha256Json(exactRuntimeOracle),
          requestCount: exactRuntimeOracle.requests.length,
          domAssertionCount: exactRuntimeOracle.dom.length,
          stateSnapshotCount: exactRuntimeOracle.stateSnapshots.length,
          cleanupStrategy: exactRuntimeOracle.cleanup.strategy,
          staticCatalogIsNotRuntimePass: true,
        },
        controlSequence: actions,
        expectedResults: [{
          resultId: `${canonicalCase.testId}:semantic-result`,
          kind: negativeRoute || crossRouteNegative ? "negative-route-status" : "reviewed-semantic-result",
          expectedBehavior,
          expectedBehaviorSha256,
          endpointHints: expectedNetworkUrlIncludes,
          stateLocator: compactLocator(workflowParts.expectedProductState.locator),
          readbackLocator: compactLocator(workflowParts.independentReadback.locator),
          completion: structuredClone(primaryCompletion),
        }],
        cleanup: workflowParts.cleanup,
      },
      oracle: {
        kind: negativeRoute
          ? "negative-route-status"
          : (hasCrossRouteNegative
              ? "semantic-cross-route-negative-status"
              : "semantic-endpoint-readback"),
        sourceKind,
        expectedBehavior,
        expectedBehaviorSha256,
        allowedStatuses: negativeRoute ? [404] : [200],
        completionRequired: true,
        allowedCompletionSources: completionSources,
        primaryActionId: primaryCompletion.actionId,
        primaryActionCorrelationId: primaryCompletion.correlationId,
        primaryControlSelector: primaryCompletion.controlSelector,
        independentReadbackIdentity: primaryCompletion.readback.identity,
      },
      artifacts: {
        screenshot: true,
        trace: true,
        browserConsole: true,
        serverLog: true,
      },
    };
    return {
      ...caseValue,
      requestedProjection: canonicalRequestedProjection(caseValue),
      observedProjection: expectedRuntimeObservation(caseValue),
    };
  });

  return {
    schema: nativeExactManifestSchema,
    sourceBindings: {
      canonicalSchema: canonical.schema,
      canonicalSha256: sha256Json(canonical),
      implementationSchema: implementation.schema,
      implementationBindingSchema: "media-server.v390-ui-native-generated-case-projection.v1",
      implementationProjectionSha256: sha256Json(cases),
      runtimeOracleCatalogSchema: runtimeOracleValidation.schema,
      runtimeOracleCatalogSha256: runtimeOracleValidation.catalogSha256,
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
  assert(!Object.hasOwn(manifest.sourceBindings || {}, "implementationSha256"),
    "whole-file implementation source binding is forbidden");
  assert(manifest.sourceBindings?.implementationBindingSchema === expected.sourceBindings.implementationBindingSchema,
    "implementation projection schema drift");
  assert(manifest.sourceBindings?.implementationProjectionSha256 === expected.sourceBindings.implementationProjectionSha256,
    "implementation case projection drift");
  assert(manifest.sourceBindings?.runtimeOracleCatalogSha256 === expected.sourceBindings.runtimeOracleCatalogSha256,
    "runtime oracle catalog source binding drift");
  assert(Array.isArray(manifest.cases) && manifest.cases.length === 424, "canonical exact case count must be 424");
  assertExact(manifest.cases.map(item => item.caseId), canonical.cases.map(item => item.testId),
    "canonical ordered case IDs");
  assertUnique(manifest.cases.map(item => item.caseId), "native exact case IDs");
  assertUnique(manifest.cases.map(item => item.workflow?.workflowId), "native exact workflow IDs");

  for (let index = 0; index < manifest.cases.length; index += 1) {
    const item = manifest.cases[index];
    const expectedItem = expected.cases[index];
    assert(item.featureId === expectedItem.featureId, `${item.caseId} featureId drift`);
    assert(supportedAccountRoles.has(item.accountRole), `${item.caseId} unsupported account role`);
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
    assert(item.actions.filter(action => action.kind !== "wait-visible").every(action =>
      action.semanticCompletion?.schema === "media-server.v390-ui-action-completion.v2"),
    `${item.caseId} semantic action completion missing`);
    assert(item.workflow?.schema === caseNativeWorkflowSchema, `${item.caseId} workflow schema drift`);
    assert(item.workflow.workflowId === `${item.caseId}:native-workflow`, `${item.caseId} workflow ID drift`);
    assert(review4WorkflowClasses.includes(item.workflow.workflowClass), `${item.caseId} workflow class invalid`);
    for (const field of ["setup", "inputs", "controlSequence", "expectedResults", "cleanup"]) {
      assert(Array.isArray(item.workflow[field]) && item.workflow[field].length > 0, `${item.caseId} workflow ${field} missing`);
    }
    assert(item.workflow.inputs.some(input => input.actualValue !== undefined || input.seedReference?.fixtureId),
      `${item.caseId} actual workflow input missing`);
    assert(JSON.stringify(item.actions) === JSON.stringify(item.workflow.controlSequence), `${item.caseId} action/workflow drift`);
    assert(!JSON.stringify(item.workflow).includes("runtime-control"), `${item.caseId} runtime-control is forbidden`);
    assert(!item.workflow.controlSequence.some(action => action.kind === "interact"), `${item.caseId} generic interact is forbidden`);
    assert(!JSON.stringify(item.workflow).includes('"submit":false'), `${item.caseId} submit:false is forbidden`);
    const primaryControl = item.workflow.primaryControl;
    assert(["required", "not-applicable"].includes(primaryControl?.applicability),
      `${item.caseId} primary control applicability missing`);
    assert(supportedAccountRoles.has(primaryControl.accountRole),
      `${item.caseId} primary control account role missing or unsupported`);
    const requiresActionRoleBinding = primaryControl.route !== item.screenRoute ||
      primaryControl.accountRole !== item.accountRole;
    const actionRoleBinding = item.workflow.setup.find(setup => setup.kind === "bind-action-role-session");
    if (requiresActionRoleBinding) {
      assert(actionRoleBinding?.accountRole === primaryControl.accountRole &&
        actionRoleBinding?.route === primaryControl.route && actionRoleBinding?.required === true,
      `${item.caseId} cross-route/role action session binding missing`);
    } else {
      assert(!actionRoleBinding, `${item.caseId} redundant action role session binding forbidden`);
    }
    if (primaryControl.applicability === "required") {
      assert(primaryControl.selector && !isRouteRootSelector(primaryControl.selector),
        `${item.caseId} route-root primary control forbidden`);
      assert(primaryControl.sourceLocator?.file && primaryControl.sourceLocator?.anchor &&
        /^[a-f0-9]{64}$/.test(primaryControl.sourceLocator?.contextSha256 || ""),
      `${item.caseId} primary control source locator missing`);
      if (["actionable", "form-submit", "persisted-mutation"].includes(item.workflow.workflowClass)) {
        assert(primaryControl.expectedVisible === true && primaryControl.expectedEnabled === true,
          `${item.caseId} actionable primary control must be visible/enabled`);
      }
    } else {
      assert(["read-only-state", "hidden-disabled", "negative-route"].includes(item.workflow.workflowClass),
        `${item.caseId} control not-applicable is forbidden for ${item.workflow.workflowClass}`);
      assert(primaryControl.reason && primaryControl.sourceLocator?.file && primaryControl.readbackLocator?.file,
        `${item.caseId} control not-applicable source/readback proof missing`);
    }
    const endpointCount = item.workflow.productAction?.endpoint ? 1 : 0;
    const localActionCount = item.workflow.productAction?.localAction ? 1 : 0;
    assert(endpointCount + localActionCount === 1,
      `${item.caseId} product action must declare exactly one endpoint or local action`);
    if (item.workflow.workflowClass === "persisted-mutation") {
      assert(endpointCount === 1 && localActionCount === 0,
        `${item.caseId} persisted mutation requires a durable endpoint action`);
    }
    if (item.workflow.workflowClass === "actionable" && endpointCount === 1) {
      assert(item.workflow.productAction.endpoint.allowedStatuses.every(status => status >= 400),
        `${item.caseId} actionable endpoint must be an explicit rejected/no-persist action`);
    }
    if (item.workflow.workflowClass === "form-submit") {
      assert(!hasMixedSuccessAndErrorStatuses(item.workflow.productAction.endpoint.allowedStatuses),
        `${item.caseId} form broad mixed success/error status set forbidden`);
    }
    assert(item.workflow.expectedProductState?.identity && item.workflow.expectedProductState?.locator?.file,
      `${item.caseId} expected product state missing`);
    assert(item.workflow.independentReadback?.identity && item.workflow.independentReadback?.locator?.file,
      `${item.caseId} independent readback missing`);
    assert(item.workflow.exactRuntimeOracle?.caseId === item.caseId &&
      /^[a-f0-9]{64}$/.test(item.workflow.exactRuntimeOracle?.specSha256 || "") &&
      item.workflow.exactRuntimeOracle?.staticCatalogIsNotRuntimePass === true,
    `${item.caseId} exact runtime oracle binding missing`);
    assert(item.workflow.expectedProductState.identity !== item.workflow.independentReadback.identity,
      `${item.caseId} state/readback identity self-compare forbidden`);
    assert(locatorIdentity(item.workflow.expectedProductState.locator) !==
      locatorIdentity(item.workflow.independentReadback.locator),
    `${item.caseId} state/readback locator self-compare forbidden`);
    if (["persisted-mutation", "form-submit"].includes(item.workflow.workflowClass) ||
        item.workflow.productAction?.kind === "endpoint-owned-action") {
      assert(item.workflow.cleanup.some(cleanup => {
        const inverseCount = cleanup.inverseAction?.endpoint ? 1 : 0;
        const inverseLocalCount = cleanup.inverseAction?.localAction ? 1 : 0;
        return ["restore-fixture-state", "delete-created-fixture"].includes(cleanup.kind) &&
          cleanup.beforeSnapshotRef && inverseCount + inverseLocalCount === 1 &&
          cleanup.afterReadback?.identity &&
          ["absent", "equal-before", "inactive-or-equal-before"].includes(cleanup.afterReadback?.expectation) &&
          cleanup.readback?.identity;
      }), `${item.caseId} mutation cleanup inverse/readback missing`);
    } else {
      assert(item.workflow.cleanup.some(cleanup => cleanup.kind === "no-op-cleanup" && cleanup.persistedMutation === false),
        `${item.caseId} nonmutation no-op cleanup missing`);
    }
    if (item.workflow.workflowClass === "form-submit") {
      const formInput = item.workflow.inputs.find(input => input.kind === "form-values");
      const submitAction = item.workflow.controlSequence.find(action => action.kind === "submit-form");
      assert(formInput?.submit === true,
        `${item.caseId} form submit input missing`);
      assert(!containsLiteralAuthMaterial(formInput.actualValue), `${item.caseId} form auth literal forbidden`);
      assert(submitAction,
        `${item.caseId} form submit action missing`);
      if (submitAction.selector === '[data-testid="auth-setup-form"]') {
        const usernameControl = submitAction.uiLifecycle?.fieldControls?.find(field => field.name === "username");
        assert(formInput.actualValue?.username === "admin" &&
          usernameControl?.control === "readonly-value" &&
          usernameControl?.expectedValue === "admin" &&
          usernameControl?.valueSource === "product-fixed-admin",
        `${item.caseId} setup readonly admin contract missing`);
      }
      assert(!item.workflow.controlSequence.some(action => action.kind === "assert-form-contract"),
        `${item.caseId} form contract-only action forbidden`);
    }
    if (!item.controlAction.selector) {
      assert(primaryControl.applicability === "not-applicable" &&
        ["read-only-state", "hidden-disabled", "negative-route"].includes(item.workflow.workflowClass),
      `${item.caseId} selector-null generic workflow forbidden`);
    }
    if (hiddenControls.has(item.controlAction.selector)) {
      assert(item.workflow.controlSequence.some(action => action.kind === "assert-hidden-control"),
        `${item.caseId} hidden control assertion missing`);
    }
    assert(JSON.stringify(item.actions) === JSON.stringify(expectedItem.actions), `${item.caseId} action plan drift`);
    assert(item.oracle?.sourceKind === expectedItem.oracle.sourceKind, `${item.caseId} oracle source kind drift`);
    assert(item.oracle?.expectedBehaviorSha256 === expectedItem.oracle.expectedBehaviorSha256,
      `${item.caseId} oracle digest drift`);
    assert(/^[a-f0-9]{64}$/.test(item.oracle.expectedBehaviorSha256), `${item.caseId} oracle digest invalid`);
    assert(JSON.stringify(item.oracle) === JSON.stringify(expectedItem.oracle), `${item.caseId} oracle contract drift`);
    assert(item.oracle.completionRequired === true, `${item.caseId} completionRequired must be true`);
    assert(item.oracle.allowedCompletionSources.every(source => allowedCompletionSources.includes(source)),
      `${item.caseId} unknown completion source`);
    assert(!item.oracle.allowedCompletionSources.includes("dom-transition"),
      `${item.caseId} arbitrary DOM completion source is forbidden`);
    assert(item.workflow.expectedResults[0]?.completion?.schema === "media-server.v390-ui-action-completion.v2",
      `${item.caseId} expected semantic completion missing`);
    const primaryCompletion = item.workflow.expectedResults[0].completion;
    assert(primaryCompletion.phase === "primary-action", `${item.caseId} primary completion phase missing`);
    assert(primaryCompletion.actionId === item.oracle.primaryActionId &&
      primaryCompletion.correlationId === item.oracle.primaryActionCorrelationId,
    `${item.caseId} primary completion identity drift`);
    assert(primaryCompletion.controlSelector === item.workflow.primaryControl.selector &&
      primaryCompletion.controlSelector === item.oracle.primaryControlSelector,
    `${item.caseId} primary completion selector drift`);
    assert(primaryCompletion.expectedBehaviorSha256 === item.workflow.expectedProductState.expectedBehaviorSha256,
      `${item.caseId} primary expected behavior drift`);
    assert(primaryCompletion.readback.identity === item.workflow.independentReadback.identity &&
      primaryCompletion.readback.identity === item.oracle.independentReadbackIdentity &&
      primaryCompletion.readback.staticLocatorIsNotRuntimePass === true,
    `${item.caseId} independent readback binding drift`);
    assert(Boolean(primaryCompletion.request) !== Boolean(primaryCompletion.localTransition),
      `${item.caseId} primary request/local transition must be exclusive`);
    if (item.workflow.productAction.endpoint) {
      const endpoint = item.workflow.productAction.endpoint;
      assert(primaryCompletion.request.correlationId === primaryCompletion.correlationId &&
        primaryCompletion.request.correlationId !== `${item.caseId}:navigation` &&
        primaryCompletion.request.method === endpoint.method &&
        primaryCompletion.request.urlPathTemplate === endpoint.path &&
        !primaryCompletion.request.urlPath.includes("{") &&
        JSON.stringify(primaryCompletion.request.allowedStatuses) === JSON.stringify(endpoint.allowedStatuses),
      `${item.caseId} action request completion drift`);
    } else {
      const localAction = item.workflow.productAction.localAction;
      assert(primaryCompletion.localTransition.selector === item.workflow.primaryControl.selector &&
        primaryCompletion.localTransition.type === localAction.type &&
        primaryCompletion.localTransition.target === localAction.target &&
        primaryCompletion.localTransition.effect === localAction.effect,
      `${item.caseId} local transition completion drift`);
    }
    assert(JSON.stringify(item.artifacts) === JSON.stringify(expectedItem.artifacts), `${item.caseId} artifact plan drift`);
    assert(JSON.stringify(item.requestedProjection) === JSON.stringify(expectedItem.requestedProjection),
      `${item.caseId} canonical requested projection drift`);
    assert(JSON.stringify(item.observedProjection) === JSON.stringify(expectedItem.observedProjection),
      `${item.caseId} runtime observed projection drift`);
    const projectionErrors = validateRequestedObservedEnvelope({
      requested: item.requestedProjection,
      observed: item.observedProjection,
      canonicalCase: canonical.cases[index],
      nativeCase: item,
    });
    assert(projectionErrors.length === 0,
      `${item.caseId} requested/observed projection invalid: ${projectionErrors.join("; ")}`);
  }

  const negative = manifest.cases.find(item => item.caseId === "UI-018");
  assert(negative?.disposition === "negative-route", "UI-018 negative route disposition missing");
  assert(negative.oracle?.kind === "negative-route-status", "UI-018 negative status oracle missing");
  const workflowClassCounts = Object.fromEntries(review4WorkflowClasses.map(workflowClass => [
    workflowClass,
    manifest.cases.filter(item => item.workflow.workflowClass === workflowClass).length,
  ]));
  const expectedWorkflowClassCounts = {
    actionable: 27,
    "form-submit": 16,
    "persisted-mutation": 97,
    "read-only-state": 240,
    "hidden-disabled": 42,
    "negative-route": 2,
  };
  for (const workflowClass of review4WorkflowClasses) {
    assert(workflowClassCounts[workflowClass] === expectedWorkflowClassCounts[workflowClass],
      `${workflowClass} workflow count mismatch`);
  }
  assert(JSON.stringify(manifest) === JSON.stringify(expected), "generated exact native manifest drift");
  return {
    caseCount: manifest.cases.length,
    positiveNative: manifest.cases.filter(item => item.disposition === "native-executable").length,
    negativeRoute: manifest.cases.filter(item => item.disposition === "negative-route").length,
    unsupported: manifest.cases.filter(item => item.disposition === "unsupported").length,
    workflowClassCounts,
  };
}

export function normalizeProductScreenRoute(route) {
  if (route === "/") return "/login";
  if (route === "/logout") return "/ops/home";
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

function classifyWorkflow({ canonicalCase, implementationItem, canonicalSelector }) {
  const flowKind = implementationItem.semanticEvidence?.review4Proof?.flowKind || "";
  if (readModelPrimaryOverrides.has(canonicalCase.testId)) return "read-only-state";
  if (canonicalCase.testId === "UI-018" || canonicalCase.testId === "SAFE-017") return "negative-route";
  if (localOnlyMutationCases.has(canonicalCase.testId)) return "actionable";
  if (endpointActionCases.has(canonicalCase.testId)) return "actionable";
  if (formMutationCases.has(canonicalCase.testId) || formSubmitOverrides.has(canonicalCase.testId)) return "form-submit";
  if (forcedPersistedMutationCases.has(canonicalCase.testId)) return "persisted-mutation";
  if (flowKind === "mutation") return "persisted-mutation";
  if (formContracts.has(canonicalSelector)) return "form-submit";
  if (readOnlyBoundaryCases.has(canonicalCase.testId)) return "read-only-state";
  if (flowKind === "negative-invariant" || explicitHiddenControlCases.has(canonicalCase.testId) ||
      disabledControls.has(canonicalSelector)) {
    return "hidden-disabled";
  }
  if (canonicalSelector && !readModelControls.has(canonicalSelector)) return "actionable";
  return "read-only-state";
}

function resolvePrimaryControl({ canonicalCase, implementationItem, canonicalSelector, screenRoute, workflowClass }) {
  const caseId = canonicalCase.testId;
  const accountRole = actionRoleOverrides.get(caseId) || canonicalCase.accountRole;
  if (readModelPrimaryOverrides.has(caseId)) {
    const override = readModelPrimaryOverrides.get(caseId);
    const source = overrideControlSourceCatalog.get(override.selector);
    assert(workflowClass === "read-only-state" && source,
      `${caseId} read-model primary control/source override missing`);
    return {
      applicability: "required",
      selector: override.selector,
      route: override.route,
      accountRole,
      source: "review4-read-model-control-override",
      expectedVisible: true,
      expectedEnabled: true,
      sourceLocator: sourceLocatorFromAnchor(caseId, source),
    };
  }
  if (workflowClass === "actionable" && (localOnlyMutationCases.has(caseId) || endpointActionCases.has(caseId))) {
    const override = mutationPrimaryControls.get(caseId);
    const source = overrideControlSourceCatalog.get(override?.selector);
    assert(override && source, `${caseId} local mutation exact primary control/source missing`);
    return {
      applicability: "required",
      selector: override.selector,
      route: override.route,
      accountRole,
      source: "review4-local-mutation-control-override",
      expectedVisible: true,
      expectedEnabled: true,
      sourceLocator: sourceLocatorFromAnchor(caseId, source),
    };
  }
  if (workflowClass === "persisted-mutation") {
    const override = mutationPrimaryControls.get(caseId);
    assert(override, `${caseId} persisted mutation exact primary control override missing`);
    const source = overrideControlSourceCatalog.get(override.selector);
    assert(source, `${caseId} persisted mutation primary control source missing`);
    return {
      applicability: "required",
      selector: override.selector,
      route: override.route,
      accountRole,
      source: "review4-mutation-control-override",
      expectedVisible: true,
      expectedEnabled: true,
      sourceLocator: sourceLocatorFromAnchor(caseId, source),
    };
  }
  if (workflowClass === "form-submit") {
    const override = formSubmitOverrides.get(caseId);
    const spec = formSubmitSpec(caseId, canonicalSelector);
    const overrideSource = overrideControlSourceCatalog.get(spec.submitSelector);
    const locator = overrideSource
      ? sourceLocatorFromAnchor(caseId, overrideSource)
      : compactSourceLocator(implementationItem.semanticEvidence?.controlSelector?.locator);
    assert(spec.selector && spec.submitSelector, `${caseId} form selector missing`);
    return {
      applicability: "required",
      selector: spec.submitSelector,
      route: spec.route || screenRoute,
      accountRole,
      source: override ? "review4-form-submit-control-override" : "review4-canonical-form-submit-control",
      expectedVisible: true,
      expectedEnabled: true,
      sourceLocator: locator,
    };
  }
  const exactHiddenControl = explicitHiddenControlCases.has(caseId) && hiddenControls.has(canonicalSelector);
  const exactDisabledControl = disabledControls.has(canonicalSelector);
  if ((workflowClass === "hidden-disabled" && !exactHiddenControl && !exactDisabledControl) ||
      readOnlyBoundaryCases.has(caseId)) {
    return buildNotApplicablePrimaryControl({
      caseId,
      implementationItem,
      screenRoute,
      accountRole,
      workflowClass,
    });
  }
  if (canonicalSelector) {
    const overrideSource = overrideControlSourceCatalog.get(canonicalSelector);
    const locator = overrideSource
      ? sourceLocatorFromAnchor(caseId, overrideSource)
      : implementationItem.semanticEvidence?.controlSelector?.locator;
    assert(locator?.file && locator?.anchor, `${caseId} canonical primary control source missing`);
    const hidden = exactHiddenControl;
    const disabled = exactDisabledControl;
    return {
      applicability: "required",
      selector: canonicalSelector,
      route: screenRoute,
      accountRole,
      source: overrideSource ? "review4-exact-runtime-oracle-control-override" : "review4-canonical-product-control",
      expectedVisible: !hidden,
      expectedEnabled: !hidden && !disabled,
      sourceLocator: overrideSource ? locator : compactSourceLocator(locator),
    };
  }
  return buildNotApplicablePrimaryControl({
    caseId,
    implementationItem,
    screenRoute,
    accountRole,
    workflowClass,
  });
}

function buildNotApplicablePrimaryControl({
  caseId,
  implementationItem,
  screenRoute,
  accountRole,
  workflowClass,
}) {
  const proof = implementationItem.semanticEvidence?.review4Proof || {};
  const sourceLocator = compactSourceLocator(proof.roles?.action || proof.roles?.state);
  const readbackLocator = compactSourceLocator(proof.roles?.readback);
  assert(sourceLocator?.file && readbackLocator?.file, `${caseId} control not-applicable source/readback proof missing`);
  return {
    applicability: "not-applicable",
    selector: null,
    route: screenRoute,
    accountRole,
    source: "review4-explicit-control-not-applicable",
    expectedVisible: false,
    expectedEnabled: false,
    reason: workflowClass === "negative-route"
      ? "negative route has no product control"
      : "reviewed feature is exercised by exact endpoint/readback rather than a direct product control",
    sourceLocator,
    readbackLocator,
  };
}

function buildCaseNativeWorkflow({
  canonicalCase,
  implementationItem,
  screenRoute,
  canonicalSelector,
  targetSelector,
  workflowClass,
  primaryControl,
  negativeRoute,
  crossRouteNegative,
}) {
  const caseId = canonicalCase.testId;
  const semantic = implementationItem.semanticEvidence || {};
  const proof = semantic.review4Proof || {};
  const semanticDigest = semantic.callChain?.digest || "";
  const semanticClassification = {
    flowKind: proof.flowKind || "",
    operation: proof.requirement?.operation || "",
    expectation: proof.requirement?.expectation || "",
    surface: proof.requirement?.surface || "",
  };
  const readbackLocator = compactSourceLocator(proof.roles?.readback || semantic.callChain?.roles?.readback);
  const stateLocator = distinctExpectedStateLocator(proof, readbackLocator);
  const expectedProductState = {
    identity: sourceIdentity("product-state", stateLocator),
    expectedBehavior: semantic.stateOracle?.expectedBehavior || "",
    expectedBehaviorSha256: semantic.stateOracle?.expectedBehaviorSha256 || "",
    locator: stateLocator,
  };
  const independentReadback = {
    identity: sourceIdentity("independent-readback", readbackLocator),
    kind: "reviewed-verifier-readback",
    locator: readbackLocator,
    verifierCommand: semantic.verifierAssertion?.command || proof.verifier?.command || "",
    assertedSemanticDigest: proof.sourceFlowDigest || semantic.callChain?.digest || "",
  };
  assert(expectedProductState.identity !== independentReadback.identity, `${caseId} state/readback identity self-compare`);
  assert(locatorIdentity(stateLocator) !== locatorIdentity(readbackLocator), `${caseId} state/readback locator self-compare`);
  const productAction = buildProductAction({
    canonicalCase,
    implementationItem,
    screenRoute,
    workflowClass,
    primaryControl,
    negativeRoute,
    crossRouteNegative,
  });
  const inputs = buildWorkflowInputs({
    canonicalCase,
    implementationItem,
    workflowClass,
    canonicalSelector,
    productAction,
  });
  const endpointOwnedAction = endpointOwnedActionCases.has(caseId);
  const mutatesFixture = workflowClass === "persisted-mutation" || workflowClass === "form-submit" || endpointOwnedAction;
  const setup = [
    {
      kind: "bind-role-session",
      setupId: `${caseId}:role-session`,
      accountRole: canonicalCase.accountRole,
      required: canonicalCase.accountRole !== "anonymous",
    },
    {
      kind: "seed-reviewed-state",
      setupId: `${caseId}:reviewed-state`,
      strategy: workflowClass,
      route: primaryControl.route || screenRoute,
      semanticCallChainSha256: semanticDigest,
      persistedMutation: mutatesFixture,
      fixtureId: workflowFixtureId(caseId),
      beforeSnapshotRef: mutatesFixture ? `${caseId}:before-product-state` : null,
    },
  ];
  if (primaryControl.route !== screenRoute || primaryControl.accountRole !== canonicalCase.accountRole) {
    setup.push({
      kind: "bind-action-role-session",
      setupId: `${caseId}:action-role-session`,
      accountRole: primaryControl.accountRole,
      route: primaryControl.route,
      required: true,
      reason: primaryControl.accountRole !== canonicalCase.accountRole
        ? "exact primary control requires a distinct product role session"
        : "exact primary control is hosted on a distinct product route",
    });
  }
  const controlSequence = [nativeAction("navigate", {
    actionId: `${caseId}:navigate`,
    route: screenRoute,
    expectedCanonicalRoute: canonicalCase.route,
  })];
  if (primaryControl.route && primaryControl.route !== screenRoute) {
    controlSequence.push(nativeAction("navigate-action-route", {
      actionId: `${caseId}:navigate-action-route`,
      route: primaryControl.route,
      reason: "exact primary control is hosted on a distinct product workflow route",
    }));
  }

  if (endpointOwnedAction) {
    controlSequence.push(nativeAction("execute-endpoint-action", {
      actionId: `${caseId}:execute-endpoint-action`,
      endpoint: structuredClone(productAction.endpoint),
      inputId: `${caseId}:endpoint-action-fixture`,
      ownership: "product-endpoint-no-primary-control",
    }));
  } else if (workflowClass === "negative-route") {
    if (crossRouteNegative) {
      controlSequence.push(nativeAction("navigate-negative", {
        actionId: `${caseId}:navigate-negative`,
        route: canonicalCase.route,
        allowedStatuses: [404],
      }));
    }
  } else if (workflowClass === "form-submit") {
    controlSequence.push(nativeAction("wait-visible", {
      actionId: `${caseId}:wait-visible`, selector: targetSelector, selectorSource: primaryControl.source,
    }));
    const form = formSubmitSpec(caseId, canonicalSelector);
    controlSequence.push(nativeAction("submit-form", {
      actionId: `${caseId}:submit-form`,
      selector: form.selector,
      submitSelector: targetSelector,
      method: productAction.endpoint.method,
      action: productAction.endpoint.path,
      fields: [...form.fields],
      inputId: `${caseId}:form-values`,
      uiLifecycle: formSubmitUiLifecycle(caseId, form),
    }));
  } else if (workflowClass === "persisted-mutation") {
    controlSequence.push(nativeAction("wait-visible", {
      actionId: `${caseId}:wait-visible`, selector: targetSelector, selectorSource: primaryControl.source,
    }));
    controlSequence.push(nativeAction("execute-persisted-action", {
      actionId: `${caseId}:execute-persisted-action`,
      selector: targetSelector,
      endpoint: productAction.endpoint || null,
      localAction: productAction.localAction || null,
      inputId: `${caseId}:mutation-fixture`,
      uiLifecycle: persistedUiLifecycle(caseId, productAction, inputs),
    }));
  } else if (workflowClass === "actionable") {
    controlSequence.push(nativeAction("wait-visible", {
      actionId: `${caseId}:wait-visible`, selector: targetSelector, selectorSource: primaryControl.source,
    }));
    appendActionableControlAction({ caseId, selector: targetSelector, inputs, controlSequence });
  } else if (workflowClass === "hidden-disabled") {
    if (primaryControl.applicability === "not-applicable") {
      controlSequence.push(nativeAction("assert-product-boundary", {
        actionId: `${caseId}:assert-product-boundary`,
        readbackIdentity: independentReadback.identity,
      }));
    } else if (primaryControl.expectedVisible === false) {
      controlSequence.push(nativeAction("assert-hidden-control", {
        actionId: `${caseId}:assert-hidden-control`, selector: targetSelector, expectedExists: true,
      }));
    } else {
      controlSequence.push(nativeAction("assert-disabled-control", {
        actionId: `${caseId}:assert-disabled-control`, selector: targetSelector,
      }));
    }
  } else if (primaryControl.applicability === "not-applicable") {
    controlSequence.push(nativeAction("assert-product-state", {
      actionId: `${caseId}:assert-product-state`,
      readbackIdentity: independentReadback.identity,
    }));
  } else {
    controlSequence.push(nativeAction("wait-visible", {
      actionId: `${caseId}:wait-visible`, selector: targetSelector, selectorSource: primaryControl.source,
    }));
    controlSequence.push(nativeAction("assert-visible-read-model", {
      actionId: `${caseId}:assert-visible-read-model`, selector: targetSelector,
    }));
  }

  if (workflowClass !== "negative-route") {
    controlSequence.push(nativeAction("verify-independent-readback", {
      actionId: `${caseId}:verify-independent-readback`,
      expectedStateIdentity: expectedProductState.identity,
      expectedBehaviorSha256: expectedProductState.expectedBehaviorSha256,
      readbackIdentity: independentReadback.identity,
      readbackLocator: compactLocator(independentReadback.locator),
      verifierCommand: independentReadback.verifierCommand,
      runtimeEvidenceRequired: true,
      staticLocatorIsNotRuntimePass: true,
    }));
  }

  const cleanup = mutatesFixture
    ? [buildMutationCleanup({
        caseId,
        workflowClass,
        semanticClassification,
        productAction,
        independentReadback,
      })]
    : [{
        kind: "no-op-cleanup",
        cleanupId: `${caseId}:no-persisted-mutation`,
        persistedMutation: false,
        assertion: "reviewed workflow does not persist product state",
        semanticCallChainSha256: semanticDigest,
      }];
  if (workflowClass === "actionable") {
    const primaryLocalAction = controlSequence.find(action =>
      !["navigate", "navigate-action-route", "wait-visible", "verify-independent-readback"].includes(action.kind));
    cleanup.unshift(primaryLocalAction?.kind === "activate-control"
      ? {
          kind: "reset-local-ui-route",
          cleanupId: `${caseId}:reset-local-ui-route`,
          route: primaryControl.route,
          assertion: "reload the product route to discard transient DOM and page-script state",
        }
      : {
          kind: "restore-local-control",
          cleanupId: `${caseId}:restore-local-control`,
          selector: targetSelector,
        });
  }

  return {
    semanticClassification,
    setup,
    inputs,
    primaryControl,
    productAction,
    expectedProductState,
    independentReadback,
    controlSequence,
    cleanup,
  };
}

function buildMutationCleanup({
  caseId,
  workflowClass,
  productAction,
  independentReadback,
}) {
  const fixtureId = workflowFixtureId(caseId);
  const endpointPath = String(productAction.endpoint?.path || "");
  const sourceViewState = ["SRC-008", "SRC-010", "SRC-019"].includes(caseId) || [
    "/ops/api/sources/",
    "/ops/api/views/",
    "/ops/api/onvif/channels/",
  ].some(prefix => endpointPath.startsWith(prefix));
  const fileBackedState = workflowClass === "form-submit" ||
    caseId === "SRC-031" ||
    endpointPath === "/client/api/preferences/live-layout" ||
    endpointPath.startsWith("/ops/api/users") ||
    endpointPath.startsWith("/ops/api/invites") ||
    endpointPath.startsWith("/ops/api/access-requests") ||
    endpointPath.startsWith("/client/api/access-requests") ||
    endpointPath.startsWith("/ops/api/events/reviews");
  const restoreType = sourceViewState
    ? "restore-source-view-snapshot"
    : (fileBackedState
        ? (workflowClass === "form-submit" ? "restore-auth-fixture-snapshot" : "restore-file-backed-fixture-snapshot")
        : "restore-product-fixture-snapshot");
  const inverseAction = {
    endpoint: null,
    localAction: {
      type: restoreType,
      target: fixtureId,
      effect: sourceViewState
        ? "restore an existing source/view pair or disable a suite-created pair before isolated server teardown"
        : (fileBackedState
            ? "restore every owned file-backed product state byte-for-byte"
            : "restore or remove the product-memory fixture, then restore every owned state file byte-for-byte"),
    },
  };
  return {
    kind: "restore-fixture-state",
    cleanupId: `${caseId}:restore-fixture`,
    fixtureId,
    strategy: "restore-before-snapshot",
    beforeSnapshotRef: `${caseId}:before-product-state`,
    inverseAction,
    afterReadback: {
      identity: `${independentReadback.identity}:cleanup`,
      expectation: caseId === "AUTH-020"
        ? "absent"
        : (sourceViewState ? "inactive-or-equal-before" : "equal-before"),
      locator: structuredClone(independentReadback.locator),
    },
    readback: structuredClone(independentReadback),
  };
}

function appendActionableControlAction({ caseId, selector, inputs, controlSequence }) {
  if (detailsControls.has(selector)) {
    controlSequence.push(nativeAction("toggle-details", { actionId: `${caseId}:toggle-details`, selector }));
    return;
  }
  if (fillControls.has(selector)) {
    const value = `${caseId.toLowerCase()}-exact`;
    inputs.push({ inputId: `${caseId}:control-value`, kind: "literal-control-value", actualValue: value, sensitive: false });
    controlSequence.push(nativeAction("fill-control", { actionId: `${caseId}:fill-control`, selector, value }));
    return;
  }
  if (checkboxControls.has(selector)) {
    inputs.push({
      inputId: `${caseId}:checked-value`, kind: "initial-state-inversion", actualValue: "logical-not-initial", sensitive: false,
    });
    controlSequence.push(nativeAction("toggle-checkbox", {
      actionId: `${caseId}:toggle-checkbox`, selector, checkedFrom: "logical-not-initial",
    }));
    return;
  }
  if (selectControls.has(selector)) {
    const value = selectControls.get(selector);
    inputs.push({ inputId: `${caseId}:select-value`, kind: "literal-select-value", actualValue: value, sensitive: false });
    controlSequence.push(nativeAction("select-control", { actionId: `${caseId}:select-control`, selector, value }));
    return;
  }
  if (seededSelectControls.has(selector)) {
    inputs.push({
      inputId: `${caseId}:seeded-option`, kind: "server-seeded-option", actualValue: "first-non-empty-option",
      minimumNonEmptyOptions: 1, sensitive: false,
    });
    controlSequence.push(nativeAction("select-control", {
      actionId: `${caseId}:select-seeded-control`, selector, value: "first-non-empty-option",
    }));
    return;
  }
  if (enabledControls.has(selector) || linkControls.has(selector)) {
    controlSequence.push(nativeAction("activate-control", {
      actionId: `${caseId}:activate-control`, selector,
    }));
    return;
  }
  throw new Error(`${caseId} canonical selector has no exact actionable workflow classification: ${selector}`);
}

function buildProductAction({
  canonicalCase,
  implementationItem,
  screenRoute,
  workflowClass,
  primaryControl,
  negativeRoute,
  crossRouteNegative,
}) {
  const caseId = canonicalCase.testId;
  if (endpointOwnedActionCases.has(caseId)) {
    const endpoint = endpointOwnedActionSpecs[caseId];
    return {
      kind: "endpoint-owned-action",
      endpoint: {
        method: endpoint.method,
        path: endpoint.path,
        allowedStatuses: [...endpoint.allowedStatuses],
      },
      localAction: null,
      primaryControlRequired: false,
    };
  }
  if (workflowClass === "negative-route") {
    return {
      kind: "negative-route-request",
      endpoint: {
        method: "GET",
        path: negativeRoute || crossRouteNegative ? canonicalCase.route : screenRoute,
        allowedStatuses: [404],
      },
      localAction: null,
    };
  }
  if (workflowClass === "form-submit") {
    const selector = normalizeCanonicalSelector(canonicalCase.controlAction?.selector, canonicalCase);
    const contract = formSubmitSpec(caseId, selector);
    return {
      kind: "form-submit-request",
      endpoint: {
        method: contract.method,
        path: contract.path,
        allowedStatuses: [...contract.allowedStatuses],
      },
      localAction: null,
    };
  }
  if (workflowClass === "persisted-mutation") {
    const action = mutationProductAction(caseId, implementationItem, primaryControl);
    assert(Boolean(action.endpoint) !== Boolean(action.localAction), `${caseId} mutation product action must be exclusive`);
    return action;
  }
  if (workflowClass === "actionable") {
    if (["RULE-092", "RULE-093", "RULE-094", "RULE-095", "RULE-096", "RULE-100", "RULE-101"].includes(caseId)) {
      const verificationEndpoint = caseId === "RULE-092"
        ? { method: "POST", path: "/lab/analysis/rules", allowedStatuses: [400] }
        : (caseId === "RULE-095"
          ? { method: "POST", path: "/client/api/views/rule-095-view/webrtc/session", allowedStatuses: [400] }
          : (caseId === "RULE-096"
            ? { method: "POST", path: "/client/api/views/rule-096-view/webrtc/session", allowedStatuses: [404] }
            : { method: "PUT", path: `/lab/analysis/va-rules/${caseId === "RULE-093" ? "9893" : (caseId === "RULE-094" ? "9894" : (caseId === "RULE-101" ? "9891" : "{fixtureId}"))}`, allowedStatuses: [400] }));
      return {
        kind: "rejected-ui-action",
        endpoint: null,
        localAction: {
          type: "activate",
          target: primaryControl.selector,
          effect: "block the UI save before dispatch and preserve the reviewed rule registry",
          verificationEndpoint,
        },
      };
    }
    return {
      kind: "local-control-action",
      endpoint: null,
      localAction: {
        type: localActionType(primaryControl.selector),
        target: primaryControl.selector,
        effect: implementationItem.semanticEvidence?.stateOracle?.expectedBehavior || "reviewed local product state transition",
      },
    };
  }
  if (caseId === "RULE-097") {
    return {
      kind: "product-boundary-read",
      endpoint: { method: "GET", path: "/client/api/views", allowedStatuses: [200] },
      localAction: null,
    };
  }
  if (caseId === "RULE-098") {
    return {
      kind: "product-boundary-read",
      endpoint: { method: "GET", path: "/ops/api/rules/catalog", allowedStatuses: [200] },
      localAction: null,
    };
  }
  if (["RULE-001", "RULE-002", "RULE-003"].includes(caseId)) {
    return {
      kind: "product-state-read",
      endpoint: {
        method: "GET",
        path: "/ops/api/rules/catalog",
        allowedStatuses: [200],
      },
      localAction: null,
    };
  }
  return {
    kind: workflowClass === "hidden-disabled" ? "product-boundary-read" : "product-state-read",
    endpoint: {
      method: "GET",
      path: canonicalCase.route || screenRoute,
      allowedStatuses: caseId === "UI-001" && canonicalCase.route === "/" && screenRoute === "/login"
        ? [200, 302]
        : [200],
    },
    localAction: null,
  };
}

function formSubmitSpec(caseId, canonicalSelector) {
  const override = formSubmitOverrides.get(caseId);
  if (override) return override;
  const contract = formContracts.get(canonicalSelector);
  assert(contract, `${caseId} form submit contract missing`);
  const allowedStatuses = caseId === "AUTH-005"
    ? [403]
    : (caseId === "AUTH-035" ? [401] : [302]);
  return {
    selector: canonicalSelector,
    submitSelector: `${canonicalSelector} button[type="submit"]`,
    route: null,
    method: String(contract.method || "POST").toUpperCase(),
    path: contract.action,
    fields: [...contract.fields],
    allowedStatuses,
  };
}

function mutationProductAction(caseId, implementationItem, primaryControl) {
  const endpoint = (method, path, allowedStatuses = [200, 201]) => ({
    kind: "persisted-mutation-request",
    endpoint: { method, path, allowedStatuses },
    localAction: null,
  });
  const local = (type, effect) => ({
    kind: "persisted-workflow-local-action",
    endpoint: null,
    localAction: { type, target: primaryControl.selector, effect },
  });
  if (caseId === "UI-004") return endpoint("POST", "/password/change", [302, 400]);
  if (caseId === "UI-005") return endpoint("POST", "/logout", [302]);
  if (caseId === "UI-023") return endpoint("PUT", "/ops/api/vlm/profiles/{fixtureId}");
  if (caseId === "UI-029") return endpoint("DELETE", "/ops/api/vlm/profiles/{fixtureId}", [200, 404]);
  if (["UI-109", "SRC-066"].includes(caseId)) {
    return endpoint("PUT", "/ops/api/onvif/channels/{fixtureId}");
  }
  if (caseId === "AUTH-018") return endpoint("POST", "/ops/api/users", [201]);
  if (caseId === "AUTH-019") return endpoint("PUT", "/ops/api/users/{fixtureId}");
  if (["AUTH-036", "AUTH-039"].includes(caseId)) {
    return endpoint("POST", "/client/api/access-requests", [201]);
  }
  if (caseId === "AUTH-037") {
    return endpoint("POST", "/ops/api/access-requests/{fixtureId}/approve");
  }
  if (caseId === "AUTH-038") {
    return endpoint("POST", "/ops/api/access-requests/{fixtureId}/reject");
  }
  if (["SRC-001", "SRC-002", "SRC-003", "SRC-004", "SRC-005", "SRC-009"].includes(caseId)) {
    return endpoint("PUT", "/ops/api/sources/{fixtureId}");
  }
  if (["SRC-017", "SRC-018"].includes(caseId)) {
    return endpoint("PUT", "/ops/api/views/{fixtureId}");
  }
  if (["RULE-004", "RULE-005", "RULE-008"].includes(caseId)) {
    return endpoint("PUT", "/lab/analysis/va-rules/{fixtureId}");
  }
  if (["RULE-011", "RULE-012"].includes(caseId)) {
    return endpoint("PUT", "/lab/analysis/va-rules/{fixtureId}");
  }
  if (["RULE-026", "RULE-027", "RULE-028", "RULE-029", "RULE-030", "RULE-031", "RULE-032", "RULE-033"].includes(caseId)) {
    return endpoint("PUT", "/lab/analysis/profiles/{fixtureId}");
  }
  if (["RULE-034", "RULE-035", "RULE-036", "RULE-037", "RULE-038", "RULE-039"].includes(caseId)) {
    return endpoint("PUT", "/lab/analysis/va-rules/{fixtureId}");
  }
  if (caseId === "RULE-016") {
    return endpoint("PUT", "/lab/analysis/va-rules/{fixtureId}", [200]);
  }
  if (caseId === "RULE-006") return endpoint("DELETE", "/lab/analysis/va-rules/{fixtureId}");
  const ruleNumber = /^RULE-(\d+)$/.test(caseId) ? Number(caseId.slice(5)) : -1;
  if (["RULE-018", "RULE-019"].includes(caseId)) {
    return endpoint("PUT", "/lab/analysis/rules/{fixtureId}");
  }
  if (ruleNumber >= 41 && ruleNumber <= 91) {
    return endpoint("PUT", "/lab/analysis/rules/{fixtureId}", [200]);
  }
  if (["RULE-073", "RULE-075"].includes(caseId)) {
    return endpoint("PUT", "/lab/analysis/rules/{fixtureId}", [200]);
  }
  if (caseId === "RULE-020") return endpoint("DELETE", "/lab/analysis/rules/{fixtureId}");
  if (["RULE-022", "RULE-023"].includes(caseId)) {
    return endpoint("PUT", "/lab/analysis/profiles/{fixtureId}");
  }
  if (caseId === "RULE-024") return endpoint("DELETE", "/lab/analysis/profiles/{fixtureId}");
  if (caseId === "EVT-021") return endpoint("PUT", "/ops/api/events/reviews/{fixtureId}");
  if (caseId === "CLIENT-009") return endpoint("PUT", "/client/api/preferences/live-layout");
  if (caseId === "RULE-102") return local("update-review-loop", "render event type/conflict/reference/preset/EventRecord review state");
  if (caseId === "RULE-103") return local("click", "refresh configured/default re-entry rules before exact GET and replay readback");
  if (caseId === "RULE-104") return local("navigate", "open the approval-gated event draft in /ops/rules without registry writes");
  if (caseId === "RULE-111") return local("click", "apply one actual VLM candidate to the event-template form without saving or runtime/provider calls");
  if (caseId === "CLIENT-002") return local("click", "start selected live tile and create its client session");
  if (caseId === "CLIENT-005") return local("click", "stop all live tiles and close their client sessions");
  if (caseId === "SAFE-038") return local("click", "apply draft fields without registry, event, schema, media, or viewer write");
  if (caseId === "UI-036") return local("click", "apply the selected VLM candidate to the event-template draft without persisting it");
  const proof = implementationItem.semanticEvidence?.review4Proof || {};
  return local(
    proof.requirement?.operation || "reviewed-mutation",
    implementationItem.semanticEvidence?.stateOracle?.expectedBehavior || "reviewed product mutation",
  );
}

function buildWorkflowInputs({ canonicalCase, implementationItem, workflowClass, canonicalSelector, productAction }) {
  const caseId = canonicalCase.testId;
  const inputs = [{
    inputId: `${caseId}:semantic-expectation`,
    kind: "reviewed-semantic-expectation",
    valueSha256: implementationItem.semanticEvidence?.stateOracle?.expectedBehaviorSha256 || "",
    sensitive: false,
  }];
  if (endpointOwnedActionCases.has(caseId)) {
    inputs.push(endpointOwnedActionInput(canonicalCase, productAction));
    return inputs;
  }
  if (workflowClass === "form-submit") {
    const contract = formSubmitSpec(caseId, canonicalSelector);
    const values = formValues(caseId, contract);
    inputs.push({
      inputId: `${caseId}:form-values`,
      kind: "form-values",
      actualValue: values,
      fields: [...contract.fields],
      submit: true,
      seedReference: {
        fixtureId: workflowFixtureId(caseId),
        accountRole: canonicalCase.accountRole,
        route: productAction.endpoint.path,
      },
      sensitive: contract.fields.some(field => /password|token|confirm/i.test(field)),
      redacted: contract.fields.some(field => /password|token|confirm/i.test(field)),
    });
    return inputs;
  }
  if (workflowClass === "persisted-mutation") {
    const exactValues = persistedMutationInputValues(caseId);
    inputs.push({
      inputId: `${caseId}:mutation-fixture`,
      kind: "reversible-fixture-record",
      actualValue: {
        id: workflowFixtureId(caseId),
        displayName: `REVIEW4 ${caseId} fixture`,
        operation: implementationItem.semanticEvidence?.review4Proof?.requirement?.operation || "write",
        ...exactValues,
      },
      seedReference: {
        fixtureId: workflowFixtureId(caseId),
        accountRole: canonicalCase.accountRole,
        route: canonicalCase.route,
      },
      sensitive: false,
    });
    return inputs;
  }
  if (workflowClass === "actionable") {
    if (["RULE-103", "RULE-104", "RULE-111"].includes(caseId)) {
      inputs.push({
        inputId: `${caseId}:exact-runtime-fixture`,
        kind: "exact-runtime-fixture",
        actualValue: caseId === "RULE-103"
          ? { configuredRuleId: "9913", defaultRuleId: "9914", destinationZoneRuleId: "9915", replayExpected: ["positive", "positive", "missing-zone-red"] }
          : (caseId === "RULE-104"
            ? { eventAndVlmSidecar: true, approvalGatedRuleDraftReadiness: true, registryWritePerformed: false }
            : { actualVlmCandidate: true, applyToEventTemplateForm: true, manualSaveOnly: true }),
        seedReference: { fixtureId: workflowFixtureId(caseId), accountRole: canonicalCase.accountRole, route: canonicalCase.route },
        sensitive: false,
      });
      return inputs;
    }
    if (["RULE-092", "RULE-093", "RULE-094", "RULE-095", "RULE-096", "RULE-100", "RULE-101"].includes(caseId)) {
      inputs.push({
        inputId: `${caseId}:local-control-input`,
        kind: "rejected-endpoint-fixture",
        actualValue: {
          method: productAction.localAction.verificationEndpoint.method,
          path: productAction.localAction.verificationEndpoint.path,
          body: caseId === "RULE-092"
            ? { duplicateKind: "event-template", duplicateId: "9201" }
            : (caseId === "RULE-093"
              ? { variants: ["missing-profile", "missing-template"], profileId: "9693", templateId: "9793" }
              : (caseId === "RULE-094"
                ? { variants: ["inactive-profile", "inactive-template"], profileId: "9694", templateId: "9794" }
                : (caseId === "RULE-095"
                  ? { variant: "source-mismatch", viewId: "rule-095-view", ruleId: "9895" }
                  : (caseId === "RULE-096"
                    ? { variants: ["inactive-view", "inactive-channel"], viewId: "rule-096-view", ruleId: "9896" }
                    : (caseId === "RULE-100"
                      ? { validRuleId: "9890", conflictRuleId: workflowFixtureId(caseId), priority: 9890 }
                      : {
                          variants: ["analysis-template-mismatch", "profile-template-mismatch"],
                          analysisClasses: ["person"],
                          profileClasses: ["person"],
                          templateClasses: ["vehicle"],
                          alternateProfileClasses: ["vehicle"],
                        }))))),
        },
        seedReference: {
          fixtureId: workflowFixtureId(caseId),
          accountRole: canonicalCase.accountRole,
          route: canonicalCase.route,
        },
        sensitive: false,
      });
      return inputs;
    }
    if (productAction.endpoint) {
      inputs.push({
        inputId: `${caseId}:local-control-input`,
        kind: "rejected-endpoint-fixture",
        actualValue: {
          method: productAction.endpoint.method,
          path: productAction.endpoint.path,
          body: caseId === "RULE-101"
            ? { analysisClasses: ["person"], profileClasses: ["vehicle"], templateClasses: ["person"] }
            : {},
        },
        seedReference: {
          fixtureId: workflowFixtureId(caseId),
          accountRole: canonicalCase.accountRole,
          route: canonicalCase.route,
        },
        sensitive: false,
      });
      return inputs;
    }
    inputs.push({
      inputId: `${caseId}:local-control-input`,
      kind: "local-control-input",
      actualValue: {
        selector: productAction.localAction.target,
        operation: productAction.localAction.type,
      },
      sensitive: false,
    });
    return inputs;
  }
  if (["RULE-097", "RULE-098", "RULE-100"].includes(caseId)) {
    const exact = {
      "RULE-097": {
        assignedViewId: "rule-097-view",
        blockedViewId: "rule-097-blocked-view",
        allowedRuleId: "9897",
        disallowedRuleId: "98970",
      },
      "RULE-098": {
        viewId: "rule-098-view",
        ruleId: "9898",
        rejectedRequestRole: "viewer",
        expectedStatus: 400,
        expectedError: "allowed vaRule is required for va-rule mode",
      },
      "RULE-100": {
        validRuleId: "9890",
        conflictRuleId: workflowFixtureId(caseId),
        expectedStatus: 400,
        expectedError: "vaRule priority conflicts with existing rule on same source",
      },
    }[caseId];
    inputs.push({
      inputId: `${caseId}:exact-runtime-boundary`,
      kind: "rejected-endpoint-fixture",
      actualValue: exact,
      seedReference: {
        fixtureId: workflowFixtureId(caseId),
        accountRole: productAction.endpoint.path.startsWith("/client/") ? "viewer" : "operator",
        route: caseId === "RULE-097" ? "/client/live" : canonicalCase.route,
      },
      sensitive: false,
    });
    return inputs;
  }
  inputs.push({
    inputId: `${caseId}:product-read-input`,
    kind: workflowClass === "negative-route" ? "negative-route-request" : "product-state-request",
    actualValue: {
      method: productAction.endpoint.method,
      path: productAction.endpoint.path,
      accountRole: canonicalCase.accountRole,
    },
    sensitive: false,
  });
  return inputs;
}

function endpointOwnedActionInput(canonicalCase, productAction) {
  const caseId = canonicalCase.testId;
  const fixtureId = workflowFixtureId(caseId);
  const source = {
    sourceId: fixtureId,
    displayName: `REVIEW4 ${caseId} source`,
    kind: "file",
    file: "sample_h264.mp4",
    allowDuplicateSource: true,
    enabled: true,
    zone: "REVIEW4",
  };
  const publishedView = {
    viewId: fixtureId,
    displayName: `REVIEW4 ${caseId} view`,
    sourceId: fixtureId,
    allowedOverlayModes: ["raw", "va-overlay", "va-rule"],
    allowedRuleIds: [],
    clientGroups: ["default"],
    showDashboard: true,
    showEvents: true,
    showMetadataSummary: true,
    maxTiles: 1,
    enabled: true,
  };
  let body = null;
  let setup = { kind: "none" };
  let readback = { kind: "endpoint-response-and-authoritative-registry" };
  if (caseId === "AUTH-020") {
    setup = { kind: "active-auth-user", username: fixtureId, role: "viewer" };
    readback = { kind: "disabled-user-store-list-session-login" };
  } else if (caseId === "SRC-008") {
    body = source;
    setup = { kind: "source-absent", sourceId: fixtureId };
    readback = { kind: "created-source-registry", sourceId: fixtureId };
  } else if (caseId === "SRC-010") {
    setup = { kind: "source-view-pair", source, publishedView };
    readback = { kind: "disabled-source-and-client-boundary", sourceId: fixtureId, viewId: fixtureId };
  } else if (caseId === "SRC-019") {
    setup = { kind: "source-view-pair", source, publishedView };
    readback = { kind: "disabled-view-and-client-boundary", sourceId: fixtureId, viewId: fixtureId };
  } else if (caseId === "SRC-031") {
    body = JSON.parse(fs.readFileSync(path.join(rootDir, "test/fixtures/onvif_live_import_stub.json"), "utf8"));
    setup = { kind: "registry-equal-before" };
    readback = { kind: "onvif-draft-no-registry-mutation" };
  }
  return {
    inputId: `${caseId}:endpoint-action-fixture`,
    kind: "endpoint-action-fixture",
    actualValue: {
      method: productAction.endpoint.method,
      path: productAction.endpoint.path,
      body,
      setup,
      readback,
    },
    seedReference: {
      fixtureId,
      accountRole: canonicalCase.accountRole,
      route: canonicalCase.route,
    },
    sensitive: false,
  };
}

function persistedMutationInputValues(caseId) {
  if (caseId === "SRC-009") {
    return { displayName: "File Source Updated", zone: "South", file: "sample_h265.mp4" };
  }
  if (caseId === "SRC-018") {
    return {
      displayName: "View One Updated",
      kind: "rtsp",
      allowedRuleIds: ["13"],
      clientGroups: ["review4-client"],
    };
  }
  if (caseId === "RULE-011") {
    return { profileId: "9101", expectedProfileMapping: true };
  }
  if (caseId === "RULE-012") {
    return {
      region: { x: 0.1, y: 0.1, width: 0.6, height: 0.6 },
      polygon: [[0.1, 0.1], [0.7, 0.1], [0.7, 0.7], [0.1, 0.7]],
    };
  }
  if (caseId === "RULE-030") {
    return { minConfidence: 0.75, expectedValidation: "accepted-range" };
  }
  if (caseId === "RULE-026") return { detector: "yolo" };
  if (caseId === "RULE-027") return { detector: "dummy" };
  if (caseId === "RULE-028") return { fps: 9, expectedValidation: "positive-integer" };
  if (caseId === "RULE-029") return { maxQueue: 3, expectedValidation: "positive-integer" };
  if (caseId === "RULE-031") return { nms: 0.55, expectedValidation: "accepted-range" };
  if (caseId === "RULE-032") return { inputWidth: 320, inputHeight: 320, expectedValidation: "positive-integer" };
  if (caseId === "RULE-033") return { trackingClasses: ["person", "car"] };
  if (caseId === "RULE-034") return { tracker: "none", reid: "off" };
  if (caseId === "RULE-035") return { tracker: "lite", reid: "off" };
  if (caseId === "RULE-036") return { tracker: "kalman-lite", reid: "off" };
  if (caseId === "RULE-037") return { tracker: "bytetrack", reid: "off" };
  if (caseId === "RULE-038") return { tracker: "lite", reid: "off" };
  if (caseId === "RULE-039") return { tracker: "lite", reid: "assist" };
  if (caseId === "RULE-041") return { eventMode: "event", eventType: "presence" };
  if (caseId === "RULE-042") return { eventMode: "event", eventType: "enter" };
  if (caseId === "RULE-043") return { eventMode: "event", eventType: "exit" };
  if (caseId === "RULE-044" || caseId === "RULE-045") return { eventMode: "event", eventType: "line-crossing", direction: "any" };
  if (caseId === "RULE-046") return { eventMode: "event", eventType: "line-crossing", direction: "forward" };
  if (caseId === "RULE-047") return { eventMode: "event", eventType: "line-crossing", direction: "reverse" };
  if (caseId === "RULE-048") return { eventMode: "scenario", eventType: "intrusion-dwell" };
  if (caseId === "RULE-049") return { eventMode: "scenario", eventType: "re-entry" };
  if (caseId === "RULE-050") return { eventMode: "scenario", eventType: "wrong-direction", direction: "forward" };
  if (caseId === "RULE-051") return { eventMode: "scenario", eventType: "intrusion-after-line-crossing", direction: "any" };
  if (caseId === "RULE-052") return { eventMode: "scenario", eventType: "loitering" };
  if (caseId === "RULE-053") return { eventMode: "scenario", eventType: "zone-occupancy" };
  const presetByCase = {
    "RULE-054": "default", "RULE-055": "road", "RULE-056": "retail", "RULE-057": "park",
    "RULE-058": "indoor", "RULE-059": "lobby", "RULE-060": "platform", "RULE-061": "entrance",
    "RULE-062": "doorway", "RULE-063": "parking", "RULE-064": "elevator",
  }[caseId];
  if (presetByCase) return { eventMode: "scenario", eventType: "intrusion-dwell", preset: presetByCase, restrictedZoneIds: [`${caseId.toLowerCase()}-zone`] };
  if (caseId === "RULE-065") return { eventMode: "scenario", eventType: "intrusion-dwell", preset: "custom", minConfidence: 0.61, candidateTimeMs: 3500, dwellTimeMs: 12500, cooldownMs: 9000, restrictedZoneIds: ["rule-065-zone"] };
  if (caseId === "RULE-066") return { eventMode: "scenario", eventType: "intrusion-dwell", preset: "custom", restrictedZoneIds: ["rule-066-zone"] };
  if (caseId === "RULE-067") return { eventMode: "scenario", eventType: "intrusion-dwell", preset: "custom", candidateTimeMs: 2500, restrictedZoneIds: ["rule-067-zone"] };
  if (caseId === "RULE-068") return { eventMode: "scenario", eventType: "intrusion-dwell", preset: "custom", dwellTimeMs: 10500, restrictedZoneIds: ["rule-068-zone"] };
  if (caseId === "RULE-069") return { eventMode: "scenario", eventType: "intrusion-dwell", preset: "custom", cooldownMs: 6000, restrictedZoneIds: ["rule-069-zone"] };
  if (caseId === "RULE-070") return { eventMode: "scenario", eventType: "re-entry", preset: "custom", reEntryMode: "configured-zones", reEntryZoneIds: ["rule-070-destination"] };
  if (caseId === "RULE-071") return { eventMode: "scenario", eventType: "re-entry", preset: "custom", reEntryWindowMs: 17000 };
  if (caseId === "RULE-072") return { eventMode: "scenario", eventType: "re-entry", preset: "custom", cooldownMs: 9000 };
  if (caseId === "RULE-073" || caseId === "RULE-074") return { eventMode: "scenario", eventType: "wrong-direction", preset: "custom", direction: "forward" };
  if (caseId === "RULE-075") return { eventMode: "scenario", eventType: "wrong-direction", preset: "custom", direction: "forward", cooldownMs: 9000 };
  if (caseId === "RULE-076") return { eventMode: "scenario", eventType: "intrusion-after-line-crossing", preset: "custom" };
  if (caseId === "RULE-077") return { eventMode: "scenario", eventType: "intrusion-after-line-crossing", preset: "custom", direction: "reverse" };
  if (caseId === "RULE-078") return { eventMode: "scenario", eventType: "intrusion-after-line-crossing", preset: "custom", targetZoneIds: ["rule-078-zone"] };
  if (caseId === "RULE-079") return { eventMode: "scenario", eventType: "intrusion-after-line-crossing", preset: "custom", lineDelayMs: 13000 };
  if (caseId === "RULE-080") return { eventMode: "scenario", eventType: "intrusion-after-line-crossing", preset: "custom", dwellTimeMs: 4500 };
  if (caseId === "RULE-081") return { eventMode: "scenario", eventType: "intrusion-after-line-crossing", preset: "custom", cooldownMs: 11000 };
  if (caseId === "RULE-082") return { eventMode: "scenario", eventType: "loitering", preset: "custom", restrictedZoneIds: ["rule-082-zone"] };
  if (caseId === "RULE-083") return { eventMode: "scenario", eventType: "loitering", preset: "custom", dwellTimeMs: 35000 };
  if (caseId === "RULE-084") return { eventMode: "scenario", eventType: "loitering", preset: "custom", loiteringRadius: 0.12 };
  if (caseId === "RULE-085") return { eventMode: "scenario", eventType: "loitering", preset: "custom", loiteringPoints: 6 };
  if (caseId === "RULE-086") return { eventMode: "scenario", eventType: "loitering", preset: "custom", cooldownMs: 13000 };
  if (caseId === "RULE-087") return { eventMode: "scenario", eventType: "loitering", preset: "custom", groundPlane: true };
  if (caseId === "RULE-088") return { eventMode: "scenario", eventType: "zone-occupancy", preset: "custom", restrictedZoneIds: ["rule-088-zone"] };
  if (caseId === "RULE-089") return { eventMode: "scenario", eventType: "zone-occupancy", preset: "custom", zoneThreshold: 7 };
  if (caseId === "RULE-090") return { eventMode: "scenario", eventType: "zone-occupancy", preset: "custom", zoneDwellMs: 9000 };
  if (caseId === "RULE-091") return { eventMode: "scenario", eventType: "zone-occupancy", preset: "custom", cooldownMs: 14000 };
  return {};
}

function formValues(caseId, form) {
  const fixtureId = workflowFixtureId(caseId);
  const fields = form.fields;
  const values = {
    username: form.selector === '[data-testid="auth-setup-form"]' || caseId === "AUTH-007"
      ? "admin"
      : fixtureId,
    password: { secretRef: `${caseId}:fixture-password`, redacted: true },
    confirm: { secretRef: `${caseId}:fixture-password`, redacted: true },
    confirmPassword: { secretRef: `${caseId}:fixture-password`, redacted: true },
    currentPassword: { secretRef: `${caseId}:fixture-current-password`, redacted: true },
    token: { secretRef: `${caseId}:fixture-invite-token`, redacted: true },
    displayName: `REVIEW4 ${caseId}`,
    contact: `${fixtureId}@example.invalid`,
    viewId: `${fixtureId}-view`,
    reason: `${caseId} exact workflow verification`,
    role: "viewer",
    ttlSeconds: 3600,
  };
  return Object.fromEntries(fields.map(field => [field, values[field] ?? `${fixtureId}-${field}`]));
}

function workflowFixtureId(caseId) {
  if (/^RULE-\d+$/.test(caseId)) {
    return String(3_920_000 + Number(caseId.replace(/\D/g, "")));
  }
  const channelCase = /^(?:SRC-(?:001|002|003|004|005|008|009|010|017|018|019|066)|UI-109)$/.exec(caseId);
  if (channelCase) {
    const digits = Number(caseId.replace(/\D/g, ""));
    return String(3_900_000 + (caseId.startsWith("UI-") ? 100_000 : 0) + digits);
  }
  return `${caseId.toLowerCase()}-review4-fixture`;
}

function persistedUiLifecycle(caseId, productAction, inputs) {
  const fixtureId = inputs.find(input => input.kind === "reversible-fixture-record")?.actualValue?.id ||
    workflowFixtureId(caseId);
  let adapter = "";
  if (caseId === "UI-023") adapter = "vlm-profile-save";
  else if (caseId === "UI-029") adapter = "vlm-profile-delete";
  else if (["UI-109", "SRC-001", "SRC-002", "SRC-003", "SRC-004", "SRC-005", "SRC-009", "SRC-017", "SRC-018", "SRC-066"].includes(caseId)) adapter = "channel-source-view-pair";
  else if (caseId === "AUTH-018") adapter = "auth-user-create";
  else if (caseId === "AUTH-019") adapter = "auth-user-update";
  else if (caseId === "AUTH-037") adapter = "auth-access-approve";
  else if (caseId === "AUTH-038") adapter = "auth-access-reject";
  else if (caseId === "AUTH-039") adapter = "auth-access-request-create";
  else if (["RULE-004", "RULE-005", "RULE-008", "RULE-011", "RULE-012", "RULE-016", "RULE-034", "RULE-035", "RULE-036", "RULE-037", "RULE-038", "RULE-039"].includes(caseId)) adapter = "rule-va-save";
  else if (caseId === "RULE-006") adapter = "rule-va-delete";
  else if (["RULE-018", "RULE-019", ...Array.from({ length: 51 }, (_, index) => `RULE-${String(41 + index).padStart(3, "0")}`)].includes(caseId)) adapter = "rule-event-save";
  else if (caseId === "RULE-020") adapter = "rule-event-delete";
  else if (["RULE-022", "RULE-023", "RULE-026", "RULE-027", "RULE-028", "RULE-029", "RULE-030", "RULE-031", "RULE-032", "RULE-033"].includes(caseId)) adapter = "rule-profile-save";
  else if (caseId === "RULE-024") adapter = "rule-profile-delete";
  else if (caseId === "EVT-021") adapter = "event-review-save";
  else if (caseId === "CLIENT-009") adapter = "client-layout-save";
  assert(adapter, `${caseId} persisted UI lifecycle adapter is not classified`);
  let requestBinding = null;
  if (adapter === "channel-source-view-pair") {
    const atomicOnvif = ["UI-109", "SRC-066"].includes(caseId);
    requestBinding = {
      mode: atomicOnvif ? "atomic-pair" : "ordered-source-view-pair",
      expectedRequests: atomicOnvif
        ? [{ method: "PUT", pathTemplate: "/ops/api/onvif/channels/{fixtureId}" }]
        : [
            { method: "PUT", pathTemplate: "/ops/api/sources/{fixtureId}" },
            { method: "PUT", pathTemplate: "/ops/api/views/{fixtureId}" },
          ],
    };
  }
  return {
    schema: "media-server.v390-ui-persisted-lifecycle.v1",
    adapter,
    fixtureBinding: {
      fixtureId,
      requestMethod: productAction.endpoint?.method || "",
      requestPathTemplate: productAction.endpoint?.path || "",
    },
    requestBinding,
    requiredPhases: ["select-or-open", "populate-valid-product-input", "activate-primary-control", "correlated-request", "authoritative-readback"],
  };
}

function formSubmitUiLifecycle(caseId, form) {
  const entrySelector = caseId === "AUTH-014" ? "#add-user-btn" : null;
  let adapter = "auth-standard-submit";
  if (caseId === "AUTH-014") adapter = "auth-user-create";
  else if (["AUTH-015", "AUTH-033"].includes(caseId)) adapter = "auth-invite-create";
  else if (["UI-008", "AUTH-036"].includes(caseId)) adapter = "auth-access-request-create";
  else if (caseId === "UI-005") adapter = "auth-logout";
  const fieldControls = form.fields.map(name => {
    if (form.selector === '[data-testid="auth-setup-form"]' && name === "username") {
      return { name, control: "readonly-value", expectedValue: "admin", valueSource: "product-fixed-admin" };
    }
    if (name === "role") return { name, control: "select" };
    if (caseId === "AUTH-014" && name === "viewId") {
      return {
        name,
        control: "hidden-binding",
        bindingSelector: "[data-assignment-view]",
        valueSource: "runtime-default-view",
      };
    }
    if (["AUTH-015", "AUTH-033", "UI-008", "AUTH-036"].includes(caseId) && name === "viewId") {
      return { name, control: "fill", valueSource: "runtime-default-view" };
    }
    return { name, control: "fill" };
  });
  return {
    schema: "media-server.v390-ui-form-lifecycle.v1",
    adapter,
    formSelector: form.selector,
    submitSelector: form.submitSelector,
    entrySelector,
    fieldControls,
    requiredPhases: [
      "enter-form-mode",
      "populate-typed-controls",
      "activate-submit-control",
      "capture-correlated-response-identity",
      "authoritative-readback",
    ],
  };
}

function localActionType(selector) {
  if (fillControls.has(selector)) return "fill";
  if (checkboxControls.has(selector)) return "toggle-checkbox";
  if (selectControls.has(selector) || seededSelectControls.has(selector)) return "select";
  if (detailsControls.has(selector)) return "toggle-details";
  if (linkControls.has(selector)) return "follow-link";
  return "activate";
}

function distinctExpectedStateLocator(proof, readbackLocator) {
  for (const candidate of [proof.roles?.state, proof.roles?.action, proof.roles?.dispatch, proof.roles?.owner]) {
    const locator = compactSourceLocator(candidate);
    if (locator?.file && locatorIdentity(locator) !== locatorIdentity(readbackLocator)) return locator;
  }
  throw new Error("no independent expected product state locator");
}

function sourceLocatorFromAnchor(caseId, source) {
  const sourceText = fs.readFileSync(path.join(rootDir, source.file), "utf8");
  assert(sourceText.includes(source.anchor), `${caseId} primary control source anchor missing from ${source.file}`);
  assert(sourceText.split(source.anchor).length === 2,
    `${caseId} primary control source anchor must be unique in ${source.file}`);
  const anchorSha256 = sha256Text(source.anchor);
  return {
    file: source.file,
    symbol: `review4-primary-control:${caseId}`,
    anchor: source.anchor,
    anchorSha256,
    contextSha256: anchorSha256,
  };
}

function compactSourceLocator(value) {
  if (!value || typeof value !== "object") return null;
  return {
    file: value.file || "",
    symbol: value.symbol || "",
    anchor: value.anchor || "",
    anchorSha256: sha256Text(value.anchor || ""),
    contextSha256: value.contextSha256 || sha256Text(value.anchor || ""),
  };
}

function hasMixedSuccessAndErrorStatuses(statuses) {
  const values = Array.isArray(statuses) ? statuses : [];
  const hasSuccess = values.some(status => status >= 200 && status < 400);
  const hasError = values.some(status => status >= 400 && status < 600);
  return hasSuccess && hasError;
}

function containsLiteralAuthMaterial(value) {
  if (!value || typeof value !== "object") return false;
  for (const [key, fieldValue] of Object.entries(value)) {
    if (/^(?:password|currentPassword|confirm|confirmPassword|token)$/i.test(key)) {
      if (!fieldValue || typeof fieldValue !== "object" || Array.isArray(fieldValue) ||
          typeof fieldValue.secretRef !== "string" || fieldValue.secretRef.length === 0 ||
          fieldValue.redacted !== true) {
        return true;
      }
    }
    if (fieldValue && typeof fieldValue === "object" && containsLiteralAuthMaterial(fieldValue)) return true;
  }
  return false;
}

function sourceIdentity(prefix, locator) {
  return `${prefix}:${locatorIdentity(locator)}`;
}

function locatorIdentity(value) {
  return `${value?.file || ""}#${value?.symbol || ""}#${value?.contextSha256 || ""}`;
}

function sha256Text(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function buildActionSemanticCompletion({
  caseId,
  screenRoute,
  action,
  negativeRoute = false,
  primaryActionId,
  primaryControl,
  productAction,
  expectedProductState,
  independentReadback,
  workflowInputs,
}) {
  const primary = action.actionId === primaryActionId;
  const negative = action.kind === "navigate-negative" || (action.kind === "navigate" && negativeRoute);
  const initialNavigation = action.kind === "navigate" && !primary;
  const setupNavigation = action.kind === "navigate-action-route";
  const independent = action.kind === "verify-independent-readback";
  const phase = primary
    ? "primary-action"
    : (initialNavigation ? "initial-navigation" : (setupNavigation ? "setup-navigation" : "independent-readback"));
  const correlationId = initialNavigation
    ? `${caseId}:navigation`
    : `${action.actionId}:completion`;
  let request = null;
  let localTransition = null;
  const localCompletionContract = primary ? localCompletionContracts.get(caseId) || null : null;
  const readModelCompletionContract = primary ? readModelCompletionContracts.get(caseId) || null : null;
  if (primary) {
    if (productAction.endpoint) {
      request = actionRequestContract(correlationId, productAction.endpoint, workflowInputs, caseId);
    } else {
      localTransition = {
        selector: primaryControl.selector,
        type: productAction.localAction.type,
        target: productAction.localAction.target,
        effect: productAction.localAction.effect,
        property: localCompletionContract ? null : localTransitionProperty(action),
        ...(localCompletionContract ? structuredClone(localCompletionContract) : {}),
      };
    }
  } else if (initialNavigation) {
    request = actionRequestContract(correlationId, {
      method: "GET",
      path: screenRoute,
      allowedStatuses: [200],
    });
  } else if (setupNavigation) {
    request = actionRequestContract(correlationId, {
      method: "GET",
      path: action.route,
      allowedStatuses: [200],
    });
  }
  const requiredSource = negative
    ? "negative-route-status"
    : (localTransition ? "local-transition-readback" : "endpoint-dom");
  return {
    schema: "media-server.v390-ui-action-completion.v2",
    required: true,
    phase,
    actionId: action.actionId,
    actionKind: action.kind,
    controlSelector: primary ? primaryControl.selector : (action.selector || null),
    linkedPrimaryActionId: independent ? primaryActionId : null,
    requiredSource,
    correlationId,
    request,
    localTransition,
    expectedBehaviorSha256: primary || independent ? expectedProductState.expectedBehaviorSha256 : "",
    readback: {
      identity: primary || independent ? independentReadback.identity : `${caseId}:navigation`,
      expectedStateIdentity: primary || independent ? expectedProductState.identity : "",
      expectedBehaviorSha256: primary || independent ? expectedProductState.expectedBehaviorSha256 : "",
      allowedObservationSources: ["browser-dom", "readback-request", "event-record", "server-log"],
      staticLocatorIsNotRuntimePass: primary || independent,
    },
    readbackIdentity: primary || independent ? independentReadback.identity : `${caseId}:navigation`,
    readbackExpectation: localCompletionContract
      ? { postconditions: structuredClone(localCompletionContract.postconditions || []) }
      : (readModelCompletionContract
          ? structuredClone(readModelCompletionContract)
          : semanticReadbackExpectation(action)),
    attestedAlternatives: negative ? [] : ["persisted-readback", "event-record", "server-log"],
  };
}

function actionRequestContract(correlationId, endpoint, workflowInputs = [], caseId = "") {
  const urlPathTemplate = endpoint.path;
  const pathParameters = {};
  const parameterNames = [...String(urlPathTemplate).matchAll(/\{([^/{}]+)\}/g)].map(match => match[1]);
  const fixtureId = workflowInputs
    .map(input => input?.seedReference?.fixtureId || input?.actualValue?.id || "")
    .find(Boolean) || (caseId ? workflowFixtureId(caseId) : "");
  for (const name of parameterNames) {
    assert(["fixtureId", "id"].includes(name), `${caseId} unsupported endpoint path parameter: ${name}`);
    assert(fixtureId, `${caseId} endpoint path parameter ${name} has no exact workflow fixture`);
    pathParameters[name] = fixtureId;
  }
  const urlPath = String(urlPathTemplate).replace(/\{([^/{}]+)\}/g, (_match, name) =>
    encodeURIComponent(pathParameters[name]));
  return {
    correlationHeader: "x-media-server-correlation-id",
    correlationId,
    correlationSource: "request-header",
    method: endpoint.method,
    urlPathTemplate,
    urlPath,
    pathParameters,
    allowedStatuses: [...endpoint.allowedStatuses],
  };
}

function localTransitionProperty(action) {
  if (action.kind === "toggle-details") return "open";
  if (action.kind === "fill-control") return "value";
  if (action.kind === "toggle-checkbox") return "checked";
  if (action.kind === "select-control") return "selectedValues";
  if (action.kind === "activate-control") return "url";
  return "state";
}

function primaryWorkflowAction(actions, negativeRoute) {
  if (negativeRoute) return actions[0];
  return actions.find(action =>
    !["navigate", "navigate-action-route", "wait-visible", "verify-independent-readback"].includes(action.kind),
  ) || actions[0];
}

function semanticReadbackExpectation(action) {
  if (action.kind === "navigate") return { exists: true, visible: true };
  if (action.kind === "navigate-action-route") return { route: action.route, exists: true, visible: true };
  if (action.kind === "navigate-negative") return { navigationStatus: action.allowedStatuses[0] };
  if (["assert-product-state", "assert-product-boundary", "assert-visible-read-model"].includes(action.kind)) {
    return { exists: true, visible: true };
  }
  if (action.kind === "assert-hidden-control") return { exists: true, visible: false };
  if (action.kind === "assert-disabled-control") return { exists: true, disabled: true };
  if (action.kind === "assert-enabled-control") return { exists: true, visible: true, disabled: false };
  if (action.kind === "assert-link-target") return { tag: "a", hrefKind: "same-origin-path" };
  if (action.kind === "assert-seeded-select") {
    return { tag: "select", minimumNonEmptyOptions: action.minimumNonEmptyOptions };
  }
  if (action.kind === "submit-form") {
    return { submitted: true, method: action.method, action: action.action, fields: [...action.fields] };
  }
  if (action.kind === "execute-persisted-action") return { persistedMutationObserved: true };
  if (action.kind === "execute-endpoint-action") {
    return {
      endpointActionObserved: true,
      method: action.endpoint.method,
      path: action.endpoint.path,
      correlationRequired: true,
      independentReadbackRequired: true,
    };
  }
  if (action.kind === "verify-independent-readback") {
    return {
      readbackIdentity: action.readbackIdentity,
      expectedStateIdentity: action.expectedStateIdentity,
      expectedBehaviorSha256: action.expectedBehaviorSha256,
      runtimeEvidenceRequired: true,
    };
  }
  if (action.kind === "activate-control") return { activated: true };
  if (action.kind === "toggle-details") return { changedProperty: "open", changed: true };
  if (action.kind === "fill-control") return { property: "value", value: action.value };
  if (action.kind === "toggle-checkbox") return { changedProperty: "checked", changed: true };
  if (action.kind === "select-control") return { property: "selectedValues", value: [action.value] };
  throw new Error(`semantic completion expectation missing for ${action.kind}`);
}

function primarySemanticCompletion(actions) {
  const primary = actions.find(action =>
    !["navigate", "navigate-action-route", "wait-visible", "navigate-negative"].includes(action.kind),
  ) || actions.find(action => action.kind === "navigate-negative") || actions[0];
  return structuredClone(primary.semanticCompletion);
}

function compactLocator(value) {
  if (!value || typeof value !== "object") return null;
  return {
    file: value.file || "",
    symbol: value.symbol || "",
    contextSha256: value.contextSha256 || "",
  };
}

function isRouteRootSelector(value) {
  return value === "body" || /^body\.(?:ops|client|auth|product)-shell$/.test(value || "");
}

function normalizeCanonicalSelector(value, canonicalCase = null) {
  if (typeof value !== "string" || !value.trim()) return null;
  if (value === '[data-testid="${escapeHtml(testId)}"]') {
    if (canonicalCase?.testId === "SRC-038") {
      return '[data-testid="client-safe-source-status-digest"]';
    }
    if (canonicalCase?.testId === "CLIENT-007") {
      return ".client-viewer-events";
    }
    return '[data-testid="client-dashboard-safe-summary"]';
  }
  if (new RegExp(dynamicSelectorPattern).test(value)) return null;
  return value;
}

function inferNetworkUrlIncludes(canonicalCase) {
  const candidates = [canonicalCase.route, canonicalCase.controlAction?.actionAnchor]
    .filter(value => typeof value === "string" && value.includes("/api/"))
    .map(value => value.includes("{") ? value.slice(0, value.indexOf("{")) : value);
  return [...new Set(candidates)];
}

function nativeAction(kind, fields) {
  return { kind, dispatch: "playwright-native", ...fields };
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
