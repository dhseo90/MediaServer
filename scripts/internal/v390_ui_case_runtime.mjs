// 파일 용도: exact 424 각 case의 fresh role session, runtime secret, persisted fixture snapshot/복구를 소유한다.

import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { assertSecretValuesAbsentFromTree } from "./v390_acceptance_ui_environment.mjs";
import { exactRuntimeOracleFor } from "./v390_ui_exact_oracle_catalog.mjs";
import {
  eventExactRuntimeBindingRequirements,
  eventExactValuesAtPath,
  materializeEventExactTemplate,
} from "./v390_ui_exact_event_oracle_evaluator.mjs";
import { ruleRelationshipFixtureIdentity } from "./v390_ui_native_exact_cases_lib.mjs";

const descriptorSchema = "media-server.v390-ui-runtime-descriptor.v1";
const roleMapSchema = "media-server.v390-ui-role-state-map.v1";

export const formReadbackProfiles = Object.freeze({
  "UI-008": profile("369115bd854774b2872b93c2c631149ca84758a1b153e4301716a85c6533d969", ["responsePending", "storePending", "listPending", "noUserOrInvite", "pendingLoginDenied", "uiPending"]),
  "UI-002": profile("f44961be73ee6e07c913f79ddcf045a5efd06d60f2bea8ce1478ea1945f46ba0", ["weakRejected", "weakNoWrite", "adminStored", "plaintextAbsent", "adminWhoami"]),
  "UI-003": profile("60b1ba654195a63cc5c0d0b05446a304cf7979ded85d85872bac1450314512a8", ["stableAuthorization", "viewerWhoami", "viewerLanding"]),
  "UI-004": profile("d97d5f54966ab4dcc224d967fc5ff1820ebbdc7e2cddee8c625b219bccda1ab4", ["oldPasswordDenied", "newPasswordAccepted", "historyReuseDenied", "historyRotated", "plaintextAbsent"]),
  "UI-005": profile("2d64633de9cf710524302bac0f6ff1de06937e5d6c77fb86da7a151c52cde34e", ["browserAnonymous", "originalCookieRevoked", "protectedRouteBlocked", "storeUnchanged"]),
  "UI-007": profile("da98e84cf0f0acdff3d28f1fb9556a5688d7b731e3a2f1fd157454b34b2b1a5c", ["beforeLoginDenied", "beforeClientDenied", "inviteConsumed", "viewerWhoami", "viewerScope", "clientAllowed", "opsDenied"]),
  "AUTH-004": profile("1994311ad1baf7a0018e8321c2d6489b75441825b28502d0c1e19138fa96e7e4", ["stableAuthorization", "viewerWhoami", "clientAllowed", "opsDenied"]),
  "AUTH-005": profile("a3546c87b364001c5c22370212b1975fbab2ba77d08ca7de87238890c9d8a0aa", ["missingStoreGate", "hashlessStoreGate", "hashlessLoginDenied", "bootstrapToLogin", "adminWhoami"]),
  "AUTH-006": profile("726e4e6294571ed05474e620d5ce4158ae6c897773bc536f62b4193bfc035820", ["adminAllScope", "usersApiRedacted", "usersUiRedacted", "adminWhoami"]),
  "AUTH-007": profile("f7f92112af1673336141c9ed6528b22e4b16e290f7167816ba1df749995a0358", ["emptyPasswordDenied", "hashlessAdminDenied", "browserAnonymous", "storeUnchanged"]),
  "AUTH-014": profile("57700666ee7e9d6abf223416c8399df6b5a226d025ba9a6b61d1121a7cbe0aa3", ["responseIdentity", "responseRedacted", "storeIdentity", "listIdentity", "listRedacted", "uiRedacted", "plaintextAbsent"]),
  "AUTH-015": profile("73569388823d0de8abe609397ebe0b9f5f6e99467415c5ad6c7b4f852c381485", ["responseTokenBound", "issuedTokenRegistered", "storeHasHashOnly", "listIdentity", "listRedacted", "uiRedacted"]),
  "AUTH-033": profile("574f65cd5a55b1adc442d6e00a6dbfaf50854affc6df2d7e8650936d14b4140d", ["inviteCreatedStatus", "responseTokenBound", "issuedTokenRegistered", "storeHasHashOnly", "listIdentity", "listRedacted", "uiRedacted"]),
  "AUTH-034": profile("6f20c9e17ceec760de6a91135f75cb74dd7a4e388c858a15730949398fcd490c", ["beforeLoginDenied", "beforeClientDenied", "inviteConsumed", "viewerWhoami", "viewerScope", "clientAllowed", "opsDenied"]),
  "AUTH-035": profile("3a88390b3e88ba317b05828c430e92ae5230f2f194137eb4c3ae6be2a273ad81", ["consumedSeeded", "consumedRejected", "expiredSeeded", "expiredRejected", "browserAnonymous", "storeUnchanged"]),
  "AUTH-036": profile("a7dcf49c1b91e2e3c96c6db48efcfb5776d5f8a2d50ad780896e5715bcc86cc3", ["responsePending", "storePending", "listPending", "noUserOrInvite", "pendingLoginDenied", "uiPending"]),
});

export function assertInactiveOrEqualBeforeCleanup({ caseId, observed, expectedRecord } = {}) {
  if (expectedRecord !== null) {
    assert(stableJson(observed) === stableJson(expectedRecord),
      `${caseId} fresh authoritative cleanup readback differs from the original state`);
    return { mode: "equal-before" };
  }
  const sourceInactive = observed?.source === null || observed?.source?.enabled === false;
  const viewInactive = observed?.publishedView === null || observed?.publishedView?.enabled === false;
  assert(sourceInactive && viewInactive,
    `${caseId} suite-created source/view state was not disabled before isolated teardown`);
  return { mode: "inactive", sourceInactive, viewInactive };
}

function profile(expectedBehaviorSha256, requiredChecks) {
  return Object.freeze({ expectedBehaviorSha256, requiredChecks: Object.freeze([...requiredChecks]) });
}

const ruleRelationshipFixtureCaseIds = new Set([
  "RULE-093", "RULE-094", "RULE-095", "RULE-096",
  "RULE-097", "RULE-098", "RULE-100", "RULE-101",
]);

const exactRuntimeFixturePlans = Object.freeze({
  "runtime-session-and-tap": Object.freeze(["viewer-va-overlay-session"]),
  "diagnostic-log-marker": Object.freeze(["diagnostic-log-marker"]),
  "published-view-event": Object.freeze(["event-record"]),
  "va-tap-and-event": Object.freeze(["event-record", "viewer-va-overlay-session"]),
  "dashboard-three-api-samples": Object.freeze(["event-record"]),
});

const eventExactRuntimeBindingCaseIds = new Set([
  "EVT-003", "EVT-004", "EVT-007", "EVT-016", "EVT-017", "EVT-019", "EVT-020",
  "EVT-022", "EVT-023", "EVT-024", "EVT-025", "EVT-026", "EVT-028", "EVT-030",
  "EVT-031", "EVT-036", "EVT-041", "EVT-042", "EVT-043", "EVT-044", "EVT-046",
  "EVT-047", "EVT-049", "EVT-050", "EVT-051", "EVT-052", "EVT-053", "EVT-054",
  "EVT-055", "EVT-056", "EVT-057", "EVT-058", "EVT-064", "EVT-065", "EVT-066",
  "EVT-067", "EVT-069", "EVT-070", "EVT-071", "EVT-072", "EVT-075",
]);

// EVT catalog의 seed.kind는 제품 read model에 필요한 상태 조합을 선언한다. 이 registry는
// fixture 이름을 해석하는 heuristic을 금지하고, 각 kind가 어떤 저장소 join을 요구하는지
// runtime owner에 한 곳으로 고정한다.
export const eventExactSeedMaterializerRegistry = Object.freeze({
  "runtime-session-and-tap": { eventRecords: 0 },
  "source-health-state": { eventRecords: 0, sourceHealthReadback: true },
  "diagnostic-log-marker": { eventRecords: 0 },
  "active-and-archived-event-records": { eventRecords: 2, archivedRecord: true, review: true },
  "event-storage-status": { eventRecords: 1 },
  "alert-delivery-integrations": { eventRecords: 0, alert: true },
  "alert-delivery-form-input": { eventRecords: 0, alert: true, audit: true },
  "event-record-and-review": { eventRecords: 1, review: true },
  "event-review-with-evidence": { eventRecords: 1, review: true, evidence: true },
  "event-and-baseline-review": { eventRecords: 1, review: true, audit: true },
  "review-audit-actions": { eventRecords: 1, review: true, audit: true },
  "published-view-event": { eventRecords: 1, review: true },
  "stable-runtime-baseline": { eventRecords: 0 },
  "source-and-channel": { eventRecords: 1, sourceHealth: true },
  "va-tap-and-event": { eventRecords: 1 },
  "event-evidence-and-vlm-sidecar": { eventRecords: 1, review: true, vlm: true, evidence: true },
  "matching-and-missing-vlm-sidecars": { eventRecords: 2, review: true, vlm: true, related: true },
  "vlm-explanation": { eventRecords: 1, review: true, vlm: true },
  "vlm-rule-suggestion-sidecar": { eventRecords: 1, review: true, vlm: true },
  "alert-delivery-dry-run": { eventRecords: 1, review: true, alert: true, audit: true },
  "searchable-event-review": { eventRecords: 1, review: true },
  "five-stage-incident-timeline": { eventRecords: 1, review: true, alert: true, audit: true, sourceHealth: true },
  "incident-brief-slots": { eventRecords: 1, review: true },
  "base-related-and-unrelated-incidents": { eventRecords: 3, review: true, related: true },
  "vlm-summary-candidate-sidecar": { eventRecords: 1, review: true, vlm: true },
  "matching-rule-suggestion-sidecar": { eventRecords: 1, review: true, vlm: true },
  "dashboard-three-api-samples": { eventRecords: 1, sourceHealth: true },
  "cross-zone-track-timeline": { eventRecords: 1, review: true },
  "triage-lane-priority-fixtures": { eventRecords: 2, review: true, vlm: true, related: true },
  "decision-scorecard-evidence": { eventRecords: 1, review: true, vlm: true, sourceHealth: true },
  "action-pack-evidence": { eventRecords: 1, review: true, vlm: true, alert: true, sourceHealth: true },
  "matching-rule-suggestion": { eventRecords: 1, review: true, vlm: true },
  "review-outcome-history": { eventRecords: 2, review: true, audit: true, related: true },
  "four-readiness-states": { eventRecords: 2, review: true, vlm: true, related: true },
  "staged-rule-draft-candidate": { eventRecords: 1, review: true, vlm: true },
  "field-evidence-readiness-states": { eventRecords: 2, review: true, vlm: true, related: true },
  "incident-runtime-window": { eventRecords: 1, review: true },
  "two-resolution-states": { eventRecords: 2, review: true, related: true },
  "complete-and-incomplete-evidence": { eventRecords: 2, review: true, evidence: true, related: true },
  "healthy-and-failed-source-events": { eventRecords: 2, review: true, sourceHealth: true, related: true },
  "corrected-and-uncertain-review": { eventRecords: 1, review: true },
  "event-and-baseline-resolution": { eventRecords: 1, review: true, audit: true },
  "readiness-context-combinations": { eventRecords: 1, review: true, vlm: true, sourceHealth: true },
  "filtered-resolution-search": { eventRecords: 1, review: true },
  "source-failure-close-handoff": { eventRecords: 1, review: true, sourceHealth: true, audit: true },
  "failed-and-healthy-recheck-candidates": { eventRecords: 2, review: true, sourceHealth: true, related: true },
  "selected-command-handoff": { eventRecords: 1, review: true, sourceHealth: true, audit: true },
});

export function usesEventExactRuntimeBindings(caseId) {
  return eventExactRuntimeBindingCaseIds.has(String(caseId || ""));
}

export function eventExactUsesFixtureIdentityBaseline(operator) {
  const value = String(operator || "");
  return value.startsWith("contains-fixture") || value === "csv-contains-fixture";
}

// Oracle가 선언한 seed/fixture만 실제 runtime fixture로 물질화한다.
export function runtimeFixturePlanFor(spec) {
  if (!spec || typeof spec !== "object") return Object.freeze([]);
  const plan = new Set(exactRuntimeFixturePlans[String(spec.seed?.kind || "")] || []);
  const fixtures = Array.isArray(spec.setup?.fixtures)
    ? spec.setup.fixtures.map(value => String(value))
    : (Array.isArray(spec.fixtures) ? spec.fixtures.map(value => String(value)) : []);
  if (fixtures.includes("saved-layout-preference")) plan.add("viewer-live-layout-preference");
  if (fixtures.includes("va-metadata-sample")) {
    plan.add("event-record");
  }
  return Object.freeze([...plan]);
}

export function createV390UiCaseRuntime({
  rootDir,
  httpBase,
  runtimeDescriptorPath = "",
  roleStateMapPath = "",
  roleSecretsJson = process.env.MEDIA_SERVER_V390_UI_ROLE_SECRETS || "",
} = {}) {
  const descriptor = runtimeDescriptorPath ? readJson(runtimeDescriptorPath) : null;
  if (descriptor) validateDescriptor(descriptor, { rootDir, httpBase, runtimeDescriptorPath, roleStateMapPath });
  const roleStateMap = roleStateMapPath ? readJson(roleStateMapPath) : { schema: roleMapSchema, roles: {} };
  assert(roleStateMap.schema === roleMapSchema, "unexpected role state map schema");
  if (descriptor) {
    assert(path.resolve(roleStateMapPath) === path.resolve(descriptor.roleStateMapPath),
      "CLI role state map does not match the runtime descriptor");
    for (const [role, statePath] of Object.entries(descriptor.auth?.storageStatePaths || {})) {
      assert(path.resolve(roleStateMap.roles?.[role] || "") === path.resolve(statePath),
        `runtime role state map mismatch for ${role}`);
    }
  }
  const roleSecrets = parseSecretEnvelope(roleSecretsJson);
  delete process.env.MEDIA_SERVER_V390_UI_ROLE_SECRETS;
  const runtimeSecrets = new Map();
  const activeCases = new Map();

  async function prepareCase(item) {
    assert(!activeCases.has(item.caseId), `${item.caseId} case runtime already active`);
    const context = {
      caseId: item.caseId,
      fixtureId: reviewedFixtureId(item),
      descriptorRequired: caseNeedsRuntimeOwner(item),
      snapshots: snapshotStateFiles(descriptor?.stateFiles || []),
      beforeRecord: null,
      cleanupExpectedRecord: null,
      beforeRecordEndpoint: "",
      primaryRoleStatePath: "",
      actionRoleStatePaths: {},
      cleanupResults: [],
      secretRefs: new Set(),
      preparedUsersSha256: "",
      preparedUsersStableAuthSha256: "",
      preFormReadback: {},
      transientStateSeeded: false,
      transientApiCleanup: [],
      transientFixtureIds: [],
      relationshipFixture: null,
      exactRuntimeFixture: null,
      endpointActionFixture: null,
      eventSourceHealthFixture: null,
      catalogBindings: {},
      transientSeedReadback: null,
      eventExactSeedPrepared: false,
      prepared: false,
    };
    try {
      if (context.descriptorRequired) {
        assert(descriptor, `${item.caseId} requires a self-contained runtime descriptor`);
        await prepareAuthFixture(item, context);
        await prepareEndpointActionFixture(item, context);
        if (item.caseId.startsWith("EVT-")) {
          await materializeEventExactSeed(item, context, exactRuntimeOracleFor(item.caseId));
        }
        await preparePersistedFixture(item, context);
        if (["RULE-001", "RULE-002", "RULE-003"].includes(item.caseId)) {
          await seedRuleCatalogFixturesViaApi(
            item,
            context,
            descriptor.auth?.defaultViewId || "9001",
          );
          context.transientStateSeeded = true;
        } else if (ruleRelationshipFixtureCaseIds.has(item.caseId)) {
          await seedRuleRelationshipFixturesViaApi(item, context);
          context.transientStateSeeded = true;
        } else if (["UI-036", "UI-046", "UI-053", "RULE-104", "RULE-111", "SAFE-038"].includes(item.caseId)) {
          const observationPath = vlmObservationStoragePath(descriptor.eventStoragePath);
          context.snapshots.push(...snapshotStateFiles([observationPath]));
          if (["UI-046", "UI-053", "RULE-104"].includes(item.caseId)) {
            seedEventRecordFixture(descriptor.eventStoragePath, {
              eventId: context.fixtureId,
              sourceId: descriptor.auth?.defaultViewId || "9001",
            });
          }
          seedVlmRuleSuggestionFixture(observationPath, {
            eventId: context.fixtureId,
            sourceId: descriptor.auth?.defaultViewId || "9001",
          });
          context.transientStateSeeded = true;
        } else if (["UI-052", "UI-064", "UI-065", "UI-066", "UI-067", "UI-068", "UI-069", "UI-070", "UI-071", "UI-080"].includes(item.caseId)) {
          const sourceIdentity = item.caseId === "UI-068"
            ? { ...defaultPublishedSourceIdentity(descriptor), status: "closed" }
            : { sourceId: descriptor.auth?.defaultViewId || "9001" };
          seedEventRecordFixture(descriptor.eventStoragePath, {
            eventId: context.fixtureId,
            ...sourceIdentity,
          });
          context.transientStateSeeded = true;
        }
        await prepareCatalogRuntimeFixture(item, context);
      }
      for (const input of item.workflow.inputs || []) {
        for (const value of Object.values(input.actualValue || {})) {
          if (value && typeof value === "object" && value.secretRef) {
            context.secretRefs.add(value.secretRef);
          }
        }
      }
      context.primaryRoleStatePath = await freshRoleStorageState(item.accountRole, item.caseId);
      if (item.caseId === "RULE-103") {
        await seedRule103ReplayFixtures(item, context);
        context.transientStateSeeded = true;
      }
      if (["UI-036", "RULE-111", "SAFE-038"].includes(item.caseId)) {
        const response = await requestEndpoint(
          "GET",
          "/ops/api/vlm/rule-suggestion-drafts?limit=10",
          null,
          item,
          context,
          [200],
        );
        const candidates = response.json?.sourceCandidateReport?.candidates;
        const candidate = Array.isArray(candidates)
          ? candidates.find(value => value?.eventId === context.fixtureId)
          : null;
        assert(candidate?.ruleSuggestion?.manualReviewRequired === true &&
          candidate?.ruleSuggestion?.autoApply === false,
        `${item.caseId} transient VLM rule draft seed is missing from the authoritative API readback`);
        context.transientSeedReadback = {
          status: response.status,
          matchedFixture: true,
          candidateCount: candidates.length,
        };
        if (item.caseId === "RULE-111") {
          const bridge = await requestEndpoint("GET", "/ops/api/vlm/rule-suggestion-draft-bridge", null, item, context, [200]);
          const catalog = await requestEndpoint("GET", "/ops/api/rules/catalog", null, item, context, [200]);
          context.exactRuntimeFixture = {
            eventId: context.fixtureId,
            candidate,
            bridge: bridge.json,
            catalogBeforeUiAction: stableJson(catalog.json),
            eventStorageSha256: sha256FileOrMissing(descriptor.eventStoragePath),
          };
        }
      } else if (["UI-046", "RULE-104"].includes(item.caseId)) {
        const response = await requestEndpoint(
          "GET",
          `/ops/api/events/reviews?eventId=${encodeURIComponent(context.fixtureId)}&limit=25`,
          null,
          item,
          context,
          [200],
        );
        const records = response.json?.records;
        const row = Array.isArray(records)
          ? records.find(value => value?.event?.eventId === context.fixtureId)
          : null;
        const review = row?.incidentRuleSuggestionReview;
        assert(review?.matchingRuleSuggestionPresent === true &&
          review?.manualDraftRoute === "/ops/rules" &&
          review?.contract?.ruleRegistryWritePerformed === false,
        `${item.caseId} transient incident rule suggestion is missing from the authoritative API readback`);
        context.transientSeedReadback = {
          status: response.status,
          matchedFixture: true,
          recordCount: records.length,
        };
        if (item.caseId === "RULE-104") {
          const readiness = response.json?.approvalGatedRuleDraftReadiness;
          const readinessItem = Array.isArray(readiness?.items)
            ? readiness.items.find(value => value?.eventId === context.fixtureId)
            : null;
          assert(readinessItem?.approvalState === "approval-required" &&
            readinessItem?.stagedDraft?.noAutoSave === true &&
            readinessItem?.stagedDraft?.ruleRegistryWritePerformed === false,
          `${item.caseId} approval-gated rule draft readiness seed is missing`);
          context.transientSeedReadback.approvalGatedRuleDraftReadiness = readinessItem;
          const catalog = await requestEndpoint("GET", "/ops/api/rules/catalog", null, item, context, [200]);
          context.exactRuntimeFixture = {
            eventId: context.fixtureId,
            readinessItem,
            catalogBeforeUiAction: stableJson(catalog.json),
            eventStorageSha256: sha256FileOrMissing(descriptor.eventStoragePath),
          };
        }
      } else if (item.caseId === "UI-052") {
        const response = await requestEndpoint(
          "GET",
          `/ops/api/events/reviews?eventId=${encodeURIComponent(context.fixtureId)}&limit=25`,
          null,
          item,
          context,
          [200],
        );
        const actionPack = response.json?.operationalActionPack;
        const actionItem = Array.isArray(actionPack?.items)
          ? actionPack.items.find(value => value?.eventId === context.fixtureId)
          : null;
        assert(actionItem?.actions?.ruleDraftRoute?.mode === "manual-draft-only" &&
          actionItem?.actions?.ruleDraftRoute?.ruleRegistryWritePerformed === false &&
          actionItem?.actions?.alertDryRunRoute?.externalDeliveryPerformed === false &&
          actionItem?.actions?.sourceHealthRecheck?.dryRunOnly === true &&
          actionItem?.actions?.sourceHealthRecheck?.sourceHealthWritePerformed === false &&
          actionPack?.contract?.opsOnly === true &&
          actionPack?.contract?.externalDeliveryPerformed === false &&
          actionPack?.contract?.ruleRegistryWritePerformed === false &&
          actionPack?.contract?.sourceHealthWritePerformed === false,
        `${item.caseId} transient operational action pack is missing from the authoritative API readback`);
        context.transientSeedReadback = {
          status: response.status,
          matchedFixture: true,
          itemCount: actionPack.items.length,
        };
      } else if (item.caseId === "UI-053") {
        const response = await requestEndpoint(
          "GET",
          `/ops/api/events/reviews?eventId=${encodeURIComponent(context.fixtureId)}&limit=25`,
          null,
          item,
          context,
          [200],
        );
        const preview = response.json?.ruleWhatIfPreview;
        const previewItem = Array.isArray(preview?.items)
          ? preview.items.find(value => value?.eventId === context.fixtureId)
          : null;
        assert(preview?.schema === "media-server.ops.rule-what-if-preview.v1" &&
          preview?.status === "ops-rule-what-if-preview" &&
          preview?.workflow === "selected-incident-draft-only" &&
          previewItem?.preview?.matchingRuleSuggestionPresent === true &&
          previewItem?.preview?.candidateStatus === "candidate-only-manual-rule-save" &&
          previewItem?.preview?.draftComparison?.comparisonResult === "candidate-ready" &&
          previewItem?.preview?.draftComparison?.fullReplayEngineExecuted === false &&
          previewItem?.preview?.conditionPreview?.eventType === "line-crossing" &&
          previewItem?.preview?.conditionPreview?.classes?.includes("person") &&
          previewItem?.preview?.conditionPreview?.minConfidence === 0.8 &&
          previewItem?.preview?.conditionPreview?.minDurationMs === 1000 &&
          previewItem?.preview?.manualDraftRoute ===
            `/ops/rules?draftEventId=${encodeURIComponent(context.fixtureId)}&whatIfPreview=1` &&
          previewItem?.preview?.draftOnly === true &&
          previewItem?.preview?.manualSaveRequired === true &&
          previewItem?.preview?.ruleRegistryWritePerformed === false &&
          previewItem?.preview?.autoRuleApplied === false &&
          preview?.contract?.opsOnly === true &&
          preview?.contract?.fullReplayEngineExecuted === false &&
          preview?.contract?.ruleRegistryWritePerformed === false &&
          preview?.contract?.autoRuleApplied === false &&
          preview?.contract?.autoProfileApplied === false &&
          preview?.contract?.eventRecordSchemaChanged === false &&
          preview?.contract?.rtspOrWebrtcMediaPathChanged === false &&
          preview?.contract?.runtimeVlmCallPerformed === false &&
          preview?.contract?.cloudProviderApiCalled === false,
        `${item.caseId} transient rule what-if preview is missing from the authoritative API readback`);
        context.transientSeedReadback = {
          status: response.status,
          matchedFixture: true,
          itemCount: preview.items.length,
        };
      } else if (["UI-064", "UI-065", "UI-066", "UI-067", "UI-069", "UI-070", "UI-071", "UI-080"].includes(item.caseId)) {
        const response = await requestEndpoint(
          "GET",
          `/ops/api/events/reviews?eventId=${encodeURIComponent(context.fixtureId)}&limit=25`,
          null,
          item,
          context,
          [200],
        );
        const workspace = response.json?.unifiedResolutionWorkspace;
        const detail = Array.isArray(workspace?.resolutionQueue)
          ? workspace.resolutionQueue.find(value => value?.eventId === context.fixtureId)
          : null;
        const validation = validateUnifiedWorkspaceCaseReadback(item.caseId, {
          workspace,
          detail,
          sourceId: descriptor.auth?.defaultViewId || "9001",
        });
        context.transientSeedReadback = {
          status: response.status,
          matchedFixture: true,
          itemCount: validation.itemCount,
        };
      } else if (["UI-068", "UI-072"].includes(item.caseId)) {
        const viewId = descriptor.auth?.defaultViewId || "9001";
        const response = await requestEndpoint(
          "GET",
          `/client/api/views/${encodeURIComponent(viewId)}/events?limit=6`,
          null,
          item,
          context,
          [200],
        );
        const events = response.json?.events;
        if (item.caseId === "UI-068") {
          const digest = events?.resolutionDigest;
          const fixture = Array.isArray(events?.recent)
            ? events.recent.find(value => value?.eventId === context.fixtureId)
            : null;
          assert(response.json?.ok === true && String(response.json?.view?.viewId || "") === String(viewId),
            `${item.caseId} viewer event route is not bound to the requested PublishedView`);
          assert(fixture,
            `${item.caseId} transient EventRecord is missing from the viewer-scoped recent event readback`);
          assert(digest?.schema === "media-server.client.resolution-digest.v1" &&
            digest?.viewerSafe === true && digest?.publishedViewScoped === true &&
            digest?.itemCount >= 1 && Array.isArray(digest?.digestItems) && digest.digestItems.length >= 1,
          `${item.caseId} viewer-safe resolution digest schema or item projection is missing`);
          assert(digest.digestItems.some(value => value?.resolutionStatus === "closed" &&
              value?.resolutionLabel === "closed" && value?.timelineHint === "closed event"),
            `${item.caseId} transient closed EventRecord is not bound to the viewer-safe resolution digest`);
          assert(
            digest?.sourceUrlIncluded === false && digest?.rawEvidenceIncluded === false &&
            digest?.debugMaterialIncluded === false && digest?.providerMaterialIncluded === false &&
            digest?.featureProvenanceIncluded === false && digest?.internalEvidenceIncluded === false &&
            digest?.operatorNotesIncluded === false && digest?.ruleEditorIncluded === false &&
            digest?.actionControlsIncluded === false && digest?.eventPostPayloadChanged === false &&
            digest?.eventSchemaChanged === false && digest?.mediaPathChanged === false &&
            digest?.resolutionStateWritePerformed === false,
          `${item.caseId} viewer-safe resolution digest boundary is not closed`);
        } else {
          const digest = events?.sourceStatusDigest;
          assert(response.json?.ok === true && response.json?.view?.viewId === viewId &&
            digest?.schema === "media-server.client.source-status-digest.v1" &&
            digest?.viewerSafe === true && digest?.publishedViewScoped === true &&
            digest?.itemCount === 1 && Array.isArray(digest?.digestItems) && digest.digestItems.length === 1 &&
            typeof digest.digestItems[0]?.sourceStatus === "string" && digest.digestItems[0].sourceStatus &&
            typeof digest.digestItems[0]?.connectionStatus === "string" && digest.digestItems[0].connectionStatus &&
            digest?.sourceUrlIncluded === false && digest?.rawLocatorIncluded === false &&
            digest?.rawJsonIncluded === false && digest?.debugMaterialIncluded === false &&
            digest?.credentialMaterialIncluded === false && digest?.operatorMaterialIncluded === false &&
            digest?.ruleEditorIncluded === false && digest?.actionControlsIncluded === false &&
            digest?.sourceRegistryWritePerformed === false && digest?.publishedViewWritePerformed === false &&
            digest?.eventRecordWritePerformed === false && digest?.eventPostPayloadChanged === false &&
            digest?.eventSchemaChanged === false && digest?.webrtcDataChannelSchemaChanged === false &&
            digest?.sseMetadataSchemaChanged === false && digest?.wsMetadataSchemaChanged === false &&
            digest?.rtspOrWebrtcMediaPathChanged === false && digest?.ruleProfilePayloadChanged === false &&
            digest?.searchMetricsChanged === false,
          `${item.caseId} viewer-safe source status digest is missing from the authoritative API readback`);
        }
        context.transientSeedReadback = {
          status: response.status,
          matchedFixture: item.caseId === "UI-068",
          itemCount: item.caseId === "UI-068" ? events.resolutionDigest.itemCount : events.sourceStatusDigest.itemCount,
        };
      } else if (["UI-073", "UI-074", "UI-075"].includes(item.caseId)) {
        const validation = await validateOpsSourcesReadback(item.caseId, requestEndpoint, item, context);
        context.transientSeedReadback = validation;
      } else if (["UI-088", "UI-089", "UI-090", "UI-091"].includes(item.caseId)) {
        context.transientSeedReadback = await validateV360SimulationReadback(
          item.caseId,
          requestEndpoint,
          item,
          context,
        );
      } else if (["UI-092", "UI-093", "UI-094", "UI-095", "UI-096", "UI-097", "UI-098", "UI-099", "UI-100", "UI-101", "UI-102", "UI-103", "UI-104", "UI-105"].includes(item.caseId)) {
        context.transientSeedReadback = await validateV390Ui092To105Readback(
          item.caseId,
          requestEndpoint,
          item,
          context,
          descriptor,
        );
      }
      for (const setup of item.workflow.setup || []) {
        if (setup.kind !== "bind-action-role-session") continue;
        context.actionRoleStatePaths[setup.accountRole] = await freshRoleStorageState(
          setup.accountRole,
          `${item.caseId}-action`,
        );
      }
      context.preparedUsersSha256 = sha256FileOrMissing(descriptor?.auth?.usersFile || "");
      context.preparedUsersStableAuthSha256 = stableUsersAuthSha256(descriptor?.auth?.usersFile || "");
      context.prepared = true;
      activeCases.set(item.caseId, context);
      return context;
    } catch (error) {
      if (context.eventSourceHealthFixture) {
        await disableEvt003SourceHealthFixtureForTeardown(item, context);
      }
      if (context.transientApiCleanup.length > 0) {
        await cleanupTransientApiSeeds(item, context);
      }
      restoreStateFiles(context.snapshots);
      const failure = error instanceof Error ? error : new Error(String(error));
      failure.runtimeCleanup = {
        status: stateFilesEqual(context.snapshots) ? "PASS" : "FAIL",
        source: "prepare-failure-file-snapshot-restore",
      };
      throw failure;
    }
  }

  async function seedRuleCatalogFixturesViaApi(item, context, sourceId) {
    const fixtures = [
      {
        endpoint: "/lab/analysis/profiles/3920003",
        payload: {
          id: "3920003", profileId: "3920003", name: "REVIEW4 catalog profile",
          detector: "yolo", fps: 6, confidence: 0.25, nms: 0.45,
          inputWidth: 640, inputHeight: 640, trackingClasses: ["person"], enabled: true,
        },
      },
      {
        endpoint: "/lab/analysis/rules/3920002",
        payload: {
          id: "3920002", ruleId: "3920002", name: "REVIEW4 catalog event template",
          ruleKind: "basic", analysis: { classes: ["person"] },
          event: { type: "presence", region: { type: "polygon", points: [[0, 0], [1, 0], [1, 1], [0, 1]] } },
          enabled: true,
        },
      },
      {
        endpoint: "/lab/analysis/va-rules/3920001",
        payload: {
          id: "3920001", ruleId: "3920001", name: "REVIEW4 catalog channel analysis",
          source: { kind: "file", file: `review4-rule-catalog-${String(sourceId)}.mp4` },
          analysis: {
            profileId: "3920003", classes: ["person"],
            trackingPolicy: { tracker: "lite", reid: "off" },
          },
          templateStart: { ruleId: "3920002" },
          event: { type: "presence", region: { type: "polygon", points: [[0, 0], [1, 0], [1, 1], [0, 1]] } },
          priority: 1, enabled: true,
        },
      },
    ];
    for (const fixture of fixtures) {
      const write = await requestEndpoint("PUT", fixture.endpoint, fixture.payload, item, context, [200, 201], {
        roleOverride: "operator",
      });
      assert(write.json?.ok === true,
        `${item.caseId} transient rule catalog write did not return ok=true: ${fixture.endpoint}`);
      context.transientApiCleanup.push(fixture.endpoint);
      const detail = await requestEndpoint("GET", fixture.endpoint, null, item, context, [200], {
        roleOverride: "operator",
      });
      assert(detail.json?.profile || detail.json?.rule || detail.json?.vaRule,
        `${item.caseId} transient rule catalog detail readback is missing: ${fixture.endpoint}`);
    }
    const catalog = await requestEndpoint("GET", "/ops/api/rules/catalog", null, item, context, [200], {
      roleOverride: "operator",
    });
    const counts = {
      profiles: Array.isArray(catalog.json?.profiles) ? catalog.json.profiles.length : -1,
      rules: Array.isArray(catalog.json?.rules) ? catalog.json.rules.length : -1,
      vaRules: Array.isArray(catalog.json?.vaRules) ? catalog.json.vaRules.length : -1,
    };
    assert(counts.profiles > 0 && counts.rules > 0 && counts.vaRules > 0,
      `${item.caseId} transient rule catalog API seed is not visible: ${JSON.stringify(counts)}`);
  }

  async function seedRuleRelationshipFixturesViaApi(item, context) {
    const digit = item.caseId.slice(-1);
    const relationshipIdentity = ruleRelationshipFixtureIdentity(item.caseId);
    const profileId = `969${digit}`;
    const templateId = `979${digit}`;
    const vaRuleId = `989${digit}`;
    // SourceRegistry는 10진수 source identity를 요구하므로 충돌을 피하는 숫자 ID를 사용하고,
    // 사람이 읽을 수 있는 case 결속은 displayName과 file에 유지한다.
    const { sourceId, viewId } = relationshipIdentity;
    const profile = (id, enabled = true) => ({
      id, enabled, detector: "yolo", fps: 6, maxQueue: 1, confidence: 0.25, nms: 0.45,
      trackingClasses: ["person"], analysis: { classes: ["person"] },
    });
    const template = (id, enabled = true, classes = ["person"]) => ({
      id, enabled, ruleKind: "scenario", analysis: { classes },
      event: { type: "loitering", region: { type: "polygon", points: [{ x: 0.2, y: 0.2 }, { x: 0.8, y: 0.2 }, { x: 0.8, y: 0.8 }, { x: 0.2, y: 0.8 }] }, minConfidence: 0.35, minDurationMs: 0 },
      scenario: { type: "loitering", enabled: true, dwellTimeMs: 10000, cooldownMs: 20000, targetClasses: classes },
    });
    const source = {
      sourceId, displayName: `REVIEW4 ${item.caseId} source`, kind: "file", file: `${sourceId}.mp4`,
      enabled: item.caseId !== "RULE-096", tags: ["review4", "throwaway"], ownerGroup: "review4",
      site: "contract", group: "review4", floor: "", zone: "",
    };
    const ruleSource = item.caseId === "RULE-095"
      ? { kind: "file", file: "rule-095-unregistered-source.mp4" }
      : { kind: "file", file: source.file };
    const vaRuleFor = (id, priority, sourcePayload = ruleSource) => ({
      id, name: `REVIEW4 ${item.caseId} relationship ${id}`, enabled: true, priority,
      source: sourcePayload, analysis: { profileId, classes: ["person"] },
      event: template(templateId).event, scenario: template(templateId).scenario,
      templateStart: { ruleId: templateId },
    });
    const vaRule = vaRuleFor(vaRuleId, item.caseId === "RULE-100" ? 0 : Number(vaRuleId));
    const view = {
      viewId, sourceId, displayName: `REVIEW4 ${item.caseId} view`, enabled: item.caseId !== "RULE-096",
      showDashboard: true, showEvents: true, showMetadataSummary: true,
      allowedOverlayModes: ["raw", "va-overlay", "va-rule"],
      defaultRuleId: ["RULE-095", "RULE-096", "RULE-097", "RULE-100"].includes(item.caseId) ? vaRuleId : "",
      allowedRuleIds: ["RULE-095", "RULE-096", "RULE-097", "RULE-100"].includes(item.caseId) ? [vaRuleId] : [],
      clientGroups: [], maxTiles: 1,
    };
    const fixtures = [
      {
        createMethod: "PUT",
        createEndpoint: `/lab/analysis/profiles/${profileId}`,
        readbackEndpoint: `/lab/analysis/profiles/${profileId}`,
        cleanupEndpoint: `/lab/analysis/profiles/${profileId}`,
        payload: profile(profileId, item.caseId !== "RULE-094"),
      },
      {
        createMethod: "PUT",
        createEndpoint: `/lab/analysis/rules/${templateId}`,
        readbackEndpoint: `/lab/analysis/rules/${templateId}`,
        cleanupEndpoint: `/lab/analysis/rules/${templateId}`,
        payload: template(
        templateId,
        item.caseId !== "RULE-094",
        item.caseId === "RULE-101" ? ["vehicle"] : ["person"],
        ),
      },
    ];
    if (["RULE-093", "RULE-094", "RULE-101"].includes(item.caseId)) {
      await requestEndpoint("GET", `/lab/analysis/va-rules/${vaRuleId}`, null, item, context, [404], {
        roleOverride: "operator",
      });
    }
    if (item.caseId === "RULE-100") {
      await requestEndpoint("GET", `/lab/analysis/va-rules/${context.fixtureId}`, null, item, context, [404], {
        roleOverride: "operator",
      });
    }
    if (item.caseId === "RULE-094") {
      fixtures.push(
        {
          createMethod: "PUT", createEndpoint: "/lab/analysis/profiles/9684",
          readbackEndpoint: "/lab/analysis/profiles/9684", cleanupEndpoint: "/lab/analysis/profiles/9684",
          payload: profile("9684", true),
        },
        {
          createMethod: "PUT", createEndpoint: "/lab/analysis/rules/9784",
          readbackEndpoint: "/lab/analysis/rules/9784", cleanupEndpoint: "/lab/analysis/rules/9784",
          payload: template("9784", true),
        },
      );
    }
    if (item.caseId === "RULE-101") {
      fixtures.push({
        createMethod: "PUT", createEndpoint: "/lab/analysis/profiles/9681",
        readbackEndpoint: "/lab/analysis/profiles/9681", cleanupEndpoint: "/lab/analysis/profiles/9681",
        payload: {
          ...profile("9681", true),
          trackingClasses: ["vehicle"],
          analysis: { classes: ["vehicle"] },
        },
      });
    }
    const sourceFixture = (value) => ({
      createMethod: "POST",
      createEndpoint: "/ops/api/sources",
      cleanupEndpoint: `/ops/api/sources/${encodeURIComponent(value.sourceId)}`,
      collectionEndpoint: "/ops/api/sources",
      collectionRecordsKey: "sources",
      recordIdField: "sourceId",
      expectedCreateStatuses: [201],
      responseField: "source",
      recordId: value.sourceId,
      payload: value,
    });
    const viewFixture = (value) => ({
      createMethod: "POST",
      createEndpoint: "/ops/api/views",
      cleanupEndpoint: `/ops/api/views/${encodeURIComponent(value.viewId)}`,
      collectionEndpoint: "/ops/api/views",
      collectionRecordsKey: "views",
      recordIdField: "viewId",
      expectedCreateStatuses: [201],
      responseField: "view",
      recordId: value.viewId,
      payload: value,
    });
    fixtures.push(sourceFixture(source));
    if (["RULE-095", "RULE-096", "RULE-097", "RULE-098", "RULE-100"].includes(item.caseId)) {
      fixtures.push({
        createMethod: "PUT", createEndpoint: `/lab/analysis/va-rules/${vaRuleId}`,
        readbackEndpoint: `/lab/analysis/va-rules/${vaRuleId}`,
        cleanupEndpoint: `/lab/analysis/va-rules/${vaRuleId}`,
        payload: vaRule,
      });
    }
    let blockedSource = null;
    let blockedView = null;
    let disallowedVaRule = null;
    if (item.caseId === "RULE-097") {
      const disallowedRuleId = "98970";
      disallowedVaRule = vaRuleFor(disallowedRuleId, Number(disallowedRuleId), { kind: "file", file: source.file });
      blockedSource = {
        ...source,
        sourceId: relationshipIdentity.blockedSourceId,
        displayName: "REVIEW4 RULE-097 blocked source",
        file: "rule-097-blocked-source.mp4",
      };
      blockedView = {
        ...view,
        viewId: relationshipIdentity.blockedViewId,
        sourceId: blockedSource.sourceId,
        displayName: "REVIEW4 RULE-097 blocked view",
        defaultRuleId: "",
        allowedRuleIds: [],
      };
      fixtures.push(
        {
          createMethod: "PUT", createEndpoint: `/lab/analysis/va-rules/${disallowedRuleId}`,
          readbackEndpoint: `/lab/analysis/va-rules/${disallowedRuleId}`,
          cleanupEndpoint: `/lab/analysis/va-rules/${disallowedRuleId}`,
          payload: disallowedVaRule,
        },
        sourceFixture(blockedSource),
      );
    }
    fixtures.push(viewFixture(view));
    if (blockedView) fixtures.push(viewFixture(blockedView));
    for (const fixture of fixtures) {
      if (fixture.collectionEndpoint) {
        const before = await requestEndpoint("GET", fixture.collectionEndpoint, null, item, context, [200], {
          roleOverride: "operator",
        });
        const records = Array.isArray(before.json?.[fixture.collectionRecordsKey])
          ? before.json[fixture.collectionRecordsKey]
          : [];
        assert(!records.some(record => String(record?.[fixture.recordIdField] || "") === fixture.recordId),
          `${item.caseId} relationship fixture already exists: ${fixture.collectionEndpoint}/${fixture.recordId}`);
      } else {
        await requestEndpoint("GET", fixture.readbackEndpoint, null, item, context, [404], {
          roleOverride: "operator",
        });
      }
      const write = await requestEndpoint(
        fixture.createMethod,
        fixture.createEndpoint,
        fixture.payload,
        item,
        context,
        fixture.expectedCreateStatuses || [200, 201],
        { roleOverride: "operator" },
      );
      // 생성 성공 뒤 응답·readback 검증이 실패해도 API cleanup 대상은 즉시 등록한다.
      context.transientApiCleanup.push(fixture.collectionEndpoint
        ? {
          endpoint: fixture.cleanupEndpoint,
          collectionEndpoint: fixture.collectionEndpoint,
          collectionRecordsKey: fixture.collectionRecordsKey,
          recordIdField: fixture.recordIdField,
          recordId: fixture.recordId,
        }
        : fixture.cleanupEndpoint);
      assert(write.json?.ok === true,
        `${item.caseId} relationship fixture create did not return ok=true: ${fixture.createMethod} ${fixture.createEndpoint}`);
      if (fixture.responseField) {
        assert(String(write.json?.[fixture.responseField]?.[fixture.recordIdField] || "") === fixture.recordId,
          `${item.caseId} relationship fixture create response identity mismatch: ${fixture.createEndpoint}`);
      }
      const readback = await requestEndpoint("GET", fixture.collectionEndpoint || fixture.readbackEndpoint, null, item, context, [200], {
        roleOverride: "operator",
      });
      if (fixture.collectionEndpoint) {
        const records = Array.isArray(readback.json?.[fixture.collectionRecordsKey])
          ? readback.json[fixture.collectionRecordsKey]
          : [];
        const record = records.find(value => String(value?.[fixture.recordIdField] || "") === fixture.recordId);
        assert(record?.enabled === fixture.payload.enabled,
          `${item.caseId} relationship fixture collection readback mismatch: ${fixture.collectionEndpoint}/${fixture.recordId}`);
      }
    }
    context.transientFixtureIds.push(profileId, templateId,
      ...(["RULE-095", "RULE-096", "RULE-097", "RULE-098", "RULE-100"].includes(item.caseId) ? [vaRuleId] : []),
      ...(["RULE-093", "RULE-094", "RULE-101"].includes(item.caseId) ? [vaRuleId] : []),
      ...(item.caseId === "RULE-100" ? [context.fixtureId] : []),
      ...(disallowedVaRule ? [disallowedVaRule.id] : []),
      ...(item.caseId === "RULE-101" ? ["9681"] : []),
      ...(item.caseId === "RULE-094" ? ["9684", "9784"] : []));
    context.relationshipFixture = {
      profileId, templateId, vaRuleId, sourceId, viewId, source, view, vaRule,
      blockedSource, blockedView, disallowedVaRule,
      conflictVaRuleId: item.caseId === "RULE-100" ? context.fixtureId : "",
    };
    if (["RULE-097", "RULE-098"].includes(item.caseId)) {
      scopeRuntimeViewerToView(viewId);
    }
  }

  function scopeRuntimeViewerToView(viewId) {
    const usersFile = descriptor.auth?.usersFile;
    const username = descriptor.auth?.usernames?.viewer;
    assert(usersFile && username && viewId, "viewer scope fixture binding is incomplete");
    const store = JSON.parse(fs.readFileSync(usersFile, "utf8"));
    const viewer = (store.users || []).find(user => user.username === username);
    assert(viewer?.role === "viewer", "runtime viewer fixture account is unavailable");
    viewer.viewId = viewId;
    viewer.scopes = fixtureViewerScopes(viewId);
    writePrivateJson(usersFile, store);
  }

  async function seedRule103ReplayFixtures(item, context) {
    const polygon = points => ({ type: "polygon", points });
    const destination = {
      id: "9915", enabled: true, ruleKind: "basic", analysis: { classes: ["person"] },
      event: { type: "presence", region: polygon([{ x: 0.7, y: 0.1 }, { x: 0.9, y: 0.1 }, { x: 0.9, y: 0.5 }, { x: 0.7, y: 0.5 }]), minConfidence: 0.99, minDurationMs: 0 },
    };
    const configured = {
      id: "9913", enabled: true, ruleKind: "scenario", analysis: { classes: ["person"] },
      event: { type: "re-entry", region: polygon([{ x: 0.1, y: 0.1 }, { x: 0.4, y: 0.1 }, { x: 0.4, y: 0.5 }, { x: 0.1, y: 0.5 }]), minConfidence: 0.1, minDurationMs: 0 },
      scenario: { type: "re-entry", enabled: true, reEntryWindowMs: 3000, reEntryMode: "configured-zones", reEntryZoneIds: ["9915"], cooldownMs: 1000, targetClasses: ["person"] },
    };
    const defaultRule = {
      id: "9914", enabled: true, ruleKind: "scenario", analysis: { classes: ["person"] },
      event: { type: "re-entry", region: polygon([{ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.1 }, { x: 0.5, y: 0.5 }, { x: 0.1, y: 0.5 }]), minConfidence: 0.1, minDurationMs: 0 },
      scenario: { type: "re-entry", enabled: true, reEntryWindowMs: 3000, cooldownMs: 1000, targetClasses: ["person"] },
    };
    for (const payload of [destination, configured, defaultRule]) {
      const endpoint = `/lab/analysis/rules/${payload.id}`;
      await requestEndpoint("GET", endpoint, null, item, context, [404], { roleOverride: "operator" });
      await requestEndpoint("PUT", endpoint, payload, item, context, [200, 201], { roleOverride: "operator" });
      const detail = await requestEndpoint("GET", endpoint, null, item, context, [200], { roleOverride: "operator" });
      assert(String(detail.json?.rule?.id || "") === payload.id &&
        String(detail.json?.rule?.event?.type || "") === payload.event.type,
      `${item.caseId} exact saved rule GET drift: ${payload.id}`);
      context.transientApiCleanup.push(endpoint);
      context.transientFixtureIds.push(payload.id);
    }
    const catalog = await requestEndpoint("GET", "/ops/api/rules/catalog", null, item, context, [200], { roleOverride: "operator" });
    context.exactRuntimeFixture = { configured, defaultRule, destination, seededCatalog: stableJson(catalog.json) };
  }

  async function cleanupTransientApiSeeds(item, context) {
    const cleanupEntries = [...context.transientApiCleanup].map(entry => typeof entry === "string" ? { endpoint: entry } : entry);
    for (const { endpoint, roleOverride = "operator" } of [...cleanupEntries].reverse()) {
      await requestEndpoint("DELETE", endpoint, null, item, context, [200, 404], {
        freshRole: true,
        roleOverride,
      });
    }
    context.transientApiCleanup = [];
    for (const entry of cleanupEntries) {
      const { endpoint } = entry;
      const sourceKind = endpoint.startsWith("/ops/api/sources/") ? "source" :
        (endpoint.startsWith("/ops/api/views/") ? "view" : "");
      const sourceViewSoftDelete = Boolean(sourceKind);
      const collectionEndpoint = entry.collectionEndpoint || (sourceKind === "source"
        ? "/ops/api/sources"
        : (sourceKind === "view" ? "/ops/api/views" : ""));
      const collectionRecordsKey = entry.collectionRecordsKey || (sourceKind === "source" ? "sources" : "views");
      const recordIdField = entry.recordIdField || (sourceKind === "source" ? "sourceId" : "viewId");
      const recordId = entry.recordId || decodeURIComponent(endpoint.slice(endpoint.lastIndexOf("/") + 1));
      const readback = await requestEndpoint("GET", collectionEndpoint || endpoint, null, item, context,
        sourceViewSoftDelete ? [200] : [404], {
        freshRole: true,
        roleOverride: "operator",
      });
      if (sourceViewSoftDelete) {
        const records = Array.isArray(readback.json?.[collectionRecordsKey])
          ? readback.json[collectionRecordsKey]
          : [];
        const record = records.find(value => String(value?.[recordIdField] || "") === recordId);
        assert(record?.enabled === false,
          `${item.caseId} transient source/view fixture was not soft-disabled in collection readback before snapshot restoration`);
      }
    }
    const catalog = await requestEndpoint(
      "GET", "/ops/api/rules/catalog", null, item, context, [200],
      { freshRole: true, roleOverride: "operator" },
    );
    const fixtureIds = new Set(["3920001", "3920002", "3920003", ...context.transientFixtureIds].map(String));
    const leaked = [
      ...(catalog.json?.profiles || []),
      ...(catalog.json?.rules || []),
      ...(catalog.json?.vaRules || []),
    ].some(value => fixtureIds.has(String(value?.id || value?.ruleId || value?.profileId || "")));
    assert(!leaked, `${item.caseId} transient rule catalog fixture remained after API cleanup`);
  }

  async function freshRoleStorageState(role, label = "case") {
    if (role === "anonymous") return "";
    if (!descriptor) {
      const existing = roleStateMap.roles?.[role];
      assert(existing, `role state missing for ${role}`);
      return resolvePath(rootDir, existing);
    }
    const username = descriptor.auth?.usernames?.[role];
    const password = roleSecrets.roles?.[role];
    assert(username && password, `fresh role credential missing for ${role}`);
    const usersFile = descriptor.auth?.usersFile || "";
    assert(usersFile && fs.existsSync(usersFile), `fresh ${role} users store is missing`);
    const login = await runAuthoritativeReadbackWithSnapshotRestore({
      snapshots: snapshotStateFiles([usersFile]),
      label: `fresh ${role} session login`,
      readback: async () => {
        const response = await postForm(`${httpBase}/login`, { username, password });
        assert(response.status === 302, `fresh ${role} login failed with HTTP ${response.status}`);
        const cookie = cookieFromResponse(response);
        const whoami = await requestJson(`${httpBase}/auth/whoami`, { cookie });
        return { cookie, whoami };
      },
    });
    const { cookie, whoami } = login;
    assert(whoami.status === 200 && whoami.json?.authenticated === true &&
      whoami.json?.username === username && whoami.json?.role === role,
    `fresh role whoami mismatch for ${role}: ${whoami.status}/${whoami.json?.role || ""}`);
    if (role === "viewer") {
      const usersStore = JSON.parse(fs.readFileSync(descriptor.auth.usersFile, "utf8"));
      const expectedViewer = (usersStore.users || []).find(user => user.username === username);
      assert(expectedViewer?.role === "viewer", "fresh viewer account is unavailable in the authoritative store");
      const expectedScopes = [...new Set((expectedViewer.scopes || []).map(String))].sort();
      const observedScopes = [...new Set((whoami.json?.scopes || []).map(String))].sort();
      assert(stableJson(observedScopes) === stableJson(expectedScopes),
        `fresh viewer principal scopes differ from the authoritative store`);
      const scopedViewIds = expectedScopes
        .filter(scope => scope.startsWith("view:read:"))
        .map(scope => scope.slice("view:read:".length))
        .filter(Boolean);
      assert(scopedViewIds.length === 1,
        `fresh viewer requires exactly one authoritative view scope: ${scopedViewIds.length}`);
      const storedViewId = String(expectedViewer.viewId || "");
      const expectedViewId = storedViewId || scopedViewIds[0];
      assert(!storedViewId || storedViewId === scopedViewIds[0],
        "fresh viewer stored viewId differs from the authoritative view scope");
      const views = await requestJson(`${httpBase}/client/api/views`, { cookie });
      const visibleViews = Array.isArray(views.json?.views) ? views.json.views : [];
      assert(views.status === 200 && visibleViews.length === 1 &&
        String(visibleViews[0]?.viewId || "") === expectedViewId,
      `fresh viewer assigned view list mismatch for ${expectedViewId}`);
      const detail = await requestJson(
        `${httpBase}/client/api/views/${encodeURIComponent(expectedViewId)}`,
        { cookie },
      );
      assert(detail.status === 200 &&
        String(detail.json?.view?.viewId || "") === expectedViewId,
      `fresh viewer assigned view detail mismatch for ${expectedViewId}`);
    }
    const storagePath = path.join(descriptor.temporaryRoot, "role-states", `${safeName(label)}-${role}.json`);
    fs.mkdirSync(path.dirname(storagePath), { recursive: true });
    writePrivateJson(storagePath, storageStateForCookie(cookie, httpBase));
    return storagePath;
  }

  function resolveSecretRef(secretRef, { item, field, caseContext } = {}) {
    assert(typeof secretRef === "string" && secretRef, "runtime secretRef missing");
    if (runtimeSecrets.has(secretRef)) return runtimeSecrets.get(secretRef);
    let value = roleSecrets.refs?.[secretRef] || "";
    if (!value && secretRef.endsWith(":fixture-current-password")) {
      value = roleSecrets.roles?.[item?.accountRole] || "";
    }
    if (!value && secretRef.endsWith(":fixture-password")) {
      value = generatedPassword();
    }
    assert(value, `${item?.caseId || "case"} runtime secret was not produced for ${field || secretRef}`);
    runtimeSecrets.set(secretRef, value);
    if (caseContext) caseContext.secretRefs.add(secretRef);
    return value;
  }

  async function switchActionRoleSession(browser, item, action, caseContext) {
    const binding = (item.workflow.setup || []).find(setup =>
      setup.kind === "bind-action-role-session" && setup.route === action.route);
    if (!binding) return { switched: false, role: item.accountRole };
    const statePath = caseContext.actionRoleStatePaths[binding.accountRole] ??
      await freshRoleStorageState(binding.accountRole, `${item.caseId}-action-late`);
    await browser.replaceStorageState(statePath);
    return { switched: true, role: binding.accountRole, storageStatePath: statePath };
  }

  async function restoreCase(item, caseContext, browser = null) {
    assert(caseContext?.prepared === true, `${item.caseId} case runtime was not prepared`);
    if (caseContext.eventSourceHealthFixture) {
      const readback = await disableEvt003SourceHealthFixtureForTeardown(item, caseContext);
      caseContext.cleanupResults.push({
        cleanupId: `${item.caseId}:source-health-registry-disable`,
        status: "PASS",
        source: "soft-disable-readback-before-isolated-runtime-teardown",
        readback,
      });
    }
    for (const cleanup of item.workflow.cleanup || []) {
      if (["no-op-cleanup", "reset-local-ui-route", "restore-local-control"].includes(cleanup.kind)) continue;
      assert(["restore-fixture-state", "delete-created-fixture"].includes(cleanup.kind),
        `${item.caseId} unsupported mutation cleanup kind: ${cleanup.kind}`);
      let result;
      if (cleanup.inverseAction?.endpoint) {
        result = await executeEndpointCleanup(item, cleanup, caseContext);
      } else {
        const restoreType = cleanup.inverseAction?.localAction?.type || "";
        try {
          if (restoreType === "restore-product-fixture-snapshot") {
            await restoreProductMutationState(item, caseContext);
          } else if (restoreType === "restore-source-view-snapshot") {
            await restoreSourceViewState(item, caseContext);
          } else {
            assert(["restore-auth-fixture-snapshot", "restore-file-backed-fixture-snapshot"].includes(restoreType),
              `${item.caseId} unsupported runtime snapshot restore type: ${restoreType}`);
          }
        } finally {
          restoreStateFiles(caseContext.snapshots);
        }
        result = {
          status: "PASS",
          source: restoreType === "restore-product-fixture-snapshot"
            ? "product-memory-and-file-snapshot-restore"
            : (restoreType === "restore-source-view-snapshot"
                ? "source-view-isolation-and-file-snapshot-restore"
                : "exact-file-snapshot-restore"),
        };
      }
      const readback = await verifyCleanupReadback(item, cleanup, caseContext, result);
      caseContext.cleanupResults.push({ cleanupId: cleanup.cleanupId, ...result, readback });
    }
    if (item.caseId === "UI-004") {
      const formInput = (item.workflow.inputs || []).find(input => input.kind === "form-values");
      const originalPassword = resolveSecretRef(formInput?.actualValue?.currentPassword?.secretRef, {
        item,
        field: "currentPassword",
        caseContext,
      });
      const username = descriptor.auth?.usernames?.[item.accountRole] || "";
      const restoredLogin = await runAuthoritativeReadbackWithSnapshotRestore({
        snapshots: caseContext.snapshots,
        label: `${item.caseId} original-password login`,
        readback: () => postForm(`${httpBase}/login`, {
          username,
          password: originalPassword,
        }),
      });
      assert(restoredLogin.status === 302,
        `${item.caseId} original password login failed after exact snapshot restoration`);
      caseContext.cleanupResults.push({
        cleanupId: `${item.caseId}:after-cleanup-original-login`,
        status: "PASS",
        source: "restored-auth-store-final-login",
        readback: {
          status: "PASS",
          loginStatus: restoredLogin.status,
          authoritativeStateRestoredAfterReadback: true,
        },
      });
    }
    if (caseContext.transientStateSeeded) {
      if (caseContext.transientApiCleanup.length > 0) {
        await cleanupTransientApiSeeds(item, caseContext);
      }
      restoreStateFiles(caseContext.snapshots);
      const mutationEventIds = new Set(["EVT-021", "EVT-037", "EVT-038", "EVT-061", "EVT-068"]);
      if (mutationEventIds.has(item.caseId)) {
        for (const eventId of caseContext.catalogBindings.eventIds || []) {
          await requestEndpoint(
            "GET",
            `/ops/api/events/reviews/${encodeURIComponent(eventId)}`,
            null,
            item,
            caseContext,
            [404],
            { freshRole: true, roleOverride: "operator" },
          );
          const audit = await requestEndpoint(
            "GET",
            `/ops/api/audit?eventId=${encodeURIComponent(eventId)}`,
            null,
            item,
            caseContext,
            [200],
            { freshRole: true, roleOverride: "operator" },
          );
          const entries = Array.isArray(audit.json?.entries) ? audit.json.entries : [];
          assert(!entries.some(entry => String(entry?.eventId || entry?.targetId || "") === eventId),
            `${item.caseId} mutation audit fixture remains after snapshot cleanup`);
        }
        caseContext.cleanupResults.push({
          cleanupId: `${item.caseId}:mutation-api-readback`,
          status: "PASS",
          source: "fresh-review-and-audit-api-readback-after-snapshot-restore",
        });
      }
      const alertIds = caseContext.catalogBindings.alertIds || [];
      if (alertIds.length > 0) {
        const alertReadback = await requestEndpoint(
          "GET",
          "/ops/api/alerts/deliveries",
          null,
          item,
          caseContext,
          [200],
          { freshRole: true, roleOverride: "operator" },
        );
        const integrations = Array.isArray(alertReadback.json?.integrations)
          ? alertReadback.json.integrations
          : [];
        const attempts = Array.isArray(alertReadback.json?.attempts)
          ? alertReadback.json.attempts
          : [];
        for (const alertId of alertIds) {
          assert(!integrations.some(value => String(value?.id || "") === alertId),
            `${item.caseId} alert delivery fixture remains after snapshot cleanup`);
          assert(!attempts.some(value => String(value?.deliveryId || value?.id || "") === alertId),
            `${item.caseId} alert delivery attempt remains after snapshot cleanup`);
        }
        caseContext.cleanupResults.push({
          cleanupId: `${item.caseId}:alert-api-readback`,
          status: "PASS",
          source: "fresh-alert-list-api-readback-after-snapshot-restore",
        });
      }
      caseContext.cleanupResults.push({
        cleanupId: `${item.caseId}:restore-transient-state`,
        status: "PASS",
        source: "test-owned-transient-api-delete-and-file-snapshot-restore",
      });
    }
    const unexpectedStateChange = !stateFilesEqual(caseContext.snapshots);
    if (unexpectedStateChange) restoreStateFiles(caseContext.snapshots);
    const finalStateRestored = stateFilesEqual(caseContext.snapshots);
    caseContext.cleanupResults.push({
      cleanupId: `${item.caseId}:authoritative-state-boundary`,
      status: unexpectedStateChange ? "FAIL" : "PASS",
      source: "acceptance-owned-state-file-byte-readback",
      unexpectedStateChange,
      finalStateRestored,
    });
    assert(finalStateRestored, `${item.caseId} authoritative state cleanup restoration failed`);
    assert(!unexpectedStateChange,
      `${item.caseId} cleanup/readback left authoritative state changed`);
    activeCases.delete(item.caseId);
    if (browser) await browser.setCorrelationId(`${item.caseId}:cleanup-complete`);
    return caseContext.cleanupResults;
  }

  async function verifyCleanupReadback(item, cleanup, caseContext, cleanupResult = {}) {
    assert(cleanup.afterReadback?.identity &&
      ["absent", "equal-before", "inactive-or-equal-before"].includes(cleanup.afterReadback.expectation),
      `${item.caseId} cleanup readback contract incomplete`);
    if (cleanup.inverseAction?.endpoint) {
      const endpoint = expandFixturePath(cleanup.inverseAction.endpoint.path, caseContext.fixtureId);
      const observed = await freshAuthoritativeReadback(endpoint, item, caseContext);
      if (cleanup.afterReadback.expectation === "absent") {
        assert(observed === null, `${item.caseId} cleanup fixture remains after delete`);
      } else {
        assert(stableJson(observed) === stableJson(caseContext.beforeRecord),
          `${item.caseId} cleanup readback differs from before snapshot`);
      }
    } else {
      assert(stateFilesEqual(caseContext.snapshots), `${item.caseId} file snapshot cleanup readback mismatch`);
      if (caseContext.beforeRecordEndpoint) {
        const observed = await freshAuthoritativeReadback(
          caseContext.beforeRecordEndpoint,
          item,
          caseContext,
        );
        if (cleanup.afterReadback.expectation === "absent") {
          assert(observed === null,
            `${item.caseId} fresh authoritative cleanup readback expected an absent fixture`);
          if (item.caseId === "AUTH-020") {
            assertAuthFixtureAbsentFromUsersFile(
              descriptor.auth?.usersFile || "",
              caseContext.fixtureId,
            );
          }
        } else if (cleanup.afterReadback.expectation === "inactive-or-equal-before") {
          assertInactiveOrEqualBeforeCleanup({
            caseId: item.caseId,
            observed,
            expectedRecord: caseContext.cleanupExpectedRecord,
          });
        } else {
          assert(stableJson(observed) === stableJson(caseContext.cleanupExpectedRecord),
            `${item.caseId} fresh authoritative cleanup readback differs from the original state`);
        }
      }
    }
    return {
      status: "PASS",
      identity: cleanup.afterReadback.identity,
      expectation: cleanup.afterReadback.expectation,
      cleanupSource: cleanupResult.source || "runtime-owner",
    };
  }

  function assertSecretsAbsentFromArtifacts(outputRoot) {
    const secretValues = [
      ...Object.values(roleSecrets.roles || {}),
      ...Object.values(roleSecrets.refs || {}),
      ...runtimeSecrets.values(),
    ].filter(Boolean);
    assert(secretValues.length > 0, "case runtime secret artifact scan has no retained secret values");
    const roots = [...new Set([outputRoot, descriptor?.temporaryRoot]
      .filter(Boolean)
      .map(value => path.resolve(value)))];
    const scans = roots.map(root => assertSecretValuesAbsentFromTree(root, secretValues));
    return {
      status: "PASS",
      verificationSource: "case-runtime-exact-and-throwaway-byte-scan-before-secret-release",
      scannedFiles: scans.reduce((sum, item) => sum + item.scannedFiles, 0),
      scannedBytes: scans.reduce((sum, item) => sum + item.scannedBytes, 0),
      roots: roots.length,
    };
  }

  function releaseSecrets() {
    runtimeSecrets.clear();
    for (const values of [roleSecrets.roles || {}, roleSecrets.refs || {}]) {
      for (const key of Object.keys(values)) values[key] = "";
    }
    delete process.env.MEDIA_SERVER_V390_UI_ROLE_SECRETS;
  }

  function registerObservedSecret(item, caseContext, kind, value) {
    assert(item?.caseId && caseContext?.caseId === item.caseId && activeCases.get(item.caseId) === caseContext,
      "runtime secret registration is not bound to the active exact case");
    assert(typeof kind === "string" && /^[a-z0-9-]+$/.test(kind),
      `${item.caseId} runtime secret kind is invalid`);
    assert(typeof value === "string" && value.length > 0,
      `${item.caseId} observed runtime secret is empty`);
    const secretRef = `${item.caseId}:${kind}`;
    const existing = runtimeSecrets.get(secretRef);
    assert(!existing || existing === value,
      `${item.caseId} observed runtime secret changed within one case`);
    runtimeSecrets.set(secretRef, value);
    caseContext.secretRefs.add(secretRef);
  }

  async function verifyRejectedActionReadback(item, context) {
    const input = (item.workflow.inputs || []).find(value => value.kind === "rejected-endpoint-fixture");
    assert(input, `${item.caseId} rejected endpoint fixture is missing`);
    if (["RULE-093", "RULE-094", "RULE-095", "RULE-096", "RULE-097", "RULE-098", "RULE-100", "RULE-101"].includes(item.caseId)) {
      return verifyRuleRelationshipRejectedReadback(item, context);
    }
    if (item.caseId !== "RULE-092") {
      throw new Error(`${item.caseId} rejected endpoint runtime adapter is not implemented`);
    }
    const duplicateId = String(input.actualValue?.body?.duplicateId || "9201");
    const detail = await requestEndpoint(
      "GET", `/lab/analysis/rules/${encodeURIComponent(duplicateId)}`, null, item, context, [200],
      { freshRole: true, roleOverride: "operator" },
    );
    const payload = detail.json?.rule;
    assert(payload?.id === duplicateId, `${item.caseId} duplicate source rule is missing`);
    const before = await requestEndpoint(
      "GET", "/lab/analysis/rules", null, item, context, [200],
      { freshRole: true, roleOverride: "operator" },
    );
    const beforeRules = Array.isArray(before.json?.rules) ? before.json.rules : [];
    const beforeCount = beforeRules.filter(rule => String(rule?.id || "") === duplicateId).length;
    const rejected = await requestEndpoint(
      "POST", "/lab/analysis/rules", payload, item, context, [400],
      { freshRole: true, roleOverride: "operator" },
    );
    assert(String(rejected.json?.error || "").includes("already exists"),
      `${item.caseId} duplicate create did not return the exact rejection`);
    const after = await requestEndpoint(
      "GET", "/lab/analysis/rules", null, item, context, [200],
      { freshRole: true, roleOverride: "operator" },
    );
    const afterRules = Array.isArray(after.json?.rules) ? after.json.rules : [];
    const afterCount = afterRules.filter(rule => String(rule?.id || "") === duplicateId).length;
    assert(beforeCount === 1 && afterCount === beforeCount && stableJson(afterRules) === stableJson(beforeRules),
      `${item.caseId} duplicate rejection changed the authoritative registry`);
    return {
      schema: "media-server.v390-ui-rejected-action-readback.v1",
      fixtureId: duplicateId,
      method: "POST",
      endpoint: "/lab/analysis/rules",
      httpStatus: rejected.status,
      errorMatched: true,
      registryUnchanged: true,
      beforeCount,
      afterCount,
    };
  }

  async function verifyRuleRelationshipRejectedReadback(item, context) {
    const fixture = context.relationshipFixture;
    assert(fixture, `${item.caseId} relationship runtime fixture is missing`);
    const request = (method, endpoint, payload, statuses) => requestEndpoint(
      method, endpoint, payload, item, context, statuses,
      { freshRole: true, roleOverride: "operator" },
    );
    const viewerRequest = (method, endpoint, payload, statuses) => requestEndpoint(
      method, endpoint, payload, item, context, statuses,
      { freshRole: true, roleOverride: "viewer" },
    );
    const before = await request("GET", "/lab/analysis/va-rules", null, [200]);
    const beforeRules = Array.isArray(before.json?.vaRules) ? before.json.vaRules : [];
    const endpoint = `/lab/analysis/va-rules/${fixture.vaRuleId}`;
    const rejected = [];
    const productErrors = [];
    if (item.caseId === "RULE-101") {
      const analysisMismatch = structuredClone(fixture.vaRule);
      analysisMismatch.analysis.profileId = "9681";
      analysisMismatch.analysis.classes = ["person"];
      const analysisResponse = await request("PUT", endpoint, analysisMismatch, [400]);
      assert(String(analysisResponse.json?.error || "").includes("vaRule analysis.classes must include template analysis.classes"),
        `${item.caseId} analysis/template class rejection mismatch`);
      productErrors.push("vaRule analysis.classes must include template analysis.classes");
      const profileMismatch = structuredClone(fixture.vaRule);
      profileMismatch.analysis.profileId = "9691";
      profileMismatch.analysis.classes = ["vehicle"];
      const profileResponse = await request("PUT", endpoint, profileMismatch, [400]);
      assert(String(profileResponse.json?.error || "").includes("vaRule profile classes must include template analysis.classes"),
        `${item.caseId} profile/template class rejection mismatch`);
      productErrors.push("vaRule profile classes must include template analysis.classes");
      const afterRules = (await request("GET", "/lab/analysis/va-rules", null, [200])).json?.vaRules || [];
      assert(!afterRules.some(rule => String(rule?.id || "") === fixture.vaRuleId) &&
        stableJson(afterRules) === stableJson(beforeRules),
      `${item.caseId} rejected class mismatch reached the VA registry`);
      return {
        schema: "media-server.v390-ui-rejected-action-readback.v1",
        fixtureId: fixture.vaRuleId,
        variants: 2,
        httpStatuses: [analysisResponse.status, profileResponse.status],
        analysisTemplateMismatchRejected: true,
        profileTemplateMismatchRejected: true,
        rejectedRuleAbsent: true,
        registryUnchanged: true,
        runtimeProductResponseObserved: true,
        productErrors,
      };
    } else if (item.caseId === "RULE-097") {
      const assigned = await viewerRequest("GET", "/client/api/views", null, [200]);
      const assignedViews = Array.isArray(assigned.json?.views) ? assigned.json.views : [];
      assert(assignedViews.length === 1 && String(assignedViews[0]?.viewId || "") === fixture.viewId,
        `${item.caseId} viewer view list is not scoped to the assigned PublishedView`);
      const assignedDetail = await viewerRequest("GET", `/client/api/views/${fixture.viewId}`, null, [200]);
      assert(String(assignedDetail.json?.view?.viewId || "") === fixture.viewId &&
        (assignedDetail.json?.view?.allowedRuleIds || []).includes(fixture.vaRuleId),
      `${item.caseId} assigned PublishedView detail/allowlist mismatch`);
      const blockedDashboard = await viewerRequest(
        "GET", `/client/api/views/${fixture.blockedView.viewId}/dashboard`, null, [403, 404],
      );
      const blockedSession = await viewerRequest(
        "POST", `/client/api/views/${fixture.blockedView.viewId}/webrtc/session`, { overlayMode: "raw" }, [403, 404],
      );
      const disallowed = await viewerRequest(
        "POST", `/client/api/views/${fixture.viewId}/webrtc/session`,
        { overlayMode: "va-rule", ruleId: fixture.disallowedVaRule.id }, [400],
      );
      assert(String(disallowed.json?.error || "").includes("allowed vaRule is required for va-rule mode") &&
        !disallowed.json?.sessionId,
      `${item.caseId} assigned-view disallowed VA rule rejection mismatch`);
      rejected.push(blockedDashboard, blockedSession, disallowed);
      return {
        schema: "media-server.v390-ui-rejected-action-readback.v1",
        fixtureId: fixture.vaRuleId,
        assignedViewId: fixture.viewId,
        blockedViewId: fixture.blockedView.viewId,
        allowedRuleId: fixture.vaRuleId,
        disallowedRuleId: fixture.disallowedVaRule.id,
        visibleViewCount: assignedViews.length,
        httpStatuses: rejected.map(value => value.status),
        scopedViewerBoundaryObserved: true,
        sessionCreated: false,
      };
    } else if (item.caseId === "RULE-098") {
      const beforeViews = await viewerRequest("GET", "/client/api/views", null, [200]);
      const beforeView = (beforeViews.json?.views || []).find(value => String(value?.viewId || "") === fixture.viewId);
      assert(beforeView && !(beforeView.allowedRuleIds || []).includes(fixture.vaRuleId),
        `${item.caseId} precondition requires matching source with VA rule outside allowedRuleIds`);
      const response = await viewerRequest(
        "POST", `/client/api/views/${fixture.viewId}/webrtc/session`,
        { overlayMode: "va-rule", ruleId: fixture.vaRuleId }, [400],
      );
      assert(String(response.json?.error || "").includes("allowed vaRule is required for va-rule mode") &&
        !response.json?.sessionId,
      `${item.caseId} client VA rule allowlist rejection mismatch`);
      const afterViews = await viewerRequest("GET", "/client/api/views", null, [200]);
      const afterView = (afterViews.json?.views || []).find(value => String(value?.viewId || "") === fixture.viewId);
      assert(stableJson(afterView) === stableJson(beforeView),
        `${item.caseId} rejected client session changed the PublishedView readback`);
      const afterRules = (await request("GET", "/lab/analysis/va-rules", null, [200])).json?.vaRules || [];
      assert(stableJson(afterRules) === stableJson(beforeRules),
        `${item.caseId} rejected client session changed the VA registry`);
      return {
        schema: "media-server.v390-ui-rejected-action-readback.v1",
        fixtureId: fixture.vaRuleId,
        viewId: fixture.viewId,
        httpStatuses: [response.status],
        errorMatched: true,
        allowlistUnchanged: true,
        registryUnchanged: true,
        sessionCreated: false,
      };
    } else if (item.caseId === "RULE-100") {
      const conflict = structuredClone(fixture.vaRule);
      conflict.id = fixture.conflictVaRuleId;
      conflict.name = "REVIEW4 RULE-100 priority conflict";
      conflict.priority = fixture.vaRule.priority;
      const response = await request(
        "PUT", `/lab/analysis/va-rules/${fixture.conflictVaRuleId}`, conflict, [400],
      );
      assert(String(response.json?.error || "").includes("vaRule priority conflicts with existing rule on same source"),
        `${item.caseId} same-source priority rejection mismatch`);
      productErrors.push("vaRule priority conflicts with existing rule on same source");
      const afterRules = (await request("GET", "/lab/analysis/va-rules", null, [200])).json?.vaRules || [];
      assert(!afterRules.some(rule => String(rule?.id || "") === fixture.conflictVaRuleId) &&
        stableJson(afterRules) === stableJson(beforeRules),
      `${item.caseId} priority-conflict candidate reached the VA registry`);
      return {
        schema: "media-server.v390-ui-rejected-action-readback.v1",
        fixtureId: fixture.conflictVaRuleId,
        validRuleId: fixture.vaRuleId,
        httpStatuses: [response.status],
        errorMatched: true,
        rejectedRuleAbsent: true,
        registryUnchanged: true,
        runtimeProductResponseObserved: true,
        productErrors,
      };
    } else if (item.caseId === "RULE-093") {
      const missingProfile = structuredClone(fixture.vaRule);
      missingProfile.analysis.profileId = "9997";
      const profileResponse = await request("PUT", endpoint, missingProfile, [400]);
      assert(String(profileResponse.json?.error || "").includes("vaRule analysis.profileId does not exist"),
        `${item.caseId} missing-profile rejection mismatch`);
      productErrors.push("vaRule analysis.profileId does not exist");
      const missingTemplate = structuredClone(fixture.vaRule);
      missingTemplate.templateStart.ruleId = "9998";
      const templateResponse = await request("PUT", endpoint, missingTemplate, [400]);
      assert(String(templateResponse.json?.error || "").includes("vaRule templateStart.ruleId does not exist"),
        `${item.caseId} missing-template rejection mismatch`);
      productErrors.push("vaRule templateStart.ruleId does not exist");
      rejected.push(profileResponse, templateResponse);
    } else if (item.caseId === "RULE-094") {
      const inactiveProfile = structuredClone(fixture.vaRule);
      inactiveProfile.analysis.profileId = "9694";
      inactiveProfile.templateStart.ruleId = "9784";
      const profileResponse = await request("PUT", endpoint, inactiveProfile, [400]);
      assert(String(profileResponse.json?.error || "").includes("vaRule analysis.profileId is inactive"),
        `${item.caseId} inactive-profile rejection mismatch`);
      productErrors.push("vaRule analysis.profileId is inactive");
      const inactiveTemplate = structuredClone(fixture.vaRule);
      inactiveTemplate.analysis.profileId = "9684";
      inactiveTemplate.templateStart.ruleId = "9794";
      const templateResponse = await request("PUT", endpoint, inactiveTemplate, [400]);
      assert(String(templateResponse.json?.error || "").includes("vaRule templateStart.ruleId is inactive"),
        `${item.caseId} inactive-template rejection mismatch`);
      productErrors.push("vaRule templateStart.ruleId is inactive");
      rejected.push(profileResponse, templateResponse);
    } else if (item.caseId === "RULE-095") {
      const response = await request("POST", `/client/api/views/${fixture.viewId}/webrtc/session`,
        { overlayMode: "va-rule", ruleId: fixture.vaRuleId }, [400]);
      assert(String(response.json?.error || "").includes("vaRule source must match PublishedView source"),
        `${item.caseId} client source-mismatch rejection mismatch`);
      productErrors.push("vaRule source must match PublishedView source");
      rejected.push(response);
    } else {
      await request("PUT", `/ops/api/sources/${fixture.sourceId}`, { ...fixture.source, enabled: true }, [200]);
      await request("PUT", `/ops/api/views/${fixture.viewId}`, { ...fixture.view, enabled: false }, [200]);
      const inactiveView = await request("POST", `/client/api/views/${fixture.viewId}/webrtc/session`,
        { overlayMode: "va-rule", ruleId: fixture.vaRuleId }, [404]);
      assert(String(inactiveView.json?.error || "").includes("PublishedView not found"),
        `${item.caseId} inactive-view rejection mismatch`);
      productErrors.push("PublishedView not found");
      await request("PUT", `/ops/api/sources/${fixture.sourceId}`, { ...fixture.source, enabled: false }, [200]);
      await request("PUT", `/ops/api/views/${fixture.viewId}`, { ...fixture.view, enabled: true }, [200]);
      const inactiveChannel = await request("POST", `/client/api/views/${fixture.viewId}/webrtc/session`,
        { overlayMode: "va-rule", ruleId: fixture.vaRuleId }, [404]);
      assert(String(inactiveChannel.json?.error || "").includes("PublishedView source is not available"),
        `${item.caseId} inactive-channel rejection mismatch`);
      productErrors.push("PublishedView source is not available");
      await request("PUT", `/ops/api/views/${fixture.viewId}`, { ...fixture.view, enabled: false }, [200]);
      rejected.push(inactiveView, inactiveChannel);
    }
    const after = await request("GET", "/lab/analysis/va-rules", null, [200]);
    const afterRules = Array.isArray(after.json?.vaRules) ? after.json.vaRules : [];
    if (["RULE-093", "RULE-094"].includes(item.caseId)) {
      assert(!afterRules.some(rule => String(rule?.id || "") === fixture.vaRuleId),
        `${item.caseId} rejected VA rule was written`);
      assert(stableJson(afterRules) === stableJson(beforeRules),
        `${item.caseId} rejected relationship variants changed the VA registry`);
    } else {
      assert(stableJson(afterRules) === stableJson(beforeRules),
        `${item.caseId} client rejection changed the VA registry`);
    }
    return {
      schema: "media-server.v390-ui-rejected-action-readback.v1",
      fixtureId: fixture.vaRuleId,
      variants: rejected.length,
      httpStatuses: rejected.map(value => value.status),
      errorMatched: true,
      registryUnchanged: true,
      runtimeProductResponseObserved: true,
      productErrors,
      cleanupMode: "api-delete-source-view-soft-disable-plus-file-snapshot-restore",
    };
  }

  async function verifyExactRuntimeReadback(item, context) {
    const fixture = context.exactRuntimeFixture;
    assert(fixture, `${item.caseId} exact runtime fixture is missing`);
    const get = endpoint => requestEndpoint("GET", endpoint, null, item, context, [200], {
      freshRole: true, roleOverride: "operator",
    });
    if (item.caseId === "RULE-103") {
      const configured = (await get("/lab/analysis/rules/9913")).json?.rule;
      const defaultRule = (await get("/lab/analysis/rules/9914")).json?.rule;
      const destination = (await get("/lab/analysis/rules/9915")).json?.rule;
      assert(configured?.scenario?.reEntryMode === "configured-zones" &&
        stableJson(configured.scenario.reEntryZoneIds) === stableJson(["9915"]),
      `${item.caseId} configured re-entry GET readback mismatch`);
      assert(defaultRule?.event?.type === "re-entry" && !defaultRule?.scenario?.reEntryMode,
        `${item.caseId} default re-entry GET readback mismatch`);
      const replay = runRule103ExactReplay(configured, defaultRule, destination);
      const catalog = await get("/ops/api/rules/catalog");
      assert(stableJson(catalog.json) === fixture.seededCatalog, `${item.caseId} UI refresh changed the seeded rule catalog`);
      return { schema: "media-server.v390-rule-103-exact-runtime.v1", ...replay, exactGet: true };
    }
    const catalog = await get("/ops/api/rules/catalog");
    assert(stableJson(catalog.json) === fixture.catalogBeforeUiAction,
      `${item.caseId} UI action changed rule/profile registry state`);
    assert(sha256FileOrMissing(descriptor.eventStoragePath) === fixture.eventStorageSha256,
      `${item.caseId} UI action changed the EventRecord registry`);
    if (item.caseId === "RULE-104") {
      const reviews = await get(`/ops/api/events/reviews?eventId=${encodeURIComponent(fixture.eventId)}&limit=25`);
      const readiness = reviews.json?.approvalGatedRuleDraftReadiness;
      const row = readiness?.items?.find(value => value?.eventId === fixture.eventId);
      assert(row?.approvalState === "approval-required" &&
        row?.stagedDraft?.manualDraftRoute?.startsWith(`/ops/rules?draftEventId=${encodeURIComponent(fixture.eventId)}`) &&
        row?.stagedDraft?.noAutoSave === true &&
        row?.stagedDraft?.noAutoApply === true &&
        row?.stagedDraft?.ruleRegistryWritePerformed === false &&
        row?.stagedDraft?.profileRegistryWritePerformed === false &&
        row?.validationSummary?.fullReplayEngineExecuted === false &&
        readiness?.contract?.runtimeVlmCallPerformed === false &&
        readiness?.contract?.cloudProviderApiCalled === false,
      `${item.caseId} approval-gated readiness exact API readback mismatch`);
      return { schema: readiness.schema, eventId: fixture.eventId, approvalState: row.approvalState, registryUnchanged: true };
    }
    if (item.caseId === "RULE-111") {
      const bridge = (await get("/ops/api/vlm/rule-suggestion-draft-bridge")).json;
      const drafts = (await get("/ops/api/vlm/rule-suggestion-drafts?limit=10")).json;
      const candidate = drafts?.sourceCandidateReport?.candidates?.find(value => value?.eventId === fixture.eventId);
      assert(candidate?.ruleSuggestion?.manualReviewRequired === true &&
        candidate?.ruleSuggestion?.autoApply === false &&
        stableJson(candidate?.ruleSuggestion?.draftRule?.classes) === stableJson(["person"]) &&
        Number(candidate?.ruleSuggestion?.draftRule?.minConfidence) === 0.8 &&
        Number(candidate?.ruleSuggestion?.draftRule?.minDurationMs) === 1000 &&
        String(candidate?.ruleSuggestion?.draftRule?.direction || "") === "any" &&
        bridge?.workflowContract?.manualSaveRequired === true &&
        bridge?.workflowContract?.autoApplyEnabled === false &&
        bridge?.workflowContract?.ruleRegistryWritePerformedByBridge === false &&
        bridge?.workflowContract?.profileRegistryWritePerformedByBridge === false &&
        bridge?.workflowContract?.eventRecordWritePerformedByBridge === false &&
        bridge?.workflowContract?.runtimeVlmCallPerformed === false &&
        bridge?.workflowContract?.cloudProviderApiCalled === false,
      `${item.caseId} VLM bridge/draft exact no-write contract mismatch`);
      return { schema: bridge.schema, eventId: fixture.eventId, candidateAppliedToForm: true, registryUnchanged: true };
    }
    throw new Error(`${item.caseId} exact runtime readback adapter is unavailable`);
  }

  function runRule103ExactReplay(configured, defaultRule, destination) {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), `media-server-rule-103-replay-${process.pid}-`));
    const buildDir = path.join(outputDir, "build");
    const fixtureDir = path.join(rootDir, "test/fixtures/va_replay");
    let replayBinaryReady = false;
    const run = (name, rules, metadata) => {
      const rulesPath = path.join(outputDir, `${name}-rules.json`);
      const outputPath = path.join(outputDir, `${name}.json`);
      fs.writeFileSync(rulesPath, `${JSON.stringify(rules, null, 2)}\n`, { mode: 0o600 });
      const args = ["--input", path.join(fixtureDir, metadata), "--rules", rulesPath, "--output", outputPath, "--no-intrusion-dwell", "--enable-re-entry"];
      const env = { ...process.env, MEDIA_SERVER_VA_REPLAY_BUILD_DIR: buildDir };
      if (!replayBinaryReady) {
        execFileSync(path.join(rootDir, "scripts/internal/replay_va_metadata.sh"), args, { cwd: rootDir, env, stdio: "pipe" });
        replayBinaryReady = true;
      } else {
        execFileSync(path.join(buildDir, "va_metadata_replay"), args, { cwd: rootDir, env, stdio: "pipe" });
      }
      const payload = JSON.parse(fs.readFileSync(outputPath, "utf8"));
      return new Set((payload.events || []).map(value => String(value?.type || "")));
    };
    try {
      const configuredTypes = run("configured", [configured, destination], "re_entry_cross_zone_metadata.json");
      const defaultTypes = run("default", [defaultRule], "re_entry_metadata.json");
      const missingZone = structuredClone(configured);
      missingZone.scenario.reEntryZoneIds = ["missing-runtime-zone"];
      const missingZoneTypes = run("missing-zone", [missingZone, destination], "re_entry_cross_zone_metadata.json");
      assert(configuredTypes.has("re-entry") && defaultTypes.has("re-entry") && !missingZoneTypes.has("re-entry"),
        "RULE-103 actual replay positive/default/missing-zone RED mismatch");
      return { configuredReplayPositive: true, defaultReplayPositive: true, missingZoneReplayRed: true, temporaryOutputCleaned: true };
    } finally {
      fs.rmSync(outputDir, { recursive: true, force: true });
      assert(!fs.existsSync(outputDir), "RULE-103 replay temporary output cleanup failed");
    }
  }

  return {
    enabled: Boolean(descriptor),
    descriptor,
    prepareCase,
    freshRoleStorageState,
    resolveSecretRef,
    registerObservedSecret,
    switchActionRoleSession,
    prepareDeferredFormFixture,
    restoreCase,
    verifyMutationReadback,
    endpointActionRequest,
    verifyEndpointActionReadback,
    verifyRejectedActionReadback,
    verifyExactRuntimeReadback,
    verifyFormSubmitReadback,
    verifyCleanupReadback,
    assertSecretsAbsentFromArtifacts,
    releaseSecrets,
  };

  async function prepareCatalogRuntimeFixture(item, context) {
    const spec = exactRuntimeOracleFor(item.caseId);
    if (item.caseId.startsWith("EVT-") && !context.eventExactSeedPrepared) {
      await materializeEventExactSeed(item, context, spec);
    }
    const fixturePlan = runtimeFixturePlanFor(spec);
    if (fixturePlan.length > 0) {
      await materializeExactRuntimeFixturePlan(item, context, spec, fixturePlan);
      if (usesEventExactRuntimeBindings(item.caseId)) {
        await captureEventExactRuntimeBindings(item, context, spec);
      }
      return;
    }
    const fixtureNames = Array.isArray(spec?.setup?.fixtures) ? spec.setup.fixtures : [];
    const eventFixture = item.caseId.startsWith("EVT-") || fixtureNames.some(name =>
      /(?:event|incident|review|rule-suggestion|vlm-summary|resolution)/i.test(String(name)));
    if (!spec || !eventFixture) return;
    if (item.caseId.startsWith("EVT-")) {
      if (usesEventExactRuntimeBindings(item.caseId)) {
        await captureEventExactRuntimeBindings(item, context, spec);
      }
      return;
    }
    if (!item.caseId.startsWith("EVT-") &&
        !["/ops/events", "/client/events", "/client/live"].includes(spec.route)) return;
    const eventPath = descriptor?.eventStoragePath;
    assert(eventPath, `${item.caseId} catalog EventRecord storage is unavailable`);
    const observationPath = vlmObservationStoragePath(eventPath);
    if (!context.snapshots.some(snapshot => snapshot.path === path.resolve(observationPath))) {
      context.snapshots.push(...snapshotStateFiles([observationPath]));
    }
    const source = defaultPublishedSourceIdentity(descriptor);
    const searchQuery = String((item.workflow.inputs || []).find(input =>
      input.kind === "literal-control-value" && typeof input.actualValue === "string")?.actualValue || context.fixtureId);
    const existing = fs.existsSync(eventPath) &&
      fs.readFileSync(eventPath, "utf8").includes(`\"eventId\":\"${context.fixtureId}\"`);
    if (!existing) {
      seedEventRecordFixture(eventPath, {
        eventId: context.fixtureId,
        sourceId: source.sourceId,
        streamId: source.streamId,
      });
    }
    const observation = seedVlmRuleSuggestionFixture(observationPath, {
      eventId: context.fixtureId,
      sourceId: source.sourceId,
      searchTerm: searchQuery,
    });
    let reviewStatus = 0;
    let readbackStatus = 0;
    let recordCount = 0;
    if (["operator", "admin"].includes(item.accountRole)) {
      const review = await requestEndpoint(
        "PUT",
        `/ops/api/events/reviews/${encodeURIComponent(context.fixtureId)}`,
        {
          reviewStatus: "reviewing",
          classification: "needs-review",
          note: `REVIEW4 ${item.caseId} acceptance-owned review fixture`,
        },
        item,
        context,
        [200, 201],
      );
      const readback = await requestEndpoint(
        "GET",
        `/ops/api/events/reviews?eventId=${encodeURIComponent(context.fixtureId)}&limit=25`,
        null,
        item,
        context,
        [200],
      );
      const records = Array.isArray(readback.json?.records) ? readback.json.records : [];
      assert(records.some(record => String(record?.event?.eventId || record?.eventId || "") === context.fixtureId),
        `${item.caseId} catalog EventRecord/review fixture readback is missing`);
      reviewStatus = review.status;
      readbackStatus = readback.status;
      recordCount = records.length;
    } else {
      const viewId = descriptor.auth?.defaultViewId || "9001";
      const readback = await requestEndpoint(
        "GET",
        `/client/api/views/${encodeURIComponent(viewId)}/events?limit=25`,
        null,
        item,
        context,
        [200],
      );
      const recent = Array.isArray(readback.json?.events?.recent) ? readback.json.events.recent : [];
      assert(recent.some(record => String(record?.eventId || "") === context.fixtureId),
        `${item.caseId} viewer-scoped EventRecord fixture readback is missing`);
      readbackStatus = readback.status;
      recordCount = recent.length;
    }
    context.catalogBindings = {
      eventId: context.fixtureId,
      candidateId: String(observation?.ruleSuggestion?.candidateId || `${context.fixtureId}-candidate`),
      searchQuery,
      sourceId: source.sourceId,
      viewId: descriptor.auth?.defaultViewId || "9001",
    };
    context.transientStateSeeded = true;
    context.transientSeedReadback = {
      status: readbackStatus,
      reviewStatus,
      matchedFixture: true,
      recordCount,
    };
    if (usesEventExactRuntimeBindings(item.caseId)) {
      await captureEventExactRuntimeBindings(item, context, spec);
    }
  }

  async function materializeEventExactSeed(item, context, spec) {
    assert(!context.eventExactSeedPrepared,
      `${item.caseId} exact event seed materializer ran more than once`);
    const kind = String(spec?.seed?.kind || "");
    const plan = eventExactSeedMaterializerRegistry[kind];
    assert(plan, `${item.caseId} exact event seed.kind is not registered: ${kind}`);
    const eventPath = descriptor?.eventStoragePath;
    assert(eventPath, `${item.caseId} EventRecord storage is unavailable`);
    const observationPath = vlmObservationStoragePath(eventPath);
    if (!context.snapshots.some(snapshot => snapshot.path === path.resolve(observationPath))) {
      context.snapshots.push(...snapshotStateFiles([observationPath]));
    }

    const source = plan.sourceHealthReadback
      ? await materializeEvt003SourceHealthFixture(item, context)
      : defaultPublishedSourceIdentity(descriptor);
    const searchQuery = String((item.workflow.inputs || []).find(input =>
      input.kind === "literal-control-value" && typeof input.actualValue === "string")?.actualValue || context.fixtureId);
    const eventIds = [];
    const eventCount = Number(plan.eventRecords || 0);
    if (plan.sourceHealthReadback) {
      assert(item.caseId === "EVT-003" && eventCount === 0 && plan.sourceHealth !== true,
        `${item.caseId} source-health readback cannot be represented by EventRecord metadata`);
    }
    for (let index = 0; index < eventCount; index += 1) {
      const eventId = index === 0
        ? context.fixtureId
        : `${context.fixtureId}-${plan.related ? "related" : "state"}-${index}`;
      eventIds.push(eventId);
      const existing = fs.existsSync(eventPath) &&
        fs.readFileSync(eventPath, "utf8").includes(`\"eventId\":\"${eventId}\"`);
      assert(!existing, `${item.caseId} exact event seed already exists: ${eventId}`);
      seedEventRecordFixture(eventPath, {
        eventId,
        sourceId: source.sourceId,
        streamId: source.streamId,
        status: index === 1 && plan.archivedRecord ? "archived" : "open",
        eventType: index === 1 && plan.related ? "related-incident" : "presence",
        scenarioName: plan.related ? "review4-related-incident" : "review4-exact",
        snapshotPath: plan.evidence ? `snapshots/${eventId}.jpg` : "",
        clipPath: plan.evidence ? `clips/${eventId}.mp4` : "",
        metadata: {
          sourceId: source.sourceId,
          seedKind: kind,
          relatedTo: index > 0 && plan.related ? context.fixtureId : "",
          sourceHealth: plan.sourceHealth ? "degraded" : "available",
        },
      });
    }

    const observations = [];
    if (plan.vlm) {
      for (const eventId of eventIds) {
        observations.push(seedVlmRuleSuggestionFixture(observationPath, {
          eventId,
          sourceId: source.sourceId,
          searchTerm: searchQuery,
        }));
      }
    }

    const reviewPayload = {
      reviewStatus: plan.audit ? "reviewed" : "reviewing",
      classification: plan.sourceHealth ? "needs-source-recheck" : "needs-review",
      note: `REVIEW4 ${item.caseId} ${kind} acceptance-owned review fixture`,
      incidentStatus: plan.sourceHealth ? "investigating" : "open",
    };
    let reviewStatus = 0;
    let recordCount = 0;
    if (plan.review && eventIds.length > 0) {
      for (const eventId of eventIds) {
        const review = await requestEndpoint(
          "PUT",
          `/ops/api/events/reviews/${encodeURIComponent(eventId)}`,
          { ...reviewPayload, note: `${reviewPayload.note} ${eventId}` },
          item,
          context,
          [200, 201],
          { roleOverride: "operator" },
        );
        reviewStatus = review.status;
      }
    }

    let alertIds = [];
    if (plan.alert) {
      const deliveryId = `${context.fixtureId}-delivery`;
      const delivery = await requestEndpoint(
        "POST",
        "/ops/api/alerts/deliveries",
        {
          id: deliveryId,
          kind: "webhook",
          label: `REVIEW4 ${item.caseId} delivery`,
          enabled: true,
          endpoint: `https://invalid.example/${encodeURIComponent(deliveryId)}`,
          endpointToken: `REVIEW4-${context.fixtureId}-ENDPOINT-TOKEN`,
        },
        item,
        context,
        [200, 201],
        { roleOverride: "operator" },
      );
      assert(String(delivery.json?.delivery?.id || delivery.json?.id || "") === deliveryId,
        `${item.caseId} alert delivery seed identity is missing from the authoritative write response`);
      alertIds = [deliveryId];
    }

    if (["operator", "admin"].includes(item.accountRole) && eventIds.length > 0) {
      const readback = await requestEndpoint(
        "GET",
        `/ops/api/events/reviews?eventId=${encodeURIComponent(context.fixtureId)}&limit=100`,
        null,
        item,
        context,
        [200],
        { roleOverride: "operator" },
      );
      const records = Array.isArray(readback.json?.records) ? readback.json.records : [];
      assert(records.some(record => String(record?.event?.eventId || record?.eventId || "") === context.fixtureId),
        `${item.caseId} exact event seed is missing from the authoritative review join readback`);
      recordCount = records.length;
    }

    context.catalogBindings = {
      ...context.catalogBindings,
      eventId: context.fixtureId,
      eventIds,
      seedKind: kind,
      candidateId: String(observations[0]?.ruleSuggestion?.candidateId || `${context.fixtureId}-candidate`),
      searchQuery,
      sourceId: source.sourceId,
      viewId: source.viewId || descriptor.auth?.defaultViewId || "9001",
      alertIds,
      sourceHealth: plan.sourceHealthReadback
        ? source.status
        : (plan.sourceHealth ? "degraded" : "available"),
      ...(plan.sourceHealthReadback ? {
        status: source.status,
        reason: source.reason,
        sourceHealthStatus: source.status,
        sourceHealthReason: source.reason,
      } : {}),
    };
    context.transientStateSeeded = context.transientStateSeeded || eventIds.length > 0 || observations.length > 0 || alertIds.length > 0;
    context.transientSeedReadback = {
      status: 200,
      reviewStatus,
      matchedFixture: eventIds.length === 0 || recordCount > 0,
      recordCount,
      seedKind: kind,
      joins: {
        eventRecords: eventIds.length,
        review: Boolean(plan.review),
        vlm: observations.length,
        audit: Boolean(plan.audit),
        alert: alertIds.length,
        sourceHealth: Boolean(plan.sourceHealth),
        sourceHealthReadback: Boolean(plan.sourceHealthReadback),
        related: Boolean(plan.related),
      },
    };
    context.eventExactSeedPrepared = true;
  }

  async function materializeEvt003SourceHealthFixture(item, context) {
    assert(item.caseId === "EVT-003", `${item.caseId} cannot own the EVT-003 source-health fixture`);
    const baseline = defaultPublishedSourceIdentity(descriptor);
    const defaultSourceId = String(baseline.sourceId || "");
    const defaultViewId = String(descriptor.auth?.defaultViewId || "");
    const sourceId = "39065003";
    const viewId = "39065004";
    assert(/^\d+$/.test(sourceId) && /^\d+$/.test(viewId),
      "EVT-003 source-health fixture requires deterministic numeric sourceId/viewId");
    assert(sourceId !== defaultSourceId && viewId !== defaultViewId,
      "EVT-003 acceptance-owned source/view IDs must not target the default published source/view");
    assert(descriptor.ownership === "self-contained-pid-port-artifact-ownership" &&
      path.basename(path.resolve(descriptor.temporaryRoot)).startsWith("media_server_v390_ui-"),
    "EVT-003 source/view fixture requires isolated runtime teardown ownership");

    const sourceList = await requestEndpoint(
      "GET", "/ops/api/sources", null, item, context, [200],
      { freshRole: true, roleOverride: "operator" },
    );
    const viewList = await requestEndpoint(
      "GET", "/ops/api/views", null, item, context, [200],
      { freshRole: true, roleOverride: "operator" },
    );
    const sourcesBefore = Array.isArray(sourceList.json?.sources) ? sourceList.json.sources : [];
    const viewsBefore = Array.isArray(viewList.json?.views) ? viewList.json.views : [];
    const defaultSourceBefore = sourcesBefore.find(value =>
      String(value?.sourceId || "") === defaultSourceId);
    const defaultViewBefore = viewsBefore.find(value =>
      String(value?.viewId || "") === defaultViewId);
    assert(defaultSourceBefore && defaultViewBefore &&
      String(defaultViewBefore?.sourceId || "") === defaultSourceId,
    "EVT-003 default source/view baseline is absent from the authoritative registry");
    assert(!sourcesBefore.some(value => String(value?.sourceId || "") === sourceId) &&
      !viewsBefore.some(value => String(value?.viewId || "") === viewId),
    "EVT-003 deterministic acceptance-owned sourceId/viewId collision");

    const marker = `REVIEW4 ${item.caseId} source-health fixture`;
    context.eventSourceHealthFixture = {
      sourceId,
      viewId,
      marker,
      defaultSourceId,
      defaultViewId,
      defaultSourceBefore: structuredClone(defaultSourceBefore),
      defaultViewBefore: structuredClone(defaultViewBefore),
      sourceCreated: false,
      viewCreated: false,
      disabledForTeardown: false,
    };

    const sourcePayload = {
      ...defaultSourceBefore,
      sourceId,
      displayName: marker,
      tags: [...new Set([...(defaultSourceBefore.tags || []), "review4", "evt-003", "acceptance-owned"])],
      enabled: true,
      allowDuplicateSource: true,
    };
    const sourceCreated = await requestEndpoint(
      "POST",
      "/ops/api/sources",
      sourcePayload,
      item,
      context,
      [201],
      { freshRole: true, roleOverride: "operator" },
    );
    context.eventSourceHealthFixture.sourceCreated = true;
    assert(sourceCreated.json?.status === "created" &&
      String(sourceCreated.json?.source?.sourceId || "") === sourceId &&
      sourceCreated.json?.source?.enabled === true,
    "EVT-003 acceptance-owned source create response identity mismatch");

    const viewPayload = {
      ...defaultViewBefore,
      viewId,
      sourceId,
      displayName: marker,
      enabled: true,
    };
    const viewCreated = await requestEndpoint(
      "POST",
      "/ops/api/views",
      viewPayload,
      item,
      context,
      [201],
      { freshRole: true, roleOverride: "operator" },
    );
    context.eventSourceHealthFixture.viewCreated = true;
    assert(viewCreated.json?.status === "created" &&
      String(viewCreated.json?.view?.viewId || "") === viewId &&
      String(viewCreated.json?.view?.sourceId || "") === sourceId &&
      viewCreated.json?.view?.enabled === true,
    "EVT-003 acceptance-owned view create response identity mismatch");

    const materializedSources = await requestEndpoint(
      "GET", "/ops/api/sources", null, item, context, [200],
      { freshRole: true, roleOverride: "operator" },
    );
    const materializedViews = await requestEndpoint(
      "GET", "/ops/api/views", null, item, context, [200],
      { freshRole: true, roleOverride: "operator" },
    );
    const sourceMatches = (materializedSources.json?.sources || []).filter(value =>
      String(value?.sourceId || "") === sourceId);
    const viewMatches = (materializedViews.json?.views || []).filter(value =>
      String(value?.viewId || "") === viewId);
    const materializedSource = sourceMatches[0];
    const materializedView = viewMatches[0];
    assert(sourceMatches.length === 1 && viewMatches.length === 1 &&
      materializedSource?.enabled === true && materializedSource?.displayName === marker &&
      materializedView?.enabled === true && materializedView?.displayName === marker &&
      String(materializedView?.sourceId || "") === sourceId,
    "EVT-003 acceptance-owned source/view fixture is absent from authoritative registry readback");
    const defaultSourceAfterCreate = (materializedSources.json?.sources || []).find(value =>
      String(value?.sourceId || "") === defaultSourceId);
    const defaultViewAfterCreate = (materializedViews.json?.views || []).find(value =>
      String(value?.viewId || "") === defaultViewId);
    assert(stableJson(defaultSourceAfterCreate) === stableJson(defaultSourceBefore) &&
      stableJson(defaultViewAfterCreate) === stableJson(defaultViewBefore),
    "EVT-003 acceptance fixture creation mutated the default source/view");

    const health = await requestEndpoint(
      "GET", "/ops/api/source-health", null, item, context, [200],
      { freshRole: true, roleOverride: "operator" },
    );
    const healthItems = Array.isArray(health.json?.sourceHealth) ? health.json.sourceHealth : [];
    const healthMatches = healthItems.filter(value => String(value?.sourceId || "") === sourceId);
    const healthItem = healthMatches[0];
    const status = String(healthItem?.status || "").trim();
    const reason = String(healthItem?.reason || "").trim();
    assert(health.json?.status === "source-health" && healthMatches.length === 1 &&
      status.length > 0 && reason.length > 0,
    "EVT-003 source-health fixture lacks authoritative sourceId/status/reason readback");

    context.transientStateSeeded = true;
    context.catalogBindings = {
      ...context.catalogBindings,
      sourceId,
      viewId,
      status,
      reason,
      sourceHealthStatus: status,
      sourceHealthReason: reason,
    };
    return { sourceId, streamId: baseline.streamId, viewId, status, reason };
  }

  async function disableEvt003SourceHealthFixtureForTeardown(item, context) {
    const fixture = context.eventSourceHealthFixture;
    if (!fixture || fixture.disabledForTeardown) return { status: "already-disabled-for-teardown" };
    assert(descriptor.ownership === "self-contained-pid-port-artifact-ownership" &&
      path.basename(path.resolve(descriptor.temporaryRoot)).startsWith("media_server_v390_ui-"),
    "EVT-003 fixture disposal requires isolated runtime teardown ownership");
    try {
      if (fixture.viewCreated) {
        const disabledView = await requestEndpoint(
          "DELETE",
          `/ops/api/views/${encodeURIComponent(fixture.viewId)}`,
          null,
          item,
          context,
          [200],
          { freshRole: true, roleOverride: "operator" },
        );
        assert(disabledView.json?.status === "disabled" &&
          String(disabledView.json?.view?.viewId || "") === fixture.viewId &&
          disabledView.json?.view?.enabled === false,
        "EVT-003 acceptance-owned view soft-disable response mismatch");
      }
      if (fixture.sourceCreated) {
        const disabledSource = await requestEndpoint(
          "DELETE",
          `/ops/api/sources/${encodeURIComponent(fixture.sourceId)}`,
          null,
          item,
          context,
          [200],
          { freshRole: true, roleOverride: "operator" },
        );
        assert(disabledSource.json?.status === "disabled" &&
          String(disabledSource.json?.source?.sourceId || "") === fixture.sourceId &&
          disabledSource.json?.source?.enabled === false,
        "EVT-003 acceptance-owned source soft-disable response mismatch");
      }

      const sourceList = await requestEndpoint(
        "GET", "/ops/api/sources", null, item, context, [200],
        { freshRole: true, roleOverride: "operator" },
      );
      const viewList = await requestEndpoint(
        "GET", "/ops/api/views", null, item, context, [200],
        { freshRole: true, roleOverride: "operator" },
      );
      const source = (sourceList.json?.sources || []).find(value =>
        String(value?.sourceId || "") === fixture.sourceId);
      const view = (viewList.json?.views || []).find(value =>
        String(value?.viewId || "") === fixture.viewId);
      if (fixture.sourceCreated) {
        assert(source?.enabled === false,
          "EVT-003 acceptance-owned source is not disabled in collection readback");
      }
      if (fixture.viewCreated) {
        assert(view?.enabled === false && String(view?.sourceId || "") === fixture.sourceId,
          "EVT-003 acceptance-owned view is not disabled in collection readback");
      }
      const defaultSource = (sourceList.json?.sources || []).find(value =>
        String(value?.sourceId || "") === fixture.defaultSourceId);
      const defaultView = (viewList.json?.views || []).find(value =>
        String(value?.viewId || "") === fixture.defaultViewId);
      assert(stableJson(defaultSource) === stableJson(fixture.defaultSourceBefore) &&
        stableJson(defaultView) === stableJson(fixture.defaultViewBefore),
      "EVT-003 cleanup mutated the default source/view");

      const health = await requestEndpoint(
        "GET", "/ops/api/source-health", null, item, context, [200],
        { freshRole: true, roleOverride: "operator" },
      );
      const healthItem = (health.json?.sourceHealth || []).find(value =>
        String(value?.sourceId || "") === fixture.sourceId);
      if (fixture.sourceCreated) {
        assert(healthItem && typeof healthItem.status === "string" && healthItem.status &&
          healthItem.reason === "disabled",
        "EVT-003 disabled source-health API readback is incomplete");
      }
      fixture.disabledForTeardown = true;
      return {
        status: "disabled-until-isolated-runtime-teardown",
        sourceId: fixture.sourceId,
        viewId: fixture.viewId,
        sourceEnabled: source?.enabled ?? null,
        viewEnabled: view?.enabled ?? null,
        sourceHealthStatus: healthItem?.status || "",
        sourceHealthReason: healthItem?.reason || "",
        defaultSourceViewUnchanged: true,
        physicalAbsenceClaimed: false,
        teardownOwnership: descriptor.ownership,
      };
    } catch (error) {
      fixture.disabledForTeardown = false;
      throw error;
    }
  }

  async function captureEventExactRuntimeBindings(item, context, spec) {
    const requirements = eventExactRuntimeBindingRequirements(item.caseId);
    const valuesForKey = (value, wantedKey) => {
      const results = [];
      const visit = current => {
        if (Array.isArray(current)) {
          current.forEach(visit);
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
    };
    const templateValues = {
      fixtureId: context.fixtureId,
      eventId: context.fixtureId,
      id: context.fixtureId,
      viewId: context.catalogBindings.viewId || descriptor.auth?.defaultViewId || "9001",
      sourceId: context.catalogBindings.sourceId || defaultPublishedSourceIdentity(descriptor).sourceId,
      ruleId: context.catalogBindings.ruleId || "unmapped-rule",
      q: context.catalogBindings.searchQuery || context.fixtureId,
      evidence: "snapshot",
      incidentStatus: "open",
      startTimeMs: "0",
      endTimeMs: String(Date.now()),
      limit: "100",
      offset: "0",
    };
    const responseByRequest = {};
    const responseSamplesByRequest = {};
    const responseByPath = {};
    const requestByPath = {};
    const seedByPath = {};
    const domResponseBaselineByTarget = {};
    const mergedQuery = {};
    const baselineBodies = [];
    for (const request of spec.requests) {
      assert(["GET", "HEAD"].includes(request.method),
        `${item.caseId} event runtime baseline cannot pre-dispatch a mutation: ${request.method} ${request.path}`);
      const endpoint = materializeEventExactTemplate(request.path, templateValues);
      const identity = `${request.method} ${endpoint}`;
      Object.assign(mergedQuery,
        Object.fromEntries(new URL(endpoint, "http://runtime.invalid").searchParams.entries()));
      const roleOverride = endpoint.startsWith("/client/api/") ? "viewer" : "operator";
      const count = Number(request.repeat?.count || 1);
      const intervalMs = Number(request.repeat?.intervalMs || 0);
      const samples = [];
      for (let index = 0; index < count; index += 1) {
        const response = await requestEndpoint(
          request.method,
          endpoint,
          null,
          item,
          context,
          request.allowedStatuses,
          { freshRole: index === 0, roleOverride },
        );
        samples.push({
          status: response.status,
          json: response.json,
          text: response.text,
        });
        if (index + 1 < count && intervalMs > 0) {
          await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
      }
      responseSamplesByRequest[identity] = samples;
      responseByRequest[identity] = samples.at(-1);
      const body = samples.at(-1)?.json ?? samples.at(-1)?.text ?? null;
      baselineBodies.push(body);
      for (const assertion of request.assertions) {
        const values = eventExactValuesAtPath(body, assertion.path);
        const actual = values.length === 1 ? values[0] : values;
        const fixtureIdentityAssertion = eventExactUsesFixtureIdentityBaseline(assertion.operator);
        if (values.length > 0 ||
            ["$text", "$contentType", "$body"].includes(assertion.path)) {
          responseByPath[assertion.path] = actual;
        }
        if (fixtureIdentityAssertion) {
          seedByPath[assertion.path] = context.fixtureId;
        }
        if (requirements.seedPaths.includes(assertion.path)) {
          seedByPath[assertion.path] = actual;
        }
        if (requirements.requestPaths.includes(assertion.path)) {
          requestByPath[assertion.path] = { ...mergedQuery };
        }
      }
    }
    for (const target of requirements.requestPaths) {
      if (Object.prototype.hasOwnProperty.call(requestByPath, target)) continue;
      const keys = target.split("/").filter(Boolean);
      requestByPath[target] = keys.length === 1
        ? mergedQuery[keys[0]]
        : Object.fromEntries(keys.filter(key => key in mergedQuery).map(key => [key, mergedQuery[key]]));
    }
    for (const target of requirements.seedPaths) {
      if (Object.prototype.hasOwnProperty.call(seedByPath, target)) continue;
      const keys = target.split("/").filter(Boolean);
      const projection = Object.fromEntries(keys.map(key => {
        const values = baselineBodies.flatMap(body => valuesForKey(body, key));
        return [key, values.length === 1 ? values[0] : values];
      }));
      seedByPath[target] = keys.length === 1 ? projection[keys[0]] : projection;
    }
    if (item.caseId === "EVT-003" || item.caseId === "EVT-025") {
      const sourceId = templateValues.sourceId;
      const sourceHealth = responseByPath.sourceHealth;
      assert(Array.isArray(sourceHealth) &&
        sourceHealth.some(value => String(value?.sourceId || value?.id || "") === sourceId),
      `${item.caseId} source-health fixture was not materialized for runtime source ${sourceId}`);
      seedByPath.sourceHealth = sourceId;
      const healthItem = sourceHealth.find(value =>
        String(value?.sourceId || value?.id || "") === sourceId);
      const status = String(healthItem?.status || "").trim();
      const reason = String(healthItem?.reason || "").trim();
      assert(status && reason,
        `${item.caseId} source-health fixture status/reason is unavailable`);
      if (item.caseId === "EVT-003") {
        assert(context.catalogBindings.sourceId === sourceId &&
          context.catalogBindings.viewId === templateValues.viewId &&
          context.catalogBindings.status === status &&
          context.catalogBindings.reason === reason,
        "EVT-003 catalog sourceId/viewId/status/reason bindings drifted before runtime capture");
        const rowLocalBaseline = {
          schema: "media-server.v390-ui-event-row-local-response-baseline.v1",
          collectionPath: "sourceHealth",
          identityPaths: ["sourceId", "id"],
          identityValue: sourceId,
          projectionPaths: ["status", "reason"],
          expectedProjection: { status, reason },
        };
        domResponseBaselineByTarget.sourceHealth = rowLocalBaseline;
        domResponseBaselineByTarget["sourceHealth[].status"] = rowLocalBaseline;
      }
      seedByPath["sourceHealth[].status"] = status;
      seedByPath["sourceHealth[].reason"] = reason;
      templateValues.channelId = sourceId;
      templateValues.status = status;
      templateValues.reason = reason;
    }
    const canaries = [
      context.catalogBindings.redactionCanary,
      context.catalogBindings.rawCanary ||
        (item.caseId === "EVT-031" ? `REVIEW4-${context.fixtureId}-RAW-CANARY` : ""),
      context.catalogBindings.credentialCanary ||
        (item.caseId === "EVT-057" ? `REVIEW4-${context.fixtureId}-CREDENTIAL-CANARY` : ""),
    ].filter(Boolean);
    context.catalogBindings = {
      ...context.catalogBindings,
      ...templateValues,
      eventExactRuntime: {
        schema: "media-server.v390-ui-event-runtime-bindings.v1",
        caseId: item.caseId,
        templateValues,
        seedByPath,
        requestByPath,
        priorResponseByPath: responseByPath,
        domResponseBaselineByTarget,
        responseByRequest,
        responseSamplesByRequest,
        sensitiveCanaries: canaries,
        repeatedRequests: requirements.repeatedRequests,
      },
    };
  }

  async function materializeExactRuntimeFixturePlan(item, context, spec, fixturePlan) {
    const plan = new Set(fixturePlan);
    const source = defaultPublishedSourceIdentity(descriptor);
    const viewId = String(descriptor.auth?.defaultViewId || "");
    assert(viewId, `${item.caseId} default PublishedView is unavailable for runtime fixture setup`);
    const bindings = {
      ...context.catalogBindings,
      sourceId: source.sourceId,
      viewId,
    };

    if (plan.has("event-record")) {
      const eventPath = descriptor?.eventStoragePath;
      assert(eventPath, `${item.caseId} EventRecord storage is unavailable`);
      const existing = fs.existsSync(eventPath) &&
        fs.readFileSync(eventPath, "utf8").includes(`\"eventId\":\"${context.fixtureId}\"`);
      if (!existing) {
        seedEventRecordFixture(eventPath, {
          eventId: context.fixtureId,
          sourceId: source.sourceId,
          streamId: source.streamId,
          status: "open",
        });
      }
      bindings.eventId = context.fixtureId;
      if (Array.isArray(spec?.setup?.fixtures) && spec.setup.fixtures.includes("va-metadata-sample")) {
        // CLIENT-021 메타데이터 출처는 seed하지만 세션은 브라우저 타일이 직접 생성해야 한다.
        bindings.vaMetadataSampleId = context.fixtureId;
      }
    }

    if (plan.has("diagnostic-log-marker")) {
      const logPath = path.join(rootDir, ".media_server.log");
      assert(path.resolve(logPath) === path.resolve(rootDir, ".media_server.log"),
        `${item.caseId} diagnostic log fixture must target the product root log`);
      if (!context.snapshots.some(snapshot => snapshot.path === path.resolve(logPath))) {
        context.snapshots.push(...snapshotStateFiles([logPath]));
      }
      const marker = `REVIEW4-${context.fixtureId}-LOG-MARKER`;
      const redactionCanary = `REVIEW4-${context.fixtureId}-REDACTION-CANARY`;
      fs.appendFileSync(logPath, [
        `[review4] ${marker} password=${redactionCanary}`,
        `[review4] ${marker} \"token\":\"${redactionCanary}\"`,
        `[review4] ${marker} Authorization: Bearer ${redactionCanary}`,
        `[review4] ${marker} cookie=${redactionCanary}`,
        `[review4] ${marker} session_secret=${redactionCanary}`,
      ].join("\n") + "\n", { mode: 0o600 });
      fs.chmodSync(logPath, 0o600);
      const logTail = await requestEndpoint(
        "GET",
        "/ops/api/diagnostics/log-tail?limit=50",
        null,
        item,
        context,
        [200],
        { roleOverride: "operator" },
      );
      const lines = Array.isArray(logTail.json?.lines) ? logTail.json.lines.map(value => String(value)) : [];
      assert(lines.some(line => line.includes(marker)),
        `${item.caseId} diagnostic marker is missing from the authoritative log-tail readback`);
      assert(!lines.some(line => line.includes(redactionCanary)),
        `${item.caseId} diagnostic log-tail did not redact the fixture canary`);
      assert(lines.filter(line => line.includes(marker)).every(line => line.includes("redacted")),
        `${item.caseId} diagnostic log-tail did not preserve the marker with redacted sensitive material`);
      bindings.logMarker = marker;
      bindings.redactionCanary = redactionCanary;
    }

    if (plan.has("viewer-raw-session") || plan.has("viewer-va-overlay-session")) {
      const overlayMode = plan.has("viewer-va-overlay-session") ? "va-overlay" : "raw";
      const created = await requestEndpoint(
        "POST",
        `/client/api/views/${encodeURIComponent(viewId)}/webrtc/session`,
        { overlayMode },
        item,
        context,
        [200],
        { freshRole: true, roleOverride: "viewer" },
      );
      const sessionId = String(created.json?.sessionId || "");
      assert(sessionId && created.json?.offer,
        `${item.caseId} ${overlayMode} runtime session seed is missing sessionId or offer`);
      context.transientApiCleanup.push({
        endpoint: `/client/api/views/${encodeURIComponent(viewId)}/webrtc/session/${encodeURIComponent(sessionId)}`,
        roleOverride: "viewer",
      });
      const runtime = await requestEndpoint(
        "GET",
        "/ops/api/runtime/status",
        null,
        item,
        context,
        [200],
        { roleOverride: "operator" },
      );
      assert(Number(runtime.json?.sessionManager?.activeSessions || 0) >= 1,
        `${item.caseId} runtime session seed is absent from authoritative runtime status`);
      if (overlayMode === "va-overlay") {
        assert(Number(runtime.json?.sessionManager?.activeAnalysisTaps || 0) >= 1,
          `${item.caseId} VA overlay session seed is absent from authoritative runtime status`);
      }
      bindings.sessionId = sessionId;
      if (overlayMode === "va-overlay") bindings.vaMetadataSampleId = context.fixtureId;
    }

    if (plan.has("viewer-live-layout-preference")) {
      const layout = {
        schema: "media-server.client-live-layout.v1",
        presetType: "user",
        workspaceLayout: { gridSize: 2, density: "compact", dockSide: "right" },
        filters: { eventFeed: "selected-tile", selectedTileIndex: 1, selectedViewId: viewId },
        overlayDefaults: { infoOverlayEnabled: true },
        selectedSources: [{ slot: 0, viewId, overlayMode: "raw" }],
        tiles: [{ slot: 0, viewId, overlayMode: "raw", selected: true }],
      };
      const saved = await requestEndpoint(
        "PUT",
        "/client/api/preferences/live-layout",
        layout,
        item,
        context,
        [200, 201],
        { freshRole: true, roleOverride: "viewer" },
      );
      const preference = saved.json?.userPreference?.workspaceLayout;
      assert(saved.json?.saved === true && preference?.gridSize === 2 &&
        preference?.density === "compact" && preference?.dockSide === "right",
      `${item.caseId} saved layout preference response is incomplete`);
      const readback = await requestEndpoint(
        "GET",
        "/client/api/preferences/live-layout",
        null,
        item,
        context,
        [200],
        { freshRole: true, roleOverride: "viewer" },
      );
      const restored = readback.json?.userPreference?.workspaceLayout;
      assert(restored?.gridSize === 2 && restored?.density === "compact" && restored?.dockSide === "right",
        `${item.caseId} saved layout preference is missing from authoritative readback`);
    }

    context.catalogBindings = bindings;
    context.transientStateSeeded = true;
    context.transientSeedReadback = {
      fixturePlan: [...fixturePlan],
      sourceId: bindings.sourceId,
      viewId: bindings.viewId,
      eventId: bindings.eventId || "",
      sessionId: bindings.sessionId || "",
      status: "PASS",
    };
  }

  async function prepareAuthFixture(item, context) {
    const formInput = (item.workflow.inputs || []).find(input => input.kind === "form-values");
    if (!formInput) return;
    const values = formInput.actualValue || {};
    if (["UI-002", "AUTH-005", "AUTH-006", "AUTH-007"].includes(item.caseId)) {
      restoreStateFiles(context.snapshots);
      const usersFile = descriptor.auth?.usersFile;
      assert(usersFile, `${item.caseId} auth users file missing from runtime descriptor`);
      if (item.caseId === "AUTH-007") {
        const emptyPassword = await postForm(`${httpBase}/login`, {
          username: descriptor.auth?.usernames?.admin || "admin",
          password: "",
        });
        assert(emptyPassword.status === 401,
          `${item.caseId} hashed-admin empty-password boundary expected HTTP 401, got ${emptyPassword.status}`);
        context.preFormReadback = {
          hashedAdminEmptyPasswordStatus: emptyPassword.status,
          hashlessAdminUsername: "admin",
          hashlessMutationPending: true,
        };
      } else {
        fs.rmSync(usersFile, { force: true });
        fs.rmSync(`${usersFile}.tmp`, { force: true });
        if (item.caseId === "UI-002") {
          const before = sha256FileOrMissing(usersFile);
          const weak = await postForm(`${httpBase}/setup`, {
            username: "admin",
            password: "weak",
            confirm: "weak",
          });
          assert(weak.status === 400 && sha256FileOrMissing(usersFile) === before && !fs.existsSync(usersFile),
            `${item.caseId} weak setup was not rejected without a store write`);
          context.preFormReadback = { weakPasswordStatus: weak.status, weakPasswordNoWrite: true };
        } else if (item.caseId === "AUTH-005") {
          const missingWhoami = await requestJson(`${httpBase}/auth/whoami`);
          const missingLogin = await requestStatus(`${httpBase}/login`);
          assert(missingWhoami.status === 200 && missingWhoami.json?.setupRequired === true &&
            missingLogin.status === 302 && missingLogin.location === "/setup",
          `${item.caseId} missing-store bootstrap gate mismatch`);
          writePrivateJson(usersFile, {
            users: [{ username: "admin", displayName: "Hashless Admin", role: "admin", scopes: ["*"], passwordHash: "", enabled: true }],
            invites: [], accessRequests: [],
          });
          const hashlessWhoami = await requestJson(`${httpBase}/auth/whoami`);
          const hashlessLogin = await postForm(`${httpBase}/login`, { username: "admin", password: "unusable" });
          assert(hashlessWhoami.status === 200 && hashlessWhoami.json?.setupRequired === true &&
            hashlessLogin.status === 403,
          `${item.caseId} hashless-admin bootstrap gate mismatch`);
          fs.rmSync(usersFile, { force: true });
          fs.rmSync(`${usersFile}.tmp`, { force: true });
          context.preFormReadback = {
            missingStoreSetupRequired: true,
            missingLoginStatus: missingLogin.status,
            hashlessStoreSetupRequired: true,
            hashlessLoginStatus: hashlessLogin.status,
          };
        }
      }
      return;
    }
    if (["UI-003", "AUTH-004"].includes(item.caseId)) {
      const passwordRef = Object.values(values).find(value => value?.secretRef)?.secretRef;
      const password = resolveSecretRef(passwordRef, { item, field: "password", caseContext: context });
      await createAuthUser(values.username, "viewer", password, descriptor.auth?.defaultViewId || "9001");
      return;
    }
    if (["UI-007", "AUTH-034"].includes(item.caseId)) {
      const tokenRef = values.token?.secretRef;
      const username = `${item.caseId.toLowerCase()}-invite`;
      const viewId = descriptor.auth?.defaultViewId || "9001";
      const invite = normalizeInviteSeedResponse(await createInvite(username, viewId), { username, viewId });
      assert(invite.token, `${item.caseId} invite API did not return a runtime token`);
      runtimeSecrets.set(tokenRef, invite.token);
      const password = resolveSecretRef(values.password?.secretRef,
        { item, field: "password", caseContext: context });
      const beforeLogin = await postForm(`${httpBase}/login`, { username, password });
      const beforeClient = await requestStatus(`${httpBase}/client/api/views`);
      assert(beforeLogin.status === 401 && beforeClient.status === 401,
        `${item.caseId} invite setup opened login/client access before completion`);
      context.preFormReadback = {
        beforeSetupLoginStatus: beforeLogin.status,
        beforeSetupClientStatus: beforeClient.status,
      };
      return;
    }
    if (item.caseId === "AUTH-035") {
      const viewId = descriptor.auth?.defaultViewId || "9001";
      const consumedUsername = "auth-035-consumed";
      const consumed = normalizeInviteSeedResponse(await createInvite(consumedUsername, viewId), {
        username: consumedUsername,
        viewId,
      });
      const consumedPassword = resolveSecretRef(values.password?.secretRef,
        { item, field: "password", caseContext: context });
      const consumedOnce = await postForm(`${httpBase}/invite/setup`, {
        token: consumed.token,
        password: consumedPassword,
        confirm: consumedPassword,
      });
      assert(consumedOnce.status === 302, `${item.caseId} consumed invite seed setup failed`);
      runtimeSecrets.set(values.token.secretRef, consumed.token);
      context.secretRefs.add(values.token.secretRef);

      const expiredUsername = "auth-035-expired";
      const expired = normalizeInviteSeedResponse(await createInvite(expiredUsername, viewId), {
        username: expiredUsername,
        viewId,
      });
      const expiredRef = `${item.caseId}:expired-invite-token`;
      runtimeSecrets.set(expiredRef, expired.token);
      context.secretRefs.add(expiredRef);
      const state = readUsersState(descriptor.auth?.usersFile || "");
      const store = JSON.parse(state.raw);
      const expiredRecord = store.invites.find(invite => invite.inviteId === expired.inviteId);
      assert(expiredRecord, `${item.caseId} expired invite seed record missing`);
      expiredRecord.expiresAt = "2000-01-01T00:00:00Z";
      writePrivateJson(descriptor.auth.usersFile, store);
      context.preFormReadback = {
        consumedInviteId: consumed.inviteId,
        expiredInviteId: expired.inviteId,
        consumedOnceStatus: consumedOnce.status,
      };
    }
  }

  async function prepareDeferredFormFixture(item, context) {
    if (item.caseId !== "AUTH-007") return { prepared: false };
    assert(context?.preFormReadback?.hashlessMutationPending === true,
      `${item.caseId} deferred hashless-admin fixture was not staged`);
    const usersFile = descriptor.auth?.usersFile;
    assert(usersFile, `${item.caseId} auth users file missing from runtime descriptor`);
    writePrivateJson(usersFile, {
      users: [{
        username: "admin",
        displayName: "Hashless Fixture",
        role: "admin",
        scopes: ["*"],
        passwordHash: "",
        enabled: true,
      }],
      invites: [],
      accessRequests: [],
    });
    const whoami = await requestJson(`${httpBase}/auth/whoami`);
    assert(whoami.status === 200 && whoami.json?.setupRequired === true,
      `${item.caseId} deferred hashless-admin bootstrap state is missing`);
    context.preFormReadback.hashlessUsersSha256 = sha256FileOrMissing(usersFile);
    context.preFormReadback.hashlessMutationPending = false;
    context.preFormReadback.hashlessMutationPrepared = true;
    return {
      prepared: true,
      source: "post-navigation-pre-submit-auth-store-fixture",
      setupRequired: true,
    };
  }

  async function preparePersistedFixture(item, context) {
    if (ruleRelationshipFixtureCaseIds.has(item.caseId)) return;
    if ((item.workflow.inputs || []).some(input => input.kind === "endpoint-action-fixture")) return;
    const setup = (item.workflow.setup || []).find(value =>
      value.kind === "seed-reviewed-state" && value.persistedMutation === true);
    if (!setup || item.workflow.workflowClass === "form-submit") return;
    const endpoint = item.workflow.productAction?.endpoint;
    if (!endpoint) return;
    const fixtureInput = (item.workflow.inputs || []).find(input => input.kind === "reversible-fixture-record");
    const operation = fixtureInput?.actualValue?.operation || "write";
    const expanded = expandFixturePath(endpoint.path, context.fixtureId);
    context.beforeRecordEndpoint = expanded;
    context.beforeRecord = await readEndpointRecord(expanded, item, context);
    context.cleanupExpectedRecord = context.beforeRecord;
    if (operation === "create") {
      assert(context.beforeRecord === null,
        `${item.caseId} reviewed create fixture collides with existing product state`);
      context.beforeRecord = null;
      return;
    }
    if (item.caseId === "AUTH-037" || item.caseId === "AUTH-038") {
      seedExactAccessRequestFixture(descriptor.auth?.usersFile, {
        requestId: context.fixtureId,
        username: context.fixtureId,
        displayName: `REVIEW4 ${item.caseId} fixture`,
        contact: `${context.fixtureId}@invalid.example`,
        reason: "v390 exact runtime fixture",
        viewId: descriptor.auth?.defaultViewId || "9001",
      });
      context.beforeRecord = await readEndpointRecord(expanded, item, context);
      return;
    }
    if (item.caseId === "AUTH-019" && context.beforeRecord === null) {
      const password = resolveSecretRef(`${item.caseId}:fixture-password`, {
        item,
        field: "password",
        caseContext: context,
      });
      await createAuthUser(
        context.fixtureId,
        "viewer",
        password,
        descriptor.auth?.defaultViewId || "9001",
      );
      context.beforeRecord = await readEndpointRecord(expanded, item, context);
      assert(context.beforeRecord !== null, `${item.caseId} auth user fixture seed readback missing`);
      return;
    }
    if (context.beforeRecord === null && ["PUT", "DELETE"].includes(endpoint.method)) {
      if (resolveAuthoritativeReadback(expanded, context.fixtureId).mode === "source-view-pair") {
        await seedSourceViewPair(item, context, fixtureInput?.actualValue || {});
      } else {
        const payload = fixturePayload(item, context.fixtureId, fixtureInput?.actualValue || {});
        await requestEndpoint("PUT", expanded, payload, item, context, [200, 201]);
      }
      context.beforeRecord = await readEndpointRecord(expanded, item, context);
      assert(context.beforeRecord !== null, `${item.caseId} authoritative fixture seed readback missing`);
    }
  }

  async function prepareEndpointActionFixture(item, context) {
    const input = (item.workflow.inputs || []).find(value => value.kind === "endpoint-action-fixture");
    if (!input) return;
    const value = input.actualValue || {};
    const setup = value.setup || {};
    const sourceListBefore = await requestEndpoint("GET", "/ops/api/sources", null, item, context, [200], {
      roleOverride: "operator",
    });
    const viewListBefore = await requestEndpoint("GET", "/ops/api/views", null, item, context, [200], {
      roleOverride: "operator",
    });
    context.endpointActionFixture = {
      sourceRegistryBefore: stableJson(sourceListBefore.json),
      viewRegistryBefore: stableJson(viewListBefore.json),
      setupKind: setup.kind,
      responseReadbackKind: value.readback?.kind || "",
      existingSessionCookie: "",
      loginPasswordRef: "",
    };
    if (item.caseId === "AUTH-020") {
      const passwordRef = `${item.caseId}:endpoint-user-password`;
      const password = generatedPassword();
      runtimeSecrets.set(passwordRef, password);
      context.secretRefs.add(passwordRef);
      await createAuthUser(
        context.fixtureId,
        "viewer",
        password,
        descriptor.auth?.defaultViewId || "9001",
      );
      const login = await postForm(`${httpBase}/login`, { username: context.fixtureId, password });
      assert(login.status === 302, `${item.caseId} active endpoint user login seed failed: ${login.status}`);
      const cookie = cookieFromResponse(login);
      const principal = await requestJson(`${httpBase}/auth/whoami`, { cookie });
      assert(principal.status === 200 && principal.json?.authenticated === true &&
        principal.json?.username === context.fixtureId,
      `${item.caseId} active endpoint user session seed readback failed`);
      context.endpointActionFixture.existingSessionCookie = cookie;
      context.endpointActionFixture.loginPasswordRef = passwordRef;
      context.beforeRecordEndpoint = `/ops/api/users/${encodeURIComponent(context.fixtureId)}/disable`;
      context.beforeRecord = await readEndpointRecord(context.beforeRecordEndpoint, item, context);
      context.cleanupExpectedRecord = null;
      assert(context.beforeRecord?.enabled === true,
        `${item.caseId} acceptance-owned active user seed is missing`);
      return;
    }
    if (item.caseId === "SRC-008") {
      const collision = (sourceListBefore.json?.sources || []).some(source =>
        String(source?.sourceId || "") === context.fixtureId);
      assert(!collision, `${item.caseId} acceptance-owned source fixture collides with existing state`);
      context.beforeRecordEndpoint = `/ops/api/sources/${encodeURIComponent(context.fixtureId)}`;
      context.beforeRecord = null;
      context.cleanupExpectedRecord = null;
      return;
    }
    if (["SRC-010", "SRC-019"].includes(item.caseId)) {
      assert(setup.kind === "source-view-pair" && setup.source?.sourceId === context.fixtureId &&
        setup.publishedView?.viewId === context.fixtureId &&
        setup.publishedView?.sourceId === context.fixtureId,
      `${item.caseId} source/view endpoint fixture setup binding mismatch`);
      const sourceCollision = (sourceListBefore.json?.sources || []).some(source =>
        String(source?.sourceId || "") === context.fixtureId);
      const viewCollision = (viewListBefore.json?.views || []).some(view =>
        String(view?.viewId || "") === context.fixtureId);
      assert(!sourceCollision && !viewCollision,
        `${item.caseId} acceptance-owned source/view fixture collides with existing state`);
      await requestEndpoint(
        "PUT", `/ops/api/sources/${encodeURIComponent(context.fixtureId)}`,
        setup.source, item, context, [200, 201], { roleOverride: "operator" },
      );
      await requestEndpoint(
        "PUT", `/ops/api/views/${encodeURIComponent(context.fixtureId)}`,
        setup.publishedView, item, context, [200, 201], { roleOverride: "operator" },
      );
      context.beforeRecordEndpoint = item.caseId === "SRC-010"
        ? `/ops/api/sources/${encodeURIComponent(context.fixtureId)}`
        : `/ops/api/views/${encodeURIComponent(context.fixtureId)}`;
      context.beforeRecord = await readEndpointRecord(context.beforeRecordEndpoint, item, context);
      context.cleanupExpectedRecord = null;
      assert(context.beforeRecord?.source?.enabled === true && context.beforeRecord?.publishedView?.enabled === true,
        `${item.caseId} acceptance-owned source/view seed readback failed`);
      return;
    }
    assert(item.caseId === "SRC-031" && setup.kind === "registry-equal-before",
      `${item.caseId} unsupported endpoint-owned fixture setup`);
  }

  function endpointActionRequest(item, context, input) {
    assert(context.endpointActionFixture && input?.kind === "endpoint-action-fixture",
      `${item.caseId} endpoint-owned runtime fixture is unavailable`);
    const value = input.actualValue || {};
    const endpoint = item.workflow.productAction?.endpoint;
    const path = expandFixturePath(String(value.path || ""), context.fixtureId);
    assert(endpoint?.method === value.method && endpoint.path === value.path,
      `${item.caseId} endpoint-owned manifest product action/input drift`);
    assert(path === expandFixturePath(endpoint.path, context.fixtureId),
      `${item.caseId} endpoint-owned runtime path drift`);
    return {
      method: value.method,
      path,
      body: value.body ?? null,
      allowedStatuses: [...endpoint.allowedStatuses],
    };
  }

  async function verifyEndpointActionReadback(item, context, {
    action,
    endpointResponse,
    networkResponses,
  } = {}) {
    const request = endpointActionRequest(
      item,
      context,
      (item.workflow.inputs || []).find(value => value.kind === "endpoint-action-fixture"),
    );
    assert(action?.kind === "execute-endpoint-action" && endpointResponse &&
      request.allowedStatuses.includes(endpointResponse.status),
    `${item.caseId} endpoint-owned response is not bound to the completed browser action`);
    const responses = (networkResponses || []).filter(entry => {
      if (entry.phase !== "response" || entry.method !== request.method ||
          entry.correlationId !== action.semanticCompletion.correlationId) return false;
      try { return new URL(entry.url).pathname === request.path; } catch { return false; }
    });
    assert(responses.length === 1 && responses[0].status === endpointResponse.status &&
      responses[0].safeResponseProjectionSource === "playwright-response-json" &&
      endpointResponse.projectionSource === "playwright-response-json",
      `${item.caseId} endpoint-owned network response readback mismatch`);
    const safeResponse = responses[0].safeResponseBody;
    assert(safeResponse && stableJson(safeResponse) === stableJson(endpointResponse.safeBody),
      `${item.caseId} endpoint-owned safe response projection drift`);
    const common = {
      schema: "media-server.v390-ui-endpoint-action-readback.v1",
      fixtureId: context.fixtureId,
      method: request.method,
      path: request.path,
      status: endpointResponse.status,
      correlationId: action.semanticCompletion.correlationId,
      actualBrowserRequestObserved: true,
      responseSynthesized: false,
      requestId: responses[0].requestId,
      safeResponse: structuredClone(safeResponse),
      authoritative: true,
    };
    if (item.caseId === "AUTH-020") {
      const state = readUsersState(descriptor.auth?.usersFile || "");
      const stored = state.users.find(user => user.username === context.fixtureId);
      const listedResponse = await requestEndpoint("GET", "/ops/api/users", null, item, context, [200], {
        freshRole: true, roleOverride: "admin",
      });
      const listed = (listedResponse.json?.users || []).find(user => user.username === context.fixtureId);
      const existingSession = await requestJson(`${httpBase}/auth/whoami`, {
        cookie: context.endpointActionFixture.existingSessionCookie,
      });
      const password = runtimeSecrets.get(context.endpointActionFixture.loginPasswordRef) || "";
      const newLogin = await postForm(`${httpBase}/login`, { username: context.fixtureId, password });
      assert(safeResponse.status === "disabled" &&
        safeResponse.user?.username === context.fixtureId && safeResponse.user?.enabled === false &&
        stored?.enabled === false && listed?.enabled === false &&
        existingSession.status === 401 && newLogin.status === 401,
      `${item.caseId} disabled user response/store/list/session/login readback failed`);
      return { ...common, readbackKind: "disabled-user-store-list-session-login", enabled: false,
        existingSessionStatus: existingSession.status, newLoginStatus: newLogin.status };
    }
    const sources = await requestEndpoint("GET", "/ops/api/sources", null, item, context, [200], {
      freshRole: true, roleOverride: "operator",
    });
    const views = await requestEndpoint("GET", "/ops/api/views", null, item, context, [200], {
      freshRole: true, roleOverride: "operator",
    });
    const source = (sources.json?.sources || []).find(value => String(value?.sourceId || "") === context.fixtureId);
    const view = (views.json?.views || []).find(value => String(value?.viewId || "") === context.fixtureId);
    if (item.caseId === "SRC-008") {
      assert(safeResponse.ok === true && safeResponse.source?.sourceId === context.fixtureId &&
        safeResponse.source?.enabled === true &&
        source?.enabled === true && source?.displayName === `REVIEW4 ${item.caseId} source`,
      `${item.caseId} created source response/registry readback failed`);
      return { ...common, readbackKind: "created-source-registry", sourcePresent: true, enabled: true };
    }
    if (item.caseId === "SRC-010") {
      const client = await requestFixtureScopedViewerReadback(
        "GET", `/client/api/views/${encodeURIComponent(context.fixtureId)}`,
        item, context, [404],
      );
      assert(safeResponse.status === "disabled" && safeResponse.source?.sourceId === context.fixtureId &&
        safeResponse.source?.enabled === false &&
        source?.enabled === false && view?.enabled === true && client.status === 404,
      `${item.caseId} disabled source response/registry/client boundary readback failed`);
      return { ...common, readbackKind: "disabled-source-and-client-boundary", sourceEnabled: false,
        viewEnabled: true, clientStatus: client.status };
    }
    if (item.caseId === "SRC-019") {
      const client = await requestFixtureScopedViewerReadback(
        "GET", `/client/api/views/${encodeURIComponent(context.fixtureId)}`,
        item, context, [404],
      );
      assert(safeResponse.status === "disabled" && safeResponse.view?.viewId === context.fixtureId &&
        safeResponse.view?.enabled === false &&
        source?.enabled === true && view?.enabled === false && client.status === 404,
      `${item.caseId} disabled view response/registry/client boundary readback failed`);
      return { ...common, readbackKind: "disabled-view-and-client-boundary", sourceEnabled: true,
        viewEnabled: false, clientStatus: client.status };
    }
    assert(item.caseId === "SRC-031" && safeResponse.ok === true &&
      safeResponse.credentialGate?.schema === "media-server.onvif-credential-binding-gate.v1" &&
      safeResponse.credentialGate?.requiredScope === "source:write" &&
      safeResponse.credentialGate?.urlCredentialsRejected === true &&
      safeResponse.credentialGate?.secretMaterialStored === false &&
      safeResponse.sourceDraft?.sourceId && safeResponse.sourceDraft?.enabled === true &&
      safeResponse.publishedViewDraft?.viewId &&
      safeResponse.publishedViewDraft?.sourceId === safeResponse.sourceDraft.sourceId &&
      safeResponse.publishedViewDraft?.enabled === true &&
      stableJson(sources.json) === context.endpointActionFixture.sourceRegistryBefore &&
      stableJson(views.json) === context.endpointActionFixture.viewRegistryBefore,
    `${item.caseId} ONVIF draft response/registry equal-before readback failed`);
    return { ...common, readbackKind: "onvif-draft-no-registry-mutation",
      sourceRegistryEqualBefore: true, viewRegistryEqualBefore: true };
  }

  async function seedSourceViewPair(item, context, value) {
    const pair = buildOnvifPairPayload(item, context.fixtureId, value);
    const onvif = ["UI-109", "SRC-066"].includes(item.caseId);
    if (onvif) {
      await requestEndpoint(
        "PUT",
        `/ops/api/onvif/channels/${encodeURIComponent(context.fixtureId)}`,
        pair,
        item,
        context,
        [200, 201],
      );
      return;
    }
    await requestEndpoint(
      "PUT",
      `/ops/api/sources/${encodeURIComponent(context.fixtureId)}`,
      pair.source,
      item,
      context,
      [200, 201],
    );
    await requestEndpoint(
      "PUT",
      `/ops/api/views/${encodeURIComponent(context.fixtureId)}`,
      pair.publishedView,
      item,
      context,
      [200, 201],
    );
  }

  async function executeEndpointCleanup(item, cleanup, context) {
    const spec = cleanup.inverseAction.endpoint;
    const endpoint = expandFixturePath(spec.path, context.fixtureId);
    const payload = cleanup.kind === "restore-fixture-state"
      ? (context.beforeRecord || fixturePayload(item, context.fixtureId, {}))
      : null;
    const response = await requestEndpoint(spec.method, endpoint, payload, item, context, spec.allowedStatuses);
    return { status: "PASS", source: "product-inverse-endpoint", method: spec.method, endpoint, httpStatus: response.status };
  }

  async function restoreProductMutationState(item, context) {
    const endpointSpec = item.workflow.productAction?.endpoint;
    assert(endpointSpec?.path?.includes("{fixtureId}"),
      `${item.caseId} product-memory restore requires a fixture-bound endpoint`);
    const endpoint = expandFixturePath(endpointSpec.path, context.fixtureId);
    if (context.cleanupExpectedRecord === null) {
      await requestEndpoint("DELETE", endpoint, null, item, context, [200, 204, 404], { freshRole: true });
      return;
    }
    await requestEndpoint("PUT", endpoint, context.cleanupExpectedRecord, item, context, [200, 201], { freshRole: true });
  }

  async function restoreSourceViewState(item, context) {
    const sourceEndpoint = `/ops/api/sources/${encodeURIComponent(context.fixtureId)}`;
    const viewEndpoint = `/ops/api/views/${encodeURIComponent(context.fixtureId)}`;
    if (context.cleanupExpectedRecord === null) {
      await requestEndpoint("DELETE", viewEndpoint, null, item, context, [200, 404], { freshRole: true, roleOverride: "operator" });
      await requestEndpoint("DELETE", sourceEndpoint, null, item, context, [200, 404], { freshRole: true, roleOverride: "operator" });
      return;
    }
    const pair = context.cleanupExpectedRecord;
    assert(pair?.source && pair?.publishedView,
      `${item.caseId} original source/view pair is incomplete`);
    if (["UI-109", "SRC-066"].includes(item.caseId)) {
      await requestEndpoint(
        "PUT",
        `/ops/api/onvif/channels/${encodeURIComponent(context.fixtureId)}`,
        pair,
        item,
        context,
        [200, 201],
        { freshRole: true, roleOverride: "operator" },
      );
      return;
    }
    await requestEndpoint("PUT", sourceEndpoint, pair.source, item, context, [200, 201], { freshRole: true, roleOverride: "operator" });
    await requestEndpoint("PUT", viewEndpoint, pair.publishedView, item, context, [200, 201], { freshRole: true, roleOverride: "operator" });
  }

  async function readEndpointRecord(endpoint, item, context, { freshRole = false } = {}) {
    const readback = resolveAuthoritativeReadback(endpoint, context.fixtureId);
    if (readback.mode === "source-view-pair") {
      const sourceResponse = await requestEndpoint(
        "GET", readback.endpoint, null, item, context, [200], { freshRole, roleOverride: readback.role },
      );
      const viewResponse = await requestEndpoint(
        "GET", readback.secondaryEndpoint, null, item, context, [200], { freshRole, roleOverride: readback.role },
      );
      const source = unwrapRecord(sourceResponse.json, readback.fixtureId, readback.matchFields);
      const publishedView = unwrapRecord(viewResponse.json, readback.fixtureId, readback.matchFields);
      return source === null && publishedView === null ? null : { source, publishedView };
    }
    const direct = await requestEndpoint(
      "GET",
      readback.endpoint,
      null,
      item,
      context,
      [200, 404],
      { freshRole, roleOverride: readback.role },
    );
    if (direct.status === 404) return null;
    const payload = direct.json;
    return readback.mode === "whole-response"
      ? payload
      : unwrapRecord(payload, readback.fixtureId, readback.matchFields);
  }

  async function freshAuthoritativeReadback(endpoint, item, context) {
    return readEndpointRecord(endpoint, item, context, { freshRole: true });
  }

  async function verifyMutationReadback(item, context) {
    assert(item.workflow?.workflowClass === "persisted-mutation",
      `${item.caseId} mutation readback is only valid for persisted workflows`);
    const endpointSpec = item.workflow.productAction?.endpoint;
    assert(endpointSpec?.method && endpointSpec.path,
      `${item.caseId} mutation readback endpoint is unavailable`);
    const endpoint = expandFixturePath(endpointSpec.path, context.fixtureId);
    const observed = await freshAuthoritativeReadback(endpoint, item, context);
    const before = context.beforeRecord;
    const changed = stableJson(observed) !== stableJson(before);
    if (endpointSpec.method === "DELETE") {
      assert(observed === null,
        `${item.caseId} deleted mutation remains in authoritative product readback`);
    } else {
      assert(observed !== null,
        `${item.caseId} persisted mutation is missing from authoritative product readback`);
      assert(changed,
        `${item.caseId} persisted mutation did not change authoritative product state`);
    }
    const readback = resolveAuthoritativeReadback(endpoint, context.fixtureId);
    if (readback.mode === "source-view-pair" && endpointSpec.method !== "DELETE") {
      assert(observed?.source && observed?.publishedView,
        `${item.caseId} source/view mutation did not persist both transaction members`);
    }
    assertReviewedMutationOutcome(item.caseId, observed);
    return {
      schema: "media-server.v390-ui-runtime-mutation-readback.v1",
      fixtureId: context.fixtureId,
      endpoint,
      method: endpointSpec.method,
      mode: readback.mode,
      changed,
      persistedMutationObserved: true,
      beforeSha256: crypto.createHash("sha256").update(stableJson(before)).digest("hex"),
      observedSha256: crypto.createHash("sha256").update(stableJson(observed)).digest("hex"),
      observedPresent: observed !== null,
    };
  }

  async function verifyFormSubmitReadback(item, context, runtime = {}) {
    const selected = formReadbackProfiles[item.caseId];
    assert(selected, `${item.caseId} form authoritative readback profile is not registered`);
    assert(item.oracle?.expectedBehaviorSha256 === selected.expectedBehaviorSha256,
      `${item.caseId} form readback profile expected-behavior digest drift`);
    const result = await verifyFormSubmitReadbackProfile(item, context, runtime);
    const observedChecks = Object.keys(result.checks || {}).sort();
    const expectedChecks = [...selected.requiredChecks].sort();
    assert(stableJson(observedChecks) === stableJson(expectedChecks),
      `${item.caseId} form readback evidence-key coverage drift`);
    assert(expectedChecks.every(key => result.checks[key] === true),
      `${item.caseId} form authoritative check failed`);
    return {
      ...result,
      profileId: `form-readback:${item.caseId}`,
      expectedBehaviorSha256: selected.expectedBehaviorSha256,
    };
  }

  async function verifyFormSubmitReadbackProfile(item, context, {
    action,
    formResponseIdentity,
    browser,
    originalSessionCookie = "",
  } = {}) {
    assert(item.workflow?.workflowClass === "form-submit",
      `${item.caseId} form readback is only valid for form-submit workflows`);
    assert(action?.kind === "submit-form" && formResponseIdentity?.status,
      `${item.caseId} form readback is not bound to a completed response`);
    const input = (item.workflow.inputs || []).find(value => value.kind === "form-values");
    assert(input?.submit === true, `${item.caseId} form readback input missing`);
    const values = input.actualValue || {};
    const common = {
      schema: "media-server.v390-ui-runtime-form-submit-readback.v1",
      submitted: true,
      method: action.method,
      action: action.action,
      fields: [...action.fields],
      responseStatus: formResponseIdentity.status,
      responseRequestId: formResponseIdentity.requestId,
      correlationId: formResponseIdentity.correlationId,
      authoritative: true,
    };
    const usersFile = descriptor.auth?.usersFile || "";
    const usersState = () => readUsersState(usersFile);
    const assertUsersChanged = state => assert(state.sha256 !== context.preparedUsersSha256,
      `${item.caseId} form submission did not change the authoritative users store`);
    const assertUsersUnchanged = state => assert(state.sha256 === context.preparedUsersSha256,
      `${item.caseId} rejected/session-only form changed the authoritative users store`);
    if (["UI-002", "AUTH-005", "AUTH-006"].includes(item.caseId)) {
      assert(usersFile && fs.existsSync(usersFile), `${item.caseId} setup users store was not created`);
      const state = usersState();
      assertUsersChanged(state);
      const admin = state.users.find(user => user.username === "admin");
      assert(admin?.role === "admin" && admin?.enabled === true &&
        typeof admin?.passwordHash === "string" && admin.passwordHash.length > 0,
      `${item.caseId} setup admin authoritative store readback failed`);
      const passwordRef = values.password?.secretRef;
      const password = resolveSecretRef(passwordRef, { item, field: "password", caseContext: context });
      assert(!state.raw.includes(password), `${item.caseId} setup store contains plaintext password`);
      const login = await postForm(`${httpBase}/login`, { username: "admin", password });
      assert(login.status === 302, `${item.caseId} setup admin login readback failed HTTP ${login.status}`);
      const loginCookie = cookieFromResponse(login);
      const whoami = await requestJson(`${httpBase}/auth/whoami`, { cookie: loginCookie });
      assert(whoami.status === 200 && whoami.json?.authenticated === true &&
        whoami.json?.username === "admin" && whoami.json?.role === "admin",
      `${item.caseId} setup admin principal readback mismatch`);
      const baseChecks = {
        adminStored: true,
        plaintextAbsent: true,
        adminWhoami: true,
      };
      if (item.caseId === "UI-002") {
        return {
          ...common,
          readbackKind: "setup-weak-strong-admin-store-login-whoami",
          principal: safePrincipal(whoami.json),
          usersStoreSha256: state.sha256,
          checks: {
            weakRejected: context.preFormReadback.weakPasswordStatus === 400,
            weakNoWrite: context.preFormReadback.weakPasswordNoWrite === true,
            ...baseChecks,
          },
        };
      }
      if (item.caseId === "AUTH-005") {
        const setupRoute = await requestStatus(`${httpBase}/setup`);
        const rootRoute = await requestStatus(`${httpBase}/`);
        return {
          ...common,
          readbackKind: "missing-hashless-bootstrap-to-login",
          principal: safePrincipal(whoami.json),
          usersStoreSha256: state.sha256,
          checks: {
            missingStoreGate: context.preFormReadback.missingStoreSetupRequired === true &&
              context.preFormReadback.missingLoginStatus === 302,
            hashlessStoreGate: context.preFormReadback.hashlessStoreSetupRequired === true,
            hashlessLoginDenied: context.preFormReadback.hashlessLoginStatus === 403,
            bootstrapToLogin: setupRoute.status === 302 && setupRoute.location === "/login" &&
              rootRoute.status === 302 && rootRoute.location === "/login",
            adminWhoami: true,
          },
        };
      }
      const usersApi = await requestJson(`${httpBase}/ops/api/users`, { cookie: loginCookie });
      const publicAdmin = usersApi.json?.users?.find(user => user.username === "admin");
      const ui = await inspectOpsUsersUiWithLogin(browser, {
        username: "admin",
        password,
        sectionSelector: "#users-body",
        identity: "admin",
        returnPath: "/login",
      });
      return {
        ...common,
        readbackKind: "setup-admin-policy-api-ui-readback",
        principal: safePrincipal(whoami.json),
        usersStoreSha256: state.sha256,
        checks: {
          adminAllScope: stableJson(admin.scopes) === stableJson(["*"]) &&
            stableJson(publicAdmin?.scopes) === stableJson(["*"]),
          usersApiRedacted: usersApi.status === 200 && !containsForbiddenAuthMaterial(usersApi.json),
          usersUiRedacted: ui.identityVisible && ui.forbiddenMarkersAbsent && ui.adminAllScopesVisible,
          adminWhoami: true,
        },
      };
    }
    if (["UI-003", "AUTH-004"].includes(item.caseId)) {
      const state = usersState();
      assertUsersChanged(state);
      assert(state.stableAuthSha256 === context.preparedUsersStableAuthSha256,
        `${item.caseId} login changed credential or authorization fields`);
      const principal = await observeBrowserWhoami(browser, item.caseId);
      assert(principal.status === 200 && principal.authenticated === true &&
        principal.username === values.username && principal.role === "viewer",
      `${item.caseId} login principal authoritative readback mismatch`);
      const landing = await browser.evaluate(() => location.pathname);
      const boundary = await observeBrowserRoleBoundary(browser);
      return {
        ...common,
        readbackKind: item.caseId === "UI-003"
          ? "viewer-login-role-landing"
          : "viewer-login-client-allow-ops-deny",
        principal,
        usersStoreSha256: state.sha256,
        checks: item.caseId === "UI-003" ? {
          stableAuthorization: true,
          viewerWhoami: true,
          viewerLanding: landing === "/client/live",
        } : {
          stableAuthorization: true,
          viewerWhoami: true,
          clientAllowed: boundary.clientStatus === 200,
          opsDenied: boundary.opsStatus === 403,
        },
      };
    }
    if (item.caseId === "UI-004") {
      const state = usersState();
      assertUsersChanged(state);
      const username = descriptor.auth?.usernames?.[item.accountRole] || "";
      const oldPassword = resolveSecretRef(values.currentPassword?.secretRef,
        { item, field: "currentPassword", caseContext: context });
      const newPassword = resolveSecretRef(values.password?.secretRef,
        { item, field: "password", caseContext: context });
      assert(!state.raw.includes(oldPassword) && !state.raw.includes(newPassword),
        `${item.caseId} password-change store contains plaintext auth material`);
      const oldLogin = await postForm(`${httpBase}/login`, { username, password: oldPassword });
      assert(oldLogin.status === 401, `${item.caseId} previous password remains valid`);
      const newLogin = await postForm(`${httpBase}/login`, { username, password: newPassword });
      assert(newLogin.status === 302, `${item.caseId} new password login failed HTTP ${newLogin.status}`);
      const newCookie = cookieFromResponse(newLogin);
      const whoami = await requestJson(`${httpBase}/auth/whoami`, { cookie: newCookie });
      assert(whoami.status === 200 && whoami.json?.authenticated === true &&
        whoami.json?.username === username && whoami.json?.role === item.accountRole,
      `${item.caseId} changed-password principal readback mismatch`);
      const historyReuse = await postForm(`${httpBase}/password/change`, {
        currentPassword: newPassword,
        password: oldPassword,
        confirm: oldPassword,
      }, { cookie: newCookie });
      const historyState = usersState();
      const changedUser = historyState.users.find(user => user.username === username);
      assert(historyReuse.status === 400 && Array.isArray(changedUser?.passwordHistory) &&
        changedUser.passwordHistory.length > 0,
      `${item.caseId} previous password reuse/history boundary failed`);
      return {
        ...common,
        readbackKind: "password-change-old-deny-new-history-reuse-deny",
        principal: { authenticated: true, username, role: item.accountRole },
        previousPasswordStatus: oldLogin.status,
        usersStoreSha256: historyState.sha256,
        checks: {
          oldPasswordDenied: oldLogin.status === 401,
          newPasswordAccepted: newLogin.status === 302 && whoami.status === 200,
          historyReuseDenied: historyReuse.status === 400,
          historyRotated: changedUser.passwordHistory.length > 0,
          plaintextAbsent: !historyState.raw.includes(oldPassword) && !historyState.raw.includes(newPassword),
        },
      };
    }
    if (item.caseId === "UI-005") {
      const state = usersState();
      assertUsersUnchanged(state);
      const principal = await observeBrowserWhoami(browser, item.caseId);
      assert(principal.status === 401 && principal.authenticated === false,
        `${item.caseId} logout session remains authenticated`);
      assert(originalSessionCookie, `${item.caseId} original session cookie readback missing`);
      const originalWhoami = await requestJson(`${httpBase}/auth/whoami`, { cookie: originalSessionCookie });
      const protectedRoute = await requestStatus(`${httpBase}/ops/home`, { cookie: originalSessionCookie });
      return {
        ...common,
        readbackKind: "browser-and-original-server-session-revoked",
        principal,
        usersStoreSha256: state.sha256,
        checks: {
          browserAnonymous: true,
          originalCookieRevoked: originalWhoami.status === 401 && originalWhoami.json?.authenticated === false,
          protectedRouteBlocked: protectedRoute.status === 302 && protectedRoute.location === "/login",
          storeUnchanged: true,
        },
      };
    }
    if (["UI-007", "AUTH-034"].includes(item.caseId)) {
      const state = usersState();
      assertUsersChanged(state);
      const username = `${item.caseId.toLowerCase()}-invite`;
      const user = state.users.find(candidate => candidate.username === username);
      const consumedInvite = state.invites.find(invite => invite.username === username);
      assert(user?.enabled === true && typeof user?.passwordHash === "string" && user.passwordHash.length > 0,
        `${item.caseId} invite completion user readback missing`);
      assert(consumedInvite?.used === true && typeof consumedInvite?.usedAt === "string" &&
        consumedInvite.usedAt.length > 0 && consumedInvite.tokenHash === "",
      `${item.caseId} invite consumption state readback mismatch`);
      const password = resolveSecretRef(values.password?.secretRef,
        { item, field: "password", caseContext: context });
      assert(!state.raw.includes(password), `${item.caseId} invite store contains plaintext password`);
      const login = await postForm(`${httpBase}/login`, { username, password });
      assert(login.status === 302, `${item.caseId} invited user login failed HTTP ${login.status}`);
      const whoami = await requestJson(`${httpBase}/auth/whoami`, { cookie: cookieFromResponse(login) });
      assert(whoami.status === 200 && whoami.json?.authenticated === true &&
        whoami.json?.username === username && whoami.json?.role === "viewer",
      `${item.caseId} invite principal readback mismatch`);
      const loginCookie = cookieFromResponse(login);
      const client = await requestStatus(`${httpBase}/client/api/views`, { cookie: loginCookie });
      const ops = await requestStatus(`${httpBase}/ops/api/users`, { cookie: loginCookie });
      const expectedScope = `view:read:${descriptor.auth?.defaultViewId || "9001"}`;
      return {
        ...common,
        readbackKind: "invite-consumed-viewer-scope-client-boundary",
        principal: safePrincipal(whoami.json),
        usersStoreSha256: state.sha256,
        checks: {
          beforeLoginDenied: context.preFormReadback.beforeSetupLoginStatus === 401,
          beforeClientDenied: context.preFormReadback.beforeSetupClientStatus === 401,
          inviteConsumed: true,
          viewerWhoami: true,
          viewerScope: Array.isArray(whoami.json?.scopes) && whoami.json.scopes.includes(expectedScope),
          clientAllowed: client.status === 200,
          opsDenied: ops.status === 403,
        },
      };
    }
    if (item.caseId === "AUTH-007") {
      const state = usersState();
      assert(context.preFormReadback.hashlessMutationPrepared === true &&
        state.sha256 === context.preFormReadback.hashlessUsersSha256,
      `${item.caseId} rejected hashless-admin login changed the submit-time users store`);
      const admin = state.users.find(user => user.username === "admin");
      assert(admin?.enabled === true && admin?.passwordHash === "",
        `${item.caseId} hashless-admin fixture readback drifted before verification`);
      const principal = await observeBrowserWhoami(browser, item.caseId);
      assert(principal.authenticated === false && principal.status === 200 &&
        principal.setupRequired === true,
      `${item.caseId} passwordless admin rejection authenticated a principal`);
      return {
        ...common,
        readbackKind: "empty-password-and-hashless-admin-denied",
        principal,
        usersStoreSha256: state.sha256,
        checks: {
          emptyPasswordDenied: context.preFormReadback.hashedAdminEmptyPasswordStatus === 401,
          hashlessAdminDenied: formResponseIdentity.status === 403 &&
            context.preFormReadback.hashlessAdminUsername === "admin",
          browserAnonymous: true,
          storeUnchanged: true,
        },
      };
    }
    if (item.caseId === "AUTH-035") {
      const state = usersState();
      assertUsersUnchanged(state);
      const principal = await observeBrowserWhoami(browser, item.caseId);
      assert(principal.authenticated === false && principal.status === 401,
        `${item.caseId} invalid invite authenticated a principal`);
      const expiredToken = resolveSecretRef(`${item.caseId}:expired-invite-token`, {
        item, field: "expiredInviteToken", caseContext: context,
      });
      const password = resolveSecretRef(values.password?.secretRef,
        { item, field: "password", caseContext: context });
      const expired = await postForm(`${httpBase}/invite/setup`, {
        token: expiredToken,
        password,
        confirm: password,
      });
      const afterExpired = usersState();
      assert(expired.status === 410 && afterExpired.sha256 === context.preparedUsersSha256,
        `${item.caseId} expired invite boundary changed state or missed HTTP 410`);
      return {
        ...common,
        readbackKind: "consumed-401-expired-410-no-write",
        principal,
        usersStoreSha256: afterExpired.sha256,
        checks: {
          consumedSeeded: context.preFormReadback.consumedOnceStatus === 302,
          consumedRejected: formResponseIdentity.status === 401,
          expiredSeeded: Boolean(context.preFormReadback.expiredInviteId),
          expiredRejected: expired.status === 410,
          browserAnonymous: true,
          storeUnchanged: true,
        },
      };
    }
    if (item.caseId === "AUTH-014") {
      const state = usersState();
      assertUsersChanged(state);
      const user = state.users.find(candidate => candidate.username === values.username);
      const password = resolveSecretRef(values.password?.secretRef,
        { item, field: "password", caseContext: context });
      assert(user?.role === values.role && user?.enabled === true &&
        typeof user?.passwordHash === "string" && user.passwordHash.length > 0 &&
        formResponseIdentity.productIdentity?.username === values.username,
      `${item.caseId} created user authoritative identity mismatch`);
      assert(!state.raw.includes(password), `${item.caseId} user store contains plaintext password`);
      const usersList = await requestEndpoint("GET", "/ops/api/users", null, item, context, [200], {
        roleOverride: "admin",
      });
      const listed = usersList.json?.users?.find(candidate => candidate.username === values.username);
      const ui = await observeCurrentOpsUsersUi(browser, {
        sectionSelector: "#users-body",
        identity: values.username,
      });
      return {
        ...common,
        readbackKind: "created-user-store-record",
        recordIdentity: { username: values.username, role: user.role, enabled: user.enabled },
        usersStoreSha256: state.sha256,
        checks: {
          responseIdentity: formResponseIdentity.productIdentity?.username === values.username,
          responseRedacted: formResponseIdentity.productIdentity?.persistentSecretFieldsPresent === false,
          storeIdentity: user.role === values.role && user.enabled === true,
          listIdentity: listed?.username === values.username && listed?.role === values.role,
          listRedacted: !containsForbiddenAuthMaterial(usersList.json),
          uiRedacted: ui.identityVisible && ui.forbiddenMarkersAbsent,
          plaintextAbsent: true,
        },
      };
    }
    if (["AUTH-015", "AUTH-033"].includes(item.caseId)) {
      const state = usersState();
      assertUsersChanged(state);
      const invite = state.invites.find(candidate => candidate.username === values.username);
      assert(invite?.inviteId && invite?.used === false && invite?.tokenHash &&
        Number.isFinite(Date.parse(invite?.expiresAt || "")) && Date.parse(invite.expiresAt) > Date.now() &&
        formResponseIdentity.productIdentity?.username === values.username &&
        formResponseIdentity.productIdentity?.inviteId === invite.inviteId &&
        formResponseIdentity.productIdentity?.tokenPresent === true &&
        formResponseIdentity.productIdentity?.setupUrlTokenBound === true,
      `${item.caseId} created invite authoritative identity mismatch`);
      const issuedToken = resolveSecretRef(`${item.caseId}:issued-invite-token`, {
        item, field: "issuedInviteToken", caseContext: context,
      });
      assert(!state.raw.includes(issuedToken) && invite.tokenHash !== issuedToken,
        `${item.caseId} raw issued invite token reached the authoritative store`);
      const inviteList = await requestEndpoint("GET", "/ops/api/invites", null, item, context, [200], {
        roleOverride: "admin",
      });
      const listed = inviteList.json?.invites?.find(candidate => candidate.inviteId === invite.inviteId);
      const serializedList = JSON.stringify(inviteList.json || {});
      const ui = await observeCurrentOpsUsersUi(browser, {
        sectionSelector: "#invite-list-body",
        identity: values.username,
        forbiddenSecret: issuedToken,
      });
      const checks = {
        responseTokenBound: formResponseIdentity.productIdentity?.tokenPresent === true &&
          formResponseIdentity.productIdentity?.setupUrlTokenBound === true,
        issuedTokenRegistered: Boolean(issuedToken),
        storeHasHashOnly: Boolean(invite.tokenHash) && !state.raw.includes(issuedToken),
        listIdentity: listed?.inviteId === invite.inviteId && listed?.username === values.username,
        listRedacted: !serializedList.includes(issuedToken) && !containsForbiddenAuthMaterial(inviteList.json) &&
          !objectHasAnyKey(inviteList.json, new Set(["token", "setupUrl"])),
        uiRedacted: ui.identityVisible && ui.forbiddenMarkersAbsent && ui.forbiddenSecretAbsent,
      };
      if (item.caseId === "AUTH-033") checks.inviteCreatedStatus =
        formResponseIdentity.productIdentity?.status === "inviteCreated";
      return {
        ...common,
        readbackKind: "created-invite-store-record",
        recordIdentity: { username: values.username, inviteId: invite.inviteId, status: "pending" },
        usersStoreSha256: state.sha256,
        checks,
      };
    }
    if (["UI-008", "AUTH-036"].includes(item.caseId)) {
      const state = usersState();
      assertUsersChanged(state);
      const request = state.accessRequests.find(candidate => candidate.username === values.username);
      assert(request?.requestId && request?.status === "pending" &&
        formResponseIdentity.productIdentity?.username === values.username &&
        formResponseIdentity.productIdentity?.requestId === request.requestId,
      `${item.caseId} access request authoritative identity mismatch`);
      const accessList = await requestEndpoint("GET", "/ops/api/access-requests", null, item, context, [200], {
        roleOverride: "admin",
      });
      const listed = accessList.json?.accessRequests?.find(candidate => candidate.requestId === request.requestId);
      const user = state.users.find(candidate => candidate.username === values.username);
      const invite = state.invites.find(candidate => candidate.username === values.username);
      const pendingPassword = resolveSecretRef(`${item.caseId}:fixture-password`, {
        item, field: "pendingLoginPassword", caseContext: context,
      });
      const pendingLogin = await postForm(`${httpBase}/login`, {
        username: values.username,
        password: pendingPassword,
      });
      const adminPassword = roleSecrets.roles?.admin || "";
      const ui = await inspectOpsUsersUiWithLogin(browser, {
        username: descriptor.auth?.usernames?.admin || "admin",
        password: adminPassword,
        sectionSelector: "#access-requests-body",
        identity: values.username,
        returnPath: "/client/request-access",
      });
      return {
        ...common,
        readbackKind: "created-access-request-store-record",
        recordIdentity: { username: values.username, requestId: request.requestId, status: request.status },
        usersStoreSha256: state.sha256,
        checks: {
          responsePending: formResponseIdentity.productIdentity?.status === "pending" &&
            formResponseIdentity.productIdentity?.requestId === request.requestId,
          storePending: request.status === "pending",
          listPending: listed?.status === "pending" && listed?.username === values.username,
          noUserOrInvite: !user && !invite,
          pendingLoginDenied: pendingLogin.status === 401,
          uiPending: ui.identityVisible && ui.pendingVisible,
        },
      };
    }
    throw new Error(`${item.caseId} form authoritative readback adapter is unavailable`);
  }

  async function requestEndpoint(
    method,
    endpoint,
    payload,
    item,
    context,
    allowedStatuses,
    { freshRole = false, roleOverride = "" } = {},
  ) {
    const role = roleOverride || actionRoleFor(item) || item.accountRole;
    const statePath = freshRole
      ? await freshRoleStorageState(role, `${item.caseId}-fresh-authoritative-readback`)
      : context.actionRoleStatePaths[role] || context.primaryRoleStatePath ||
        await freshRoleStorageState(role, `${item.caseId}-api`);
    const cookie = statePath ? cookieHeaderFromStorageState(statePath) : "";
    const response = await fetch(`${httpBase}${endpoint}`, {
      method,
      redirect: "manual",
      headers: {
        ...(cookie ? { Cookie: cookie } : {}),
        ...(payload !== null ? { "Content-Type": "application/json" } : {}),
      },
      ...(payload !== null ? { body: JSON.stringify(payload) } : {}),
    });
    const text = await response.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = null; }
    if (!allowedStatuses.includes(response.status)) {
      throw new Error(`${item.caseId} runtime ${method} ${endpoint} failed HTTP ${response.status}: ${text.slice(0, 160)}`);
    }
    return { status: response.status, json, text };
  }

  async function requestFixtureScopedViewerReadback(
    method,
    endpoint,
    item,
    context,
    allowedStatuses,
  ) {
    assert(["SRC-010", "SRC-019"].includes(item.caseId),
      `${item.caseId} fixture-scoped viewer readback is not allowed`);
    const usersFile = descriptor.auth?.usersFile || "";
    const username = descriptor.auth?.usernames?.viewer || "";
    const password = roleSecrets.roles?.viewer || "";
    assert(usersFile && fs.existsSync(usersFile) && username && password,
      `${item.caseId} fixture-scoped viewer identity is unavailable`);
    const snapshots = snapshotStateFiles([usersFile]);
    const scopes = fixtureViewerScopes(context.fixtureId);
    return runAuthoritativeReadbackWithSnapshotRestore({
      snapshots,
      label: `${item.caseId} fixture-scoped viewer readback`,
      readback: async () => {
        let cookie = "";
        try {
          scopeRuntimeViewerToView(context.fixtureId);
          const scopedStore = JSON.parse(fs.readFileSync(usersFile, "utf8"));
          const scopedViewer = (scopedStore.users || []).find(user => user.username === username);
          assert(scopedViewer?.viewId === context.fixtureId &&
            scopes.every(scope => scopedViewer.scopes?.includes(scope)),
          `${item.caseId} fixture-scoped viewer assignment mismatch`);

          const login = await postForm(`${httpBase}/login`, { username, password });
          assert(login.status === 302,
            `${item.caseId} fixture-scoped viewer fresh login failed HTTP ${login.status}`);
          cookie = cookieFromResponse(login);
          const principal = await requestJson(`${httpBase}/auth/whoami`, { cookie });
          assert(principal.status === 200 && principal.json?.authenticated === true &&
            principal.json?.username === username && principal.json?.role === "viewer" &&
            scopes.every(scope => principal.json?.scopes?.includes(scope)),
          `${item.caseId} fixture-scoped viewer principal readback mismatch`);

          const response = await fetch(`${httpBase}${endpoint}`, {
            method,
            redirect: "manual",
            headers: { Cookie: cookie },
          });
          const text = await response.text();
          let json = null;
          try { json = text ? JSON.parse(text) : null; } catch { json = null; }
          if (!allowedStatuses.includes(response.status)) {
            throw new Error(
              `${item.caseId} runtime ${method} ${endpoint} failed HTTP ${response.status}: ${text.slice(0, 160)}`,
            );
          }
          return {
            status: response.status,
            json,
            text,
            viewerScopeBinding: {
              viewId: context.fixtureId,
              scopes: [...scopes],
              freshLogin: true,
              operatorOrAdminBypass: false,
            },
          };
        } finally {
          if (cookie) {
            await postForm(`${httpBase}/logout`, {}, { cookie }).catch(() => {});
          }
        }
      },
    });
  }

  async function createAuthUser(username, role, password, viewId) {
    const admin = await adminCookie();
    const response = await fetch(`${httpBase}/ops/api/users`, {
      method: "POST", redirect: "manual",
      headers: { Cookie: admin, "Content-Type": "application/json" },
      body: JSON.stringify({ username, displayName: username, role, viewId, password, enabled: true, mustChangePassword: false }),
    });
    const text = await response.text();
    let error = "";
    try {
      const payload = text ? JSON.parse(text) : null;
      error = String(payload?.error || payload?.message || "");
    } catch {}
    assert([200, 201, 409].includes(response.status),
      `runtime user seed failed HTTP ${response.status}${error ? `: ${error}` : ""}`);
  }

  async function createInvite(username, viewId) {
    const admin = await adminCookie();
    const response = await fetch(`${httpBase}/ops/api/invites`, {
      method: "POST", redirect: "manual",
      headers: { Cookie: admin, "Content-Type": "application/json" },
      body: JSON.stringify({ username, displayName: username, role: "viewer", viewId, ttlSeconds: 3600 }),
    });
    const json = await response.json();
    assert([200, 201].includes(response.status), `runtime invite seed failed HTTP ${response.status}`);
    return json;
  }

  async function adminCookie() {
    const username = descriptor.auth?.usernames?.admin;
    const password = roleSecrets.roles?.admin;
    const response = await postForm(`${httpBase}/login`, { username, password });
    assert(response.status === 302, `runtime admin login failed HTTP ${response.status}`);
    return cookieFromResponse(response);
  }
}

export function fixtureViewerScopes(fixtureId) {
  const value = String(fixtureId || "");
  assert(/^[0-9]+$/.test(value), "fixture-scoped viewer viewId must be numeric");
  return [
    `view:read:${value}`,
    `dashboard:read:${value}`,
    `event:read:${value}`,
    `metadata:read:${value}`,
  ];
}

export async function runAuthoritativeReadbackWithSnapshotRestore({
  snapshots,
  readback,
  label = "authoritative readback",
} = {}) {
  assert(Array.isArray(snapshots), `${label} snapshots are missing`);
  assert(typeof readback === "function", `${label} callback is missing`);
  let result;
  let readbackFailure = null;
  try {
    result = await readback();
  } catch (error) {
    readbackFailure = error instanceof Error ? error : new Error(String(error));
  }

  let restorationFailure = null;
  try {
    restoreStateFiles(snapshots);
    assert(stateFilesEqual(snapshots), `${label} authoritative state restoration failed`);
  } catch (error) {
    restorationFailure = error instanceof Error ? error : new Error(String(error));
  }
  if (restorationFailure) {
    if (readbackFailure) restorationFailure.cause = readbackFailure;
    throw restorationFailure;
  }
  if (readbackFailure) throw readbackFailure;
  return result;
}

export function assertAuthFixtureAbsentFromUsersFile(usersFile, username) {
  const state = readUsersState(usersFile);
  assert(!state.users.some(user => String(user?.username || "") === String(username || "")),
    `auth fixture remains in the authoritative users file: ${username}`);
  return true;
}

function validateUnifiedWorkspaceCaseReadback(caseId, { workspace, detail, sourceId }) {
  assert(workspace?.schema === "media-server.ops.v320-unified-events-workspace.v1" &&
    workspace?.status === "ops-v320-unified-events-workspace" &&
    workspace?.opsOnly === true &&
    detail?.eventId === `${caseId.toLowerCase()}-review4-fixture`,
  `${caseId} transient unified workspace fixture is missing from the authoritative API readback`);
  const commonBoundary = value => value?.opsOnly === true &&
    value?.viewerClientExposureAdded === false &&
    value?.sourceUrlExposed === false &&
    value?.rawJsonExposed === false &&
    value?.debugMaterialExposed === false;
  if (caseId === "UI-064") {
    const value = detail.sourceReliability;
    const summary = workspace.sourceReliabilitySummary;
    assert(value?.schema === "media-server.ops.v320-source-reliability-context.v1" &&
      value?.sourceId === sourceId &&
      typeof value?.sourceHealthStatus === "string" && value.sourceHealthStatus &&
      value.sourceHealthStatus !== "source-missing" &&
      typeof value?.recentFailureContext === "string" && value.recentFailureContext &&
      typeof value?.operatorRecheckHint === "string" && value.operatorRecheckHint &&
      value?.operatorRecheckRoute === "/ops/api/source-health" &&
      value?.sourceRegistryWritePerformed === false &&
      value?.eventPostPayloadChanged === false &&
      value?.webrtcDataChannelSchemaChanged === false &&
      value?.sseMetadataSchemaChanged === false &&
      value?.wsMetadataSchemaChanged === false &&
      value?.rtspOrWebrtcMediaPathChanged === false &&
      value?.ruleProfilePayloadChanged === false &&
      commonBoundary(value) &&
      summary?.schema === "media-server.ops.v320-source-reliability-context.v1" &&
      summary?.itemCount >= 1 &&
      summary?.sourceRegistryWritePerformed === false &&
      commonBoundary(summary),
    `${caseId} transient source reliability context is missing from the authoritative API readback`);
  } else if (caseId === "UI-065") {
    const value = detail.aiReviewQuality;
    const summary = workspace.aiReviewQualitySummary;
    assert(workspace?.aiReviewQualityContextImplemented === true &&
      value?.schema === "media-server.ops.v320-ai-review-quality-context.v1" &&
      value?.correctionReviewSignal === "evidence-uncertain" &&
      value?.uncertaintyReason === "low-evidence-confidence" &&
      value?.qualityBadge === "uncertain" &&
      value?.qualityScore === 35 &&
      Array.isArray(value?.signals) && value.signals.includes("low-evidence-confidence") &&
      value?.runtimeProviderCallPerformed === false &&
      value?.rawProviderMaterialExposed === false &&
      value?.eventPostPayloadChanged === false &&
      value?.rtspOrWebrtcMediaPathChanged === false &&
      commonBoundary(value) &&
      summary?.schema === "media-server.ops.v320-ai-review-quality-context.v1" &&
      summary?.itemCount >= 1 &&
      summary?.runtimeProviderCallPerformed === false &&
      summary?.rawProviderMaterialExposed === false &&
      commonBoundary(summary),
    `${caseId} transient AI review quality context is missing from the authoritative API readback`);
  } else if (caseId === "UI-066") {
    const value = detail.operatorResolutionFlow;
    assert(value?.schema === "media-server.ops.v320-operator-resolution-flow.v1" &&
      typeof value?.assignmentTarget === "string" && value.assignmentTarget &&
      typeof value?.assignmentFlowStatus === "string" && value.assignmentFlowStatus &&
      value?.auditTrailRequired === true && value?.auditTrailReady === true &&
      Array.isArray(value?.auditActions) && value.auditActions.length >= 1 &&
      value?.operatorResolutionFlowWritePath === "/ops/api/events/reviews/{eventId}" &&
      value?.autoActionApplied === false &&
      value?.eventPostPayloadChanged === false &&
      value?.rtspOrWebrtcMediaPathChanged === false &&
      commonBoundary(value),
    `${caseId} transient operator resolution flow is missing from the authoritative API readback`);
  } else if (caseId === "UI-067") {
    const value = detail.actionReadinessChecklist;
    assert(value?.schema === "media-server.ops.v320-action-readiness-checklist.v1" &&
      typeof value?.readinessStatus === "string" && value.readinessStatus &&
      Array.isArray(value?.readinessBlockers) && value.readinessBlockers.length >= 1 &&
      Array.isArray(value?.checklistItems) && value.checklistItems.length >= 1 &&
      value?.ruleDraftRoute === "/ops/rules" &&
      value?.notificationDryRunRoute === "/ops/api/alerts/deliveries/dry-run" &&
      value?.manualApprovalRequired === true &&
      value?.autoActionApplied === false &&
      value?.autoActionWritePerformed === false &&
      value?.externalDeliveryPerformed === false &&
      value?.ruleDraftCreated === false &&
      value?.notificationSent === false &&
      value?.eventPostPayloadChanged === false &&
      value?.rtspOrWebrtcMediaPathChanged === false &&
      commonBoundary(value),
    `${caseId} transient action readiness checklist is missing from the authoritative API readback`);
  } else if (caseId === "UI-069") {
    const value = workspace.resolutionSearchMetricsSummary;
    assert(value?.schema === "media-server.ops.v320-resolution-search-metrics.v1" &&
      value?.itemCount >= 1 &&
      Array.isArray(value?.savedViews) && value.savedViews.length >= 1 &&
      value?.operationsMetricSummary?.matchedQueueCount >= 1 &&
      value?.savedViewsPersisted === false &&
      value?.savedViewWritePerformed === false &&
      value?.operationsMetricSummary?.metricWritePerformed === false &&
      value?.clientDigestChanged === false &&
      value?.eventPostPayloadChanged === false &&
      value?.rtspOrWebrtcMediaPathChanged === false &&
      commonBoundary(value),
    `${caseId} transient resolution search metrics is missing from the authoritative API readback`);
  } else if (caseId === "UI-070") {
    const value = detail.incidentSourceCorrelation;
    assert(value?.schema === "media-server.ops.v330-incident-source-correlation.v1" &&
      value?.eventId === detail.eventId && value?.sourceId === sourceId &&
      typeof value?.sourceCauseCategory === "string" && value.sourceCauseCategory &&
      typeof value?.resolutionClosureImpact === "string" && value.resolutionClosureImpact &&
      value?.sourceAuditRoute?.startsWith("/ops/sources#") &&
      value?.sourceRecheckRoute === "/ops/api/source-health" &&
      value?.resolutionDetailAttached === true &&
      value?.sourceReliabilityContextReused === true &&
      value?.sourceHealthAuditLinked === true &&
      value?.sourceRegistryWritePerformed === false &&
      value?.publishedViewWritePerformed === false &&
      value?.eventRecordWritePerformed === false &&
      value?.eventPostPayloadChanged === false &&
      value?.rtspOrWebrtcMediaPathChanged === false &&
      commonBoundary(value),
    `${caseId} transient incident source correlation is missing from the authoritative API readback`);
  } else if (caseId === "UI-071") {
    const value = detail.operatorRecheckRecoveryQueue;
    assert(value?.schema === "media-server.ops.v330-operator-recheck-recovery-queue.v1" &&
      value?.eventId === detail.eventId && value?.sourceId === sourceId &&
      value?.failedOnlyRecheck === true &&
      Array.isArray(value?.recoveryChecklist) && value.recoveryChecklist.length >= 1 &&
      value?.operatorNoteRoute === "/ops/api/events/reviews/{eventId}" &&
      value?.sourceRecheckRoute === "/ops/api/source-health" &&
      value?.operatorNoteLinked === true &&
      value?.recoveryQueueReadModelCreated === true &&
      value?.persistentRecoveryQueueCreated === false &&
      value?.recoveryQueueWritePerformed === false &&
      value?.sourceRegistryWritePerformed === false &&
      value?.eventRecordWritePerformed === false &&
      value?.autoRecoveryApplied === false &&
      value?.externalRecoveryPerformed === false &&
      value?.eventPostPayloadChanged === false &&
      value?.rtspOrWebrtcMediaPathChanged === false &&
      value?.viewerClientExposureAdded === false &&
      value?.sourceUrlExposed === false &&
      value?.rawJsonExposed === false &&
      value?.debugMaterialExposed === false,
    `${caseId} transient operator recheck recovery queue is missing from the authoritative API readback`);
  } else if (caseId === "UI-080") {
    const value = detail.incidentCommandHandoff;
    const summary = workspace.incidentCommandHandoffSummary;
    const boundary = value?.boundaries;
    assert(workspace?.incidentCommandHandoffImplemented === true &&
      value?.schema === "media-server.ops.v350-incident-command-handoff.v1" &&
      value?.eventId === detail.eventId && value?.sourceId === sourceId &&
      typeof value?.sourceCause === "string" && value.sourceCause &&
      typeof value?.continuityDrillCandidate === "string" && value.continuityDrillCandidate &&
      value?.commandPlanDraft === "/ops/api/live-operations/command-plan" &&
      typeof value?.operatorNextAction === "string" && value.operatorNextAction &&
      boundary?.opsOnly === true && boundary?.readOnly === true && boundary?.draftOnly === true &&
      boundary?.operatorApprovalRequired === true && boundary?.commandPlanExecuted === false &&
      boundary?.sourceRecheckExecuted === false && boundary?.recoveryExecuted === false &&
      boundary?.clientNoticeSent === false && boundary?.ruleFollowUpApplied === false &&
      boundary?.sourceRegistryWritePerformed === false && boundary?.publishedViewWritePerformed === false &&
      boundary?.ruleRegistryWritePerformed === false && boundary?.eventRecordWritePerformed === false &&
      boundary?.opsAuditWritePerformed === false && boundary?.viewerClientExposureAdded === false &&
      boundary?.rawLocatorExposedToClient === false && boundary?.credentialMaterialExposed === false &&
      boundary?.rawDiagnosticJsonIncluded === false && boundary?.eventRecordSchemaChanged === false &&
      boundary?.eventPostPayloadChanged === false && boundary?.webrtcDataChannelSchemaChanged === false &&
      boundary?.sseMetadataSchemaChanged === false && boundary?.wsMetadataSchemaChanged === false &&
      boundary?.rtspOrWebrtcMediaPathChanged === false && boundary?.ruleProfilePayloadChanged === false &&
      summary?.schema === "media-server.ops.v350-incident-command-handoff.v1" &&
      summary?.itemCount >= 1 && summary?.viewerClientExposureAdded === false &&
      summary?.sourceRegistryWritePerformed === false && summary?.eventRecordWritePerformed === false,
    `${caseId} transient incident command handoff is missing from the authoritative API readback`);
  } else {
    throw new Error(`${caseId} unsupported unified workspace runtime readback`);
  }
  return { itemCount: workspace.itemCount };
}

async function validateOpsSourcesReadback(caseId, requestEndpoint, item, context) {
  const read = async route => requestEndpoint("GET", route, null, item, context, [200]);
  const commonBoundary = value => value?.opsOnly === true && value?.readOnly === true &&
    value?.sourceRegistryWritePerformed === false && value?.publishedViewWritePerformed === false &&
    value?.automaticRecoveryPerformed === false && value?.viewerClientExposureAdded === false &&
    value?.rawLocatorExposedToClient === false && value?.credentialMaterialExposed === false &&
    value?.eventRecordSchemaChanged === false && value?.eventPostPayloadChanged === false &&
    value?.webrtcDataChannelSchemaChanged === false && value?.sseMetadataSchemaChanged === false &&
    value?.wsMetadataSchemaChanged === false && value?.rtspOrWebrtcMediaPathChanged === false &&
    value?.ruleProfilePayloadChanged === false;
  if (caseId === "UI-073") {
    const response = await read("/ops/api/source-registry/reliability-search-metrics");
    const value = response.json;
    assert(value?.ok === true && value?.schema === "media-server.ops.v330-source-reliability-search-metrics.v1" &&
      Array.isArray(value?.sourceHealthFilters) && value.sourceHealthFilters.length >= 1 &&
      Array.isArray(value?.savedReliabilityViews) && value.savedReliabilityViews.length >= 1 &&
      Array.isArray(value?.sourceReliabilitySearchResults) && value.sourceReliabilitySearchResults.length >= 1 &&
      value?.sourceReliabilitySearchMetricsSummary?.sourceCount >= 1 &&
      value?.boundaries?.savedViewsPersisted === false && value?.boundaries?.savedViewWritePerformed === false &&
      commonBoundary(value?.boundaries),
    `${caseId} source reliability search metrics are missing from the authoritative API readback`);
    return { status: response.status, matchedFixture: true, itemCount: value.sourceReliabilitySearchResults.length };
  }
  if (caseId === "UI-074") {
    const response = await read("/ops/api/source-registry/backup-recovery-handoff");
    const value = response.json;
    assert(value?.ok === true && value?.schema === "media-server.ops.v330-backup-recovery-source-handoff.v1" &&
      Array.isArray(value?.sourceHandoffInputs) && value.sourceHandoffInputs.length >= 1 &&
      Array.isArray(value?.recoveryValidationPlan) && value.recoveryValidationPlan.length >= 1 &&
      value?.backupRecoverySourceHandoffSummary?.sourceCount >= 1 &&
      value?.boundaries?.sourceHealthSnapshotPersisted === false &&
      value?.boundaries?.recoveryValidationPlanPersisted === false &&
      value?.boundaries?.realBackupPerformed === false && value?.boundaries?.productionRestorePerformed === false &&
      commonBoundary(value?.boundaries),
    `${caseId} backup recovery source handoff is missing from the authoritative API readback`);
    return { status: response.status, matchedFixture: true, itemCount: value.sourceHandoffInputs.length };
  }
  const [contractResponse, packageResponse, driftResponse] = await Promise.all([
    read("/ops/api/source-registry/continuity-drill/contract"),
    read("/ops/api/source-registry/recovery-candidate-package"),
    read("/ops/api/source-registry/source-health-replay-drift-diff"),
  ]);
  const contract = contractResponse.json;
  const candidatePackage = packageResponse.json;
  const drift = driftResponse.json;
  assert(contract?.ok === true && contract?.schema === "media-server.ops.v340-continuity-drill-contract.v1" &&
    Array.isArray(contract?.v330HandoffInputs) && contract.v330HandoffInputs.length >= 1 &&
    contract?.drillBoundaries?.noWrite === true && contract?.drillBoundaries?.noSecret === true &&
    commonBoundary(contract?.drillBoundaries) &&
    candidatePackage?.ok === true && candidatePackage?.schema === "media-server.ops.v340-recovery-candidate-package.v1" &&
    Array.isArray(candidatePackage?.recoveryCandidates) && candidatePackage.recoveryCandidates.length >= 1 &&
    candidatePackage?.recoveryCandidatePackageSummary?.candidateCount >= 1 &&
    candidatePackage?.redactionPolicy?.sourceLocatorIncluded === false &&
    candidatePackage?.redactionPolicy?.credentialMaterialIncluded === false &&
    commonBoundary(candidatePackage?.boundaries) &&
    drift?.ok === true && drift?.schema === "media-server.ops.v340-source-health-replay-drift-diff.v1" &&
    Array.isArray(drift?.sourceHealthReplayDriftItems) && drift.sourceHealthReplayDriftItems.length >= 1 &&
    drift?.sourceHealthReplayDriftDiffSummary?.sourceCount >= 1 && commonBoundary(drift?.boundaries),
  `${caseId} continuity drill workspace inputs are missing from the authoritative API readback`);
  return {
    status: [contractResponse.status, packageResponse.status, driftResponse.status].join("/"),
    matchedFixture: true,
    itemCount: candidatePackage.recoveryCandidates.length,
  };
}

async function validateV360SimulationReadback(caseId, requestEndpoint, item, context) {
  const read = async route => requestEndpoint("GET", route, null, item, context, [200]);
  const noMutationBoundary = boundary => boundary?.opsOnly === true && boundary?.readOnly === true &&
    boundary?.sourceRegistryWritePerformed === false && boundary?.publishedViewWritePerformed === false &&
    boundary?.ruleRegistryWritePerformed === false && boundary?.eventRecordWritePerformed === false &&
    boundary?.opsAuditWritePerformed === false && boundary?.clientNoticeSent === false &&
    boundary?.eventPostPayloadChanged === false && boundary?.eventRecordSchemaChanged === false &&
    boundary?.webrtcDataChannelSchemaChanged === false && boundary?.sseMetadataSchemaChanged === false &&
    boundary?.wsMetadataSchemaChanged === false && boundary?.rtspOrWebrtcMediaPathChanged === false &&
    boundary?.ruleProfilePayloadChanged === false;

  if (caseId === "UI-089") {
    const response = await read("/ops/api/live-operations/simulation/run-ledger");
    const value = response.json;
    assert(value?.ok === true && value?.schema === "media-server.ops.v360-simulation-run-ledger.v1" &&
      Array.isArray(value?.simulationRunLedgerEntries) && value.simulationRunLedgerEntries.length >= 1 &&
      value.simulationRunLedgerEntries.some(entry => typeof entry?.simulationRunId === "string" &&
        entry.simulationRunId && typeof entry?.inputRef === "string" && entry.inputRef &&
        typeof entry?.resultDiff === "string" && entry.resultDiff &&
        typeof entry?.operatorNote === "string" && entry.operatorNote && entry?.readOnly === true) &&
      value?.simulationRunLedgerSummary?.runCount >= 1 &&
      value?.boundaries?.appendOnlyLedgerProjection === true &&
      value?.boundaries?.simulationRunPersisted === false &&
      value?.boundaries?.simulationRunExecuted === false &&
      value?.boundaries?.operatorNoteWritePerformed === false &&
      value?.boundaries?.resultDiffPersisted === false && noMutationBoundary(value?.boundaries),
    `${caseId} simulation run ledger is missing from the authoritative API readback`);
    return { status: response.status, matchedFixture: true, itemCount: value.simulationRunLedgerEntries.length };
  }

  if (caseId === "UI-090") {
    const response = await read("/ops/api/live-operations/simulation/client-notice-preview");
    const value = response.json;
    assert(value?.ok === true && value?.schema === "media-server.ops.v360-client-notice-preview.v1" &&
      value?.viewerSafeClientNoticePreview === true &&
      Array.isArray(value?.clientNoticePreviewItems) && value.clientNoticePreviewItems.length >= 1 &&
      value.clientNoticePreviewItems.every(entry => entry?.viewerSafe === true &&
        entry?.deliveryState === "preview-only" && typeof entry?.noticeStatus === "string" &&
        entry.noticeStatus && typeof entry?.viewerSafeTitle === "string" && entry.viewerSafeTitle) &&
      value?.deliveryPolicy?.deliveryState === "preview-only" && value?.deliveryPolicy?.actualSend === "not-run" &&
      value?.boundaries?.viewerSafe === true && value?.boundaries?.previewOnly === true &&
      value?.boundaries?.clientNoticePersisted === false &&
      value?.boundaries?.viewerClientPayloadChanged === false &&
      value?.boundaries?.sourceUrlIncluded === false && value?.boundaries?.rawLocatorIncluded === false &&
      value?.boundaries?.rawJsonIncluded === false && value?.boundaries?.debugMaterialIncluded === false &&
      value?.boundaries?.credentialMaterialIncluded === false &&
      value?.boundaries?.sourceRegistryWritePerformed === false &&
      value?.boundaries?.publishedViewWritePerformed === false &&
      value?.boundaries?.eventRecordWritePerformed === false &&
      value?.boundaries?.opsAuditWritePerformed === false &&
      value?.boundaries?.eventPostPayloadChanged === false &&
      value?.boundaries?.eventRecordSchemaChanged === false &&
      value?.boundaries?.webrtcDataChannelSchemaChanged === false &&
      value?.boundaries?.sseMetadataSchemaChanged === false &&
      value?.boundaries?.wsMetadataSchemaChanged === false &&
      value?.boundaries?.rtspOrWebrtcMediaPathChanged === false &&
      value?.boundaries?.ruleProfilePayloadChanged === false,
    `${caseId} client notice preview is missing from the authoritative API readback`);
    return { status: response.status, matchedFixture: true, itemCount: value.clientNoticePreviewItems.length };
  }

  if (caseId === "UI-091") {
    const response = await read("/ops/api/live-operations/simulation/rule-va-what-if-replay-pack");
    const value = response.json;
    assert(value?.ok === true && value?.schema === "media-server.ops.v360-rule-va-what-if-replay-pack.v1" &&
      value?.replayPolicy?.whatIfOnly === true &&
      Array.isArray(value?.whatIfReplayCandidates) && value.whatIfReplayCandidates.length >= 1 &&
      value.whatIfReplayCandidates.every(entry => entry?.readOnly === true &&
        typeof entry?.ruleThresholdCandidate === "string" && entry.ruleThresholdCandidate &&
        typeof entry?.presetCandidate === "string" && entry.presetCandidate &&
        typeof entry?.scenarioCandidate === "string" && entry.scenarioCandidate &&
        typeof entry?.eventRecordRef === "string" && entry.eventRecordRef &&
        typeof entry?.whatIfResultDelta === "string" && entry.whatIfResultDelta) &&
      value?.boundaries?.whatIfOnly === true && value?.boundaries?.ruleThresholdApplied === false &&
      value?.boundaries?.presetApplied === false && value?.boundaries?.scenarioApplied === false &&
      value?.boundaries?.viewerClientExposureAdded === false &&
      value?.boundaries?.rawDiagnosticJsonIncluded === false &&
      value?.boundaries?.ruleRegistryWritePerformed === false &&
      value?.boundaries?.eventRecordWritePerformed === false &&
      value?.boundaries?.eventPostPayloadChanged === false &&
      value?.boundaries?.eventRecordSchemaChanged === false &&
      value?.boundaries?.webrtcDataChannelSchemaChanged === false &&
      value?.boundaries?.sseMetadataSchemaChanged === false &&
      value?.boundaries?.wsMetadataSchemaChanged === false &&
      value?.boundaries?.rtspOrWebrtcMediaPathChanged === false &&
      value?.boundaries?.clientNoticeSent === false,
    `${caseId} Rule/VA what-if replay pack is missing from the authoritative API readback`);
    return { status: response.status, matchedFixture: true, itemCount: value.whatIfReplayCandidates.length };
  }

  const routes = [
    "/ops/api/live-operations/simulation/input-pack",
    "/ops/api/live-operations/simulation/run-contract",
    "/ops/api/live-operations/simulation/command-plan-dry-run",
    "/ops/api/live-operations/simulation/impact-diff",
    "/ops/api/live-operations/simulation/safe-apply-readiness",
  ];
  const responses = await Promise.all(routes.map(read));
  const [inputPack, runContract, dryRun, impactDiff, readiness] = responses.map(response => response.json);
  assert(inputPack?.ok === true && inputPack?.schema === "media-server.ops.v360-simulation-input-pack.v1" &&
    Array.isArray(inputPack?.simulationInputPackItems) && inputPack.simulationInputPackItems.length >= 1 &&
    inputPack?.boundaries?.readOnly === true &&
    runContract?.ok === true && runContract?.schema === "media-server.ops.v360-simulation-run-contract.v1" &&
    Array.isArray(runContract?.simulationRunSchema?.simulationRouteFamily) &&
    runContract.simulationRunSchema.simulationRouteFamily.length >= routes.length &&
    runContract?.simulationResultEnvelope?.resultStatus === "not-run" &&
    runContract?.boundaries?.simulationRunExecuted === false &&
    dryRun?.ok === true && dryRun?.schema === "media-server.ops.v360-command-plan-dry-run.v1" &&
    Array.isArray(dryRun?.commandPlanDryRunResults) && dryRun.commandPlanDryRunResults.length >= 1 &&
    dryRun?.boundaries?.commandPlanExecuted === false &&
    impactDiff?.ok === true && impactDiff?.schema === "media-server.ops.v360-source-rule-impact-diff.v1" &&
    Array.isArray(impactDiff?.sourceRuleImpactDiffs) && impactDiff.sourceRuleImpactDiffs.length >= 1 &&
    impactDiff?.boundaries?.sourceChangeApplied === false &&
    readiness?.ok === true && readiness?.schema === "media-server.ops.v360-safe-apply-readiness.v1" &&
    Array.isArray(readiness?.safeApplyReadinessItems) && readiness.safeApplyReadinessItems.length >= 1 &&
    readiness?.boundaries?.safeApplyPerformed === false && readiness?.boundaries?.clientNoticeSent === false,
  `${caseId} simulation workspace core read models are missing from the authoritative API readback`);
  return {
    status: responses.map(response => response.status).join("/"),
    matchedFixture: true,
    itemCount: inputPack.simulationInputPackItems.length + dryRun.commandPlanDryRunResults.length +
      impactDiff.sourceRuleImpactDiffs.length + readiness.safeApplyReadinessItems.length,
  };
}

async function validateV390Ui092To105Readback(
  caseId,
  requestEndpoint,
  item,
  context,
  descriptor,
) {
  const read = async route => requestEndpoint("GET", route, null, item, context, [200]);
  const assertBoundary = (value, { truthy = [], falsy = [] }, label) => {
    for (const field of truthy) {
      assert(value?.boundaries?.[field] === true, `${caseId} ${label} boundary ${field}=true missing`);
    }
    for (const field of falsy) {
      assert(value?.boundaries?.[field] === false, `${caseId} ${label} boundary ${field}=false missing`);
    }
  };
  const assertModel = (value, schema, arrayField, boundary, label) => {
    assert(value?.ok === true && value?.schema === schema &&
      Array.isArray(value?.[arrayField]) && value[arrayField].length >= 1,
    `${caseId} ${label} schema or non-empty read model is missing`);
    assertBoundary(value, boundary, label);
    return value[arrayField].length;
  };
  const protocolFalse = [
    "eventPostPayloadChanged",
    "webrtcDataChannelSchemaChanged",
    "sseMetadataSchemaChanged",
    "wsMetadataSchemaChanged",
    "rtspOrWebrtcMediaPathChanged",
  ];

  const singleModels = {
    "UI-092": {
      route: "/ops/api/live-operations/simulation/export-bundle",
      schema: "media-server.ops.v360-simulation-export-bundle.v1",
      array: "simulationExportBundleItems",
      truthy: ["readOnly", "releaseSafe", "redacted"],
      falsy: ["artifactExportExecuted", "bundlePersisted", "fileWritePerformed", "handoffWritePerformed", "simulationRunPersisted", "simulationRunExecuted", "clientNoticeSent", ...protocolFalse],
    },
    "UI-093": {
      route: "/ops/api/live-operations/simulation/field-evidence-adapter",
      schema: "media-server.ops.v360-field-evidence-simulation-adapter.v1",
      array: "fieldEvidenceSimulationAdapters",
      truthy: ["conditionalNotRunEvidence"],
      falsy: ["fieldEvidencePersisted", "fieldEvidenceWritePerformed", "fieldSmokeExecuted", "endpointProbePerformed", "credentialProbePerformed", "onvifDeviceContacted", "externalWhepTurnContacted", "cloudProviderContacted", "vlmProviderCalled", "simulationRunExecuted", "artifactExportExecuted", ...protocolFalse],
    },
    "UI-094": {
      route: "/ops/api/live-operations/simulation/vlm-assisted-explanation",
      schema: "media-server.ops.v360-vlm-assisted-simulation-explanation.v1",
      array: "vlmAssistedSimulationExplanations",
      truthy: ["defaultOff", "runtimeOptInRequired"],
      falsy: ["defaultEnabled", "vlmProviderCallPerformed", "vlmRuntimeCallPerformed", "simulationRunPersisted", "simulationRunExecuted", "fieldSmokeExecuted", "clientNoticeSent", ...protocolFalse],
    },
    "UI-096": {
      route: "/ops/api/site-operations/client-notice-by-site-view-group",
      schema: "media-server.ops.v370-client-notice-by-site-view-group.v1",
      array: "clientNoticeBySiteViewGroupItems",
      truthy: ["previewOnly", "siteViewGroupScoped"],
      falsy: ["clientNoticeSent", "clientNoticePersisted", "viewerClientPayloadChanged", "sourceRegistryWritePerformed", "publishedViewWritePerformed", "ruleRegistryWritePerformed", "eventRecordWritePerformed", "opsAuditWritePerformed", ...protocolFalse],
    },
    "UI-097": {
      route: "/ops/api/site-operations/rule-va-what-if-by-site",
      schema: "media-server.ops.v370-rule-va-what-if-by-site.v1",
      array: "ruleVaWhatIfBySiteItems",
      truthy: ["whatIfOnly", "siteScoped"],
      falsy: ["ruleRegistryWritePerformed", "ruleThresholdApplied", "presetApplied", "scenarioApplied", "eventRecordWritePerformed", "opsAuditWritePerformed", "simulationRunExecuted", "safeApplyPerformed", "clientNoticeSent", "viewerClientPayloadChanged", ...protocolFalse],
    },
    "UI-098": {
      route: "/ops/api/site-operations/field-evidence-attachment",
      schema: "media-server.ops.v370-field-evidence-attachment.v1",
      array: "fieldEvidenceAttachments",
      truthy: ["attachmentOnly", "conditionalNotRunOnly"],
      falsy: ["fieldSmokeExecuted", "endpointProbePerformed", "credentialProbePerformed", "providerCallPerformed", "sourceRegistryWritePerformed", "runbookInstancePersisted", "approvalTicketWritePerformed", "eventRecordWritePerformed", "clientNoticeSent", "viewerClientPayloadChanged", ...protocolFalse],
    },
    "UI-099": {
      route: "/ops/api/site-operations/limited-safe-execution-pilot",
      schema: "media-server.ops.v370-limited-safe-execution-pilot.v1",
      array: "limitedSafeExecutionPilotActions",
      truthy: ["executionPilotOnly", "lowestRiskOnly", "approvalGateRequired"],
      falsy: ["pilotExecutionPerformed", "sourceRecheckExecuted", "noticeQueueWritePerformed", "clientNoticeSent", "runbookInstancePersisted", "approvalTicketWritePerformed", "sourceRegistryWritePerformed", "eventRecordWritePerformed", "fieldSmokeExecuted", "endpointProbePerformed", ...protocolFalse],
    },
    "UI-100": {
      route: "/ops/api/site-operations/outcome-reconciliation",
      schema: "media-server.ops.v370-outcome-reconciliation.v1",
      array: "outcomeReconciliationItems",
      truthy: ["outcomeReconciliationOnly", "preSimulationCompared", "postExecutionCompared"],
      falsy: ["executionObserved", "pilotExecutionPerformed", "sourceRecheckExecuted", "noticeQueueWritePerformed", "clientNoticeSent", "sourceRegistryWritePerformed", "publishedViewWritePerformed", "eventRecordWritePerformed", "opsAuditWritePerformed", "viewerClientPayloadChanged", ...protocolFalse],
    },
    "UI-101": {
      route: "/ops/api/site-operations/export-handoff-bundle",
      schema: "media-server.ops.v370-export-handoff-bundle.v1",
      array: "exportHandoffBundleItems",
      truthy: ["releaseSafe", "redacted", "exportHandoffOnly"],
      falsy: ["artifactExportExecuted", "bundlePersisted", "fileWritePerformed", "handoffWritePerformed", "pilotExecutionPerformed", "sourceRecheckExecuted", "noticeQueueWritePerformed", "clientNoticeSent", "fieldSmokeExecuted", "endpointProbePerformed", "sourceRegistryWritePerformed", "eventRecordWritePerformed", ...protocolFalse],
    },
    "UI-104": {
      route: "/ops/api/actions/outcome-reconciliation",
      schema: "media-server.ops.v380-outcome-observer-reconciliation.v1",
      array: "outcomeObserverItems",
      truthy: ["outcomeObserverOnly", "readinessCompared", "candidateCompared", "observedOutcomeCompared"],
      falsy: ["executionObserved", "actionExecutionPerformed", "sourceRecheckExecuted", "clientNoticeSent", "noticeQueueWritePerformed", "ruleApplyPerformed", "ruleRegistryWritePerformed", "eventRecordWritePerformed", "actionResultPersisted", "viewerClientPayloadChanged", ...protocolFalse],
    },
    "UI-105": {
      route: "/ops/api/actions/receipt-bundle",
      schema: "media-server.ops.v380-action-receipt-bundle.v1",
      array: "receiptBundleItems",
      truthy: ["receiptBundleOnly", "redacted", "releaseSafe", "handoffMapOnly"],
      falsy: ["bundlePersisted", "artifactFileWritePerformed", "handoffWritePerformed", "actionExecutionPerformed", "sourceRecheckExecuted", "clientNoticeSent", "noticeQueueWritePerformed", "ruleApplyPerformed", "ruleRegistryWritePerformed", "eventRecordWritePerformed", "actionResultPersisted", "viewerClientPayloadChanged", "rawLocatorIncluded", "credentialMaterialIncluded", "rawDiagnosticJsonIncluded", ...protocolFalse],
    },
  };
  if (singleModels[caseId]) {
    const model = singleModels[caseId];
    const response = await read(model.route);
    const itemCount = assertModel(response.json, model.schema, model.array, model, model.route);
    return { status: response.status, matchedFixture: true, itemCount };
  }

  if (caseId === "UI-095") {
    const models = [
      ["/ops/api/site-operations/source-registry-projection", "media-server.ops.v370-site-aware-source-registry-projection.v1", "siteRegistryProjection", ["sourceRegistryWritePerformed", "publishedViewWritePerformed"]],
      ["/ops/api/site-operations/health-rollup", "media-server.ops.v370-site-health-rollup.v1", "siteHealthRollup", ["sourceHealthPersisted", "automaticRecoveryPerformed", "fieldSmokeExecuted"]],
      ["/ops/api/site-operations/impact-graph", "media-server.ops.v370-site-impact-graph.v1", "siteImpactGraphNodes", ["sourceRegistryWritePerformed", "publishedViewWritePerformed", "eventRecordWritePerformed", "opsAuditWritePerformed"]],
      ["/ops/api/site-operations/runbook-instance-ledger", "media-server.ops.v370-runbook-instance-ledger.v1", "runbookInstanceLedgerEntries", ["runbookInstancePersisted", "operatorNoteWritePerformed", "resultDiffPersisted", "eventRecordWritePerformed", "clientNoticeSent"]],
      ["/ops/api/site-operations/approval-ticket-workflow", "media-server.ops.v370-approval-ticket-workflow.v1", "approvalTicketWorkflowItems", ["approvalTicketWritePerformed", "approvalDecisionPersisted", "operatorNoteWritePerformed", "eventRecordWritePerformed", "clientNoticeSent"]],
    ];
    const responses = await Promise.all(models.map(model => read(model[0])));
    let itemCount = 0;
    responses.forEach((response, index) => {
      const [route, schema, arrayField, falsy] = models[index];
      itemCount += assertModel(response.json, schema, arrayField, { falsy }, route);
    });
    return { status: responses.map(response => response.status).join("/"), matchedFixture: true, itemCount };
  }

  if (caseId === "UI-102") {
    const models = [
      ["/ops/api/actions/capability-contract", "media-server.ops.v380-action-capability-contract.v1", "allowedActionCatalog", ["actionExecutionPerformed"]],
      ["/ops/api/actions/request-ledger", "media-server.ops.v380-action-request-ledger-contract.v1", "ledgerFields", ["requestWritePerformed", "actionRequestPersisted", "actionExecutionPerformed"]],
      ["/ops/api/actions/approval-decision-gate", "media-server.ops.v380-approval-decision-gate.v1", "decisionStates", ["decisionWritePerformed", "approvalDecisionPersisted", "actionExecutionPerformed"]],
      ["/ops/api/actions/readiness-preflight", "media-server.ops.v380-action-readiness-preflight.v1", "preflightBlockers", ["readinessCheckExecuted", "readinessResultPersisted", "actionExecutionPerformed"]],
      ["/ops/api/actions/source-recheck-pilot", "media-server.ops.v380-source-recheck-action-pilot.v1", "pilotCandidate", ["sourceRecheckExecuted", "sourceHealthWritePerformed", "actionExecutionPerformed"]],
      ["/ops/api/actions/client-notice-draft-queue", "media-server.ops.v380-client-notice-draft-queue.v1", "viewerSafeNoticeDrafts", ["noticeDraftPersisted", "clientNoticeSent", "noticeQueueWritePerformed"]],
      ["/ops/api/actions/rule-draft-package", "media-server.ops.v380-rule-draft-action-package.v1", "draftPackage", ["ruleDraftPersisted", "ruleApplyPerformed", "scenarioApplyPerformed", "ruleRegistryWritePerformed", "profileRegistryWritePerformed"]],
    ];
    const responses = await Promise.all(models.map(model => read(model[0])));
    let itemCount = 0;
    responses.forEach((response, index) => {
      const [route, schema, arrayField, falsy] = models[index];
      itemCount += assertModel(response.json, schema, arrayField, { falsy }, route);
    });
    return { status: responses.map(response => response.status).join("/"), matchedFixture: true, itemCount };
  }

  const viewId = descriptor?.auth?.defaultViewId || "9001";
  const response = await read(`/client/api/views/${encodeURIComponent(viewId)}/events?limit=6`);
  const preview = response.json?.events?.clientActionNoticePreview;
  assert(response.json?.ok === true && response.json?.view?.viewId === viewId &&
    preview?.schema === "media-server.client.v380-action-notice-preview.v1" &&
    preview?.provided === true && preview?.viewerSafeActionNoticePreview === true &&
    preview?.viewerSafe === true && preview?.previewOnly === true &&
    preview?.statusTimelineOnly === true && preview?.publishedViewScoped === true &&
    preview?.itemCount === 1 && Array.isArray(preview?.noticeItems) && preview.noticeItems.length === 1 &&
    typeof preview.noticeItems[0]?.viewerSafeTitle === "string" && preview.noticeItems[0].viewerSafeTitle &&
    typeof preview.noticeItems[0]?.viewerSafeBody === "string" && preview.noticeItems[0].viewerSafeBody &&
    ["maintenance", "degraded", "recovering", "available"].includes(preview.noticeItems[0]?.noticeStatus) &&
    preview?.operatorOnlyBlockerDetailIncluded === false &&
    preview?.approvalDecisionDetailIncluded === false && preview?.readinessBlockerDetailIncluded === false &&
    preview?.sourceUrlIncluded === false && preview?.rawLocatorIncluded === false &&
    preview?.credentialMaterialIncluded === false && preview?.actionControlsIncluded === false &&
    preview?.actionExecutionPerformed === false && preview?.clientNoticeSent === false &&
    preview?.noticeDraftPersisted === false && preview?.noticeQueueWritePerformed === false &&
    preview?.eventRecordWritePerformed === false && preview?.eventPostPayloadChanged === false &&
    preview?.eventSchemaChanged === false && preview?.rtspOrWebrtcMediaPathChanged === false,
  `${caseId} viewer-safe action notice preview is missing from the authoritative API readback`);
  return { status: response.status, matchedFixture: true, itemCount: preview.itemCount };
}

function caseNeedsRuntimeOwner(item) {
  const exactSpec = exactRuntimeOracleFor(item.caseId);
  return Boolean(exactSpec?.seed || exactSpec?.setup?.fixtures?.length) || ["RULE-103", "RULE-104", "RULE-111", "SAFE-038", "UI-036", "UI-046", "UI-052", "UI-053", "UI-064", "UI-065", "UI-066", "UI-067", "UI-068", "UI-069", "UI-070", "UI-071", "UI-072", "UI-073", "UI-074", "UI-075", "UI-080", "UI-088", "UI-089", "UI-090", "UI-091", "UI-092", "UI-093", "UI-094", "UI-095", "UI-096", "UI-097", "UI-098", "UI-099", "UI-100", "UI-101", "UI-102", "UI-103", "UI-104", "UI-105"].includes(item.caseId) ||
    (item.workflow.inputs || []).some(input => input.kind === "rejected-endpoint-fixture") ||
    (item.workflow.inputs || []).some(input => input.kind === "exact-runtime-fixture") ||
    (item.workflow.setup || []).some(setup => setup.kind === "bind-action-role-session" ||
    (setup.kind === "seed-reviewed-state" && setup.persistedMutation === true)) ||
    JSON.stringify(item.workflow.inputs || []).includes("secretRef") ||
    (item.workflow.cleanup || []).some(cleanup => ["restore-fixture-state", "delete-created-fixture"].includes(cleanup.kind));
}

function reviewedFixtureId(item) {
  return (item.workflow.setup || []).find(setup => setup.kind === "seed-reviewed-state")?.fixtureId || `${item.caseId.toLowerCase()}-fixture`;
}

function actionRoleFor(item) {
  return (item.workflow.setup || []).find(setup => setup.kind === "bind-action-role-session")?.accountRole || "";
}

function snapshotStateFiles(files) {
  return files.map(filePath => {
    const resolved = path.resolve(filePath);
    const exists = fs.existsSync(resolved);
    return {
      path: resolved,
      exists,
      mode: exists ? fs.statSync(resolved).mode & 0o777 : 0o600,
      bytes: exists ? fs.readFileSync(resolved).toString("base64") : "",
    };
  });
}

function restoreStateFiles(snapshots) {
  for (const snapshot of snapshots) {
    fs.mkdirSync(path.dirname(snapshot.path), { recursive: true });
    if (!snapshot.exists) {
      fs.rmSync(snapshot.path, { force: true });
      continue;
    }
    const temporary = `${snapshot.path}.v390-runtime-${process.pid}.tmp`;
    fs.writeFileSync(temporary, Buffer.from(snapshot.bytes, "base64"), { mode: snapshot.mode });
    fs.renameSync(temporary, snapshot.path);
    fs.chmodSync(snapshot.path, snapshot.mode);
  }
}

function stateFilesEqual(snapshots) {
  return snapshots.every(snapshot => {
    if (fs.existsSync(snapshot.path) !== snapshot.exists) return false;
    if (!snapshot.exists) return true;
    return fs.readFileSync(snapshot.path).toString("base64") === snapshot.bytes;
  });
}

function sha256FileOrMissing(filePath) {
  const value = filePath && fs.existsSync(filePath)
    ? fs.readFileSync(filePath)
    : Buffer.from("missing", "utf8");
  return crypto.createHash("sha256").update(value).digest("hex");
}

function readUsersState(usersFile) {
  assert(usersFile && fs.existsSync(usersFile), "authoritative users store is missing");
  const raw = fs.readFileSync(usersFile, "utf8");
  const parsed = JSON.parse(raw);
  return {
    raw,
    sha256: crypto.createHash("sha256").update(raw).digest("hex"),
    stableAuthSha256: stableUsersAuthSha256(usersFile),
    users: Array.isArray(parsed.users) ? parsed.users : [],
    invites: Array.isArray(parsed.invites) ? parsed.invites : [],
    accessRequests: Array.isArray(parsed.accessRequests) ? parsed.accessRequests : [],
  };
}

function stableUsersAuthSha256(usersFile) {
  if (!usersFile || !fs.existsSync(usersFile)) {
    return crypto.createHash("sha256").update("missing").digest("hex");
  }
  const parsed = JSON.parse(fs.readFileSync(usersFile, "utf8"));
  const normalized = structuredClone(parsed);
  for (const user of Array.isArray(normalized.users) ? normalized.users : []) {
    delete user.lastLoginAt;
    delete user.lastLoginIp;
  }
  return crypto.createHash("sha256").update(stableJson(normalized)).digest("hex");
}

async function observeBrowserWhoami(browser, caseId) {
  assert(browser?.evaluate, `${caseId} browser whoami readback adapter missing`);
  const principal = await browser.evaluate(async () => {
    const response = await fetch("/auth/whoami", {
      credentials: "same-origin",
      cache: "no-store",
      redirect: "follow",
    });
    let body = {};
    try { body = await response.json(); } catch { body = {}; }
    return {
      status: response.status,
      authenticated: body?.authenticated === true,
      username: typeof body?.username === "string" ? body.username : "",
      role: typeof body?.role === "string" ? body.role : "",
      scopes: Array.isArray(body?.scopes) ? body.scopes.map(value => String(value)) : [],
      setupRequired: body?.setupRequired === true,
    };
  });
  assert(principal && Number.isInteger(principal.status), `${caseId} browser whoami result invalid`);
  return principal;
}

function safePrincipal(value) {
  return {
    authenticated: value?.authenticated === true,
    username: typeof value?.username === "string" ? value.username : "",
    role: typeof value?.role === "string" ? value.role : "",
    scopes: Array.isArray(value?.scopes) ? value.scopes.map(item => String(item)) : [],
  };
}

async function observeBrowserRoleBoundary(browser) {
  return browser.evaluate(async () => {
    const request = async path => {
      const response = await fetch(path, {
        credentials: "same-origin",
        cache: "no-store",
        redirect: "follow",
      });
      return response.status;
    };
    return {
      clientStatus: await request("/client/api/views"),
      opsStatus: await request("/ops/api/users"),
    };
  });
}

async function observeCurrentOpsUsersUi(browser, {
  sectionSelector,
  identity,
  forbiddenSecret = "",
} = {}) {
  assert(sectionSelector && identity, "ops users UI readback identity is incomplete");
  await browser.waitForSelector(`${sectionSelector} tr:has-text(${JSON.stringify(identity)})`);
  return browser.evaluate(({ selector, expectedIdentity, secret }) => {
    const section = document.querySelector(selector);
    const text = String(section?.innerText || "");
    const bodyText = String(document.body?.innerText || "");
    const matchingRows = Array.from(section?.querySelectorAll("tr") || [])
      .filter(row => String(row.innerText || "").includes(expectedIdentity));
    return {
      identityVisible: matchingRows.length === 1,
      matchingRowCount: matchingRows.length,
      pendingVisible: text.includes(expectedIdentity) && /대기|pending/i.test(text),
      adminAllScopesVisible: text.includes(expectedIdentity) && text.includes("모든 범위"),
      forbiddenMarkersAbsent: !/passwordHash|passwordHistory|tokenHash/i.test(bodyText),
      forbiddenSecretAbsent: !secret || !text.includes(secret),
    };
  }, { selector: sectionSelector, expectedIdentity: identity, secret: forbiddenSecret });
}

async function inspectOpsUsersUiWithLogin(browser, {
  username,
  password,
  sectionSelector,
  identity,
  returnPath,
} = {}) {
  assert(username && password && returnPath, "ops users isolated UI readback login binding is incomplete");
  browser.registerRuntimeSecret(password);
  try {
    const login = await browser.evaluate(async credentials => {
      const response = await fetch("/login", {
        method: "POST",
        credentials: "same-origin",
        redirect: "follow",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(credentials),
      });
      return { status: response.status, pathname: new URL(response.url).pathname };
    }, { username, password });
    assert(login.status === 200 && login.pathname.startsWith("/ops/"),
      "ops users isolated UI readback login failed");
    const navigation = await browser.navigate("/ops/users");
    assert(navigation.status === 200, "ops users isolated UI readback navigation failed");
    return await observeCurrentOpsUsersUi(browser, { sectionSelector, identity });
  } finally {
    await browser.evaluate(async () => {
      try {
        await fetch("/logout", {
          method: "POST",
          credentials: "same-origin",
          redirect: "manual",
        });
      } catch {}
    });
    await browser.navigate(returnPath);
  }
}

function objectHasAnyKey(value, forbidden) {
  if (Array.isArray(value)) return value.some(item => objectHasAnyKey(item, forbidden));
  if (!value || typeof value !== "object") return false;
  return Object.entries(value).some(([key, item]) =>
    forbidden.has(key) || objectHasAnyKey(item, forbidden));
}

function containsForbiddenAuthMaterial(value) {
  return objectHasAnyKey(value, new Set(["passwordHash", "passwordHistory", "tokenHash"]));
}

function fixturePayload(item, fixtureId, value) {
  const endpoint = item.workflow.productAction?.endpoint?.path || "";
  const base = { id: fixtureId, displayName: value.displayName || `REVIEW4 ${item.caseId} fixture`, enabled: true };
  if (endpoint.includes("/sources/")) return { ...base, sourceId: fixtureId, kind: "file", file: "sample_h264.mp4", tags: ["review4", "throwaway"] };
  if (endpoint.includes("/views/")) return { ...base, viewId: fixtureId, sourceId: "9001", allowedRuleIds: [], allowedOverlayModes: ["raw", "va-overlay"], showDashboard: true, showEvents: true, maxTiles: 1 };
  if (endpoint.includes("/vlm/profiles/")) {
    return {
      ...base,
      schema: "media-server.vlm-profile.v1",
      selectedOptionId: "local-qwen3-vl-8b",
      provider: "user-supplied-local-runtime",
      model: "Qwen/Qwen3-VL-8B-Instruct",
      runtime: "not-configured",
      privacyMode: "local-only",
      cloudOptInAcknowledged: false,
      promptProfile: { id: "event-review-default", version: "v1", language: "ko-en" },
      evaluation: {
        candidateId: "",
        expectedCatalogRevision: "",
        expectedProvenanceDigest: "",
      },
      activation: {
        enabled: false,
        status: "disabled",
        fallbackProfileId: "",
        disabledReason: "review4-runtime-fixture",
      },
      runtimeContract: {
        schema: "media-server.vlm-runtime-opt-in-contract.v1",
        targetStep: "V210-S01",
        mode: "disabled",
        status: "disabled",
        defaultEnabled: false,
        operatorOptInRequired: true,
        operatorOptInAcknowledged: false,
        runtimeCallAllowed: false,
        providerCallAllowed: false,
        providerFieldSmokeRequired: false,
        sideEffects: {
          runtimeVlmCallPerformed: false,
          cloudProviderApiCalled: false,
          modelArtifactDownloaded: false,
          modelArtifactBundled: false,
          credentialStored: false,
          sidecarStored: false,
          eventPostPayloadChanged: false,
          webrtcDataChannelSchemaChanged: false,
          sseMetadataSchemaChanged: false,
          wsMetadataSchemaChanged: false,
          rtspOrWebrtcMediaPathChanged: false,
          viewerClientExposureAdded: false,
        },
      },
      sourceStep: "V390-REVIEW4-65",
      storageScope: "profile-storage-only",
      contractInvariants: {
        runtimeVlmCallPerformed: false,
        sidecarStored: false,
        cloudProviderApiCalled: false,
        credentialStored: false,
        eventPostPayloadChanged: false,
        webrtcDataChannelSchemaChanged: false,
        sseMetadataSchemaChanged: false,
        wsMetadataSchemaChanged: false,
        rtspOrWebrtcMediaPathChanged: false,
        viewerClientExposureAdded: false,
      },
    };
  }
  if (endpoint.includes("/profiles/")) {
    return {
      ...base,
      name: base.displayName,
      detector: item.caseId === "RULE-026" ? "dummy" : "yolo",
      fps: 6,
      maxQueue: 1,
      confidence: 0.25,
      nms: 0.45,
      inputWidth: 640,
      inputHeight: 640,
      trackingClasses: ["person"],
      analysis: { classes: ["person"] },
    };
  }
  if (endpoint.includes("/va-rules/")) {
    const seedTrackingPolicy = {
      "RULE-034": { tracker: "lite", reid: "assist" },
      "RULE-035": { tracker: "kalman-lite", reid: "off" },
      "RULE-036": { tracker: "lite", reid: "off" },
      "RULE-037": { tracker: "lite", reid: "off" },
      "RULE-038": { tracker: "lite", reid: "assist" },
      "RULE-039": { tracker: "lite", reid: "off" },
    }[item.caseId] || { tracker: "lite", reid: "off" };
    return { ...base, name: base.displayName, source: { kind: "file", file: "sample_h264.mp4" }, analysis: { profileId: "9101", classes: ["person"], trackingPolicy: seedTrackingPolicy }, templateStart: { ruleId: "9201" }, event: { type: "presence", region: { type: "polygon", points: [[0,0],[1,0],[1,1],[0,1]] } }, priority: 1 };
  }
  if (endpoint.includes("/rules/")) {
    const seedType = item.caseId === "RULE-041" ? "enter" : "presence";
    return { ...base, name: base.displayName, ruleKind: "basic", analysis: { profileId: "9101", classes: ["person"], trackingPolicy: { tracker: "lite", reid: "off" } }, event: { type: seedType, region: { type: "polygon", points: [[0,0],[1,0],[1,1],[0,1]] } } };
  }
  if (endpoint.includes("/users")) return { username: fixtureId, displayName: base.displayName, role: "viewer", viewId: "9001", enabled: true };
  if (endpoint.includes("/events/reviews/")) return { eventId: fixtureId, reviewStatus: "pending", reviewNote: "review4 runtime baseline" };
  if (endpoint.includes("/onvif/channels/")) return { channelId: fixtureId, displayName: base.displayName, host: "127.0.0.1", port: 80, enabled: false };
  return base;
}

function buildOnvifPairPayload(item, fixtureId, value = {}) {
  const onvif = ["UI-109", "SRC-066"].includes(item.caseId);
  const kind = onvif ? "rtsp" : (value.kind || "file");
  const displayName = value.displayName || `REVIEW4 ${item.caseId} fixture`;
  const source = {
    sourceId: fixtureId,
    displayName,
    kind,
    enabled: true,
    tags: onvif ? ["onvif", "live", "review4"] : ["review4", "throwaway"],
    ownerGroup: "review4",
    site: "contract",
    group: "review4",
    floor: "",
    zone: "",
    ...(kind === "rtsp"
      ? { rtspUrl: `rtsp://127.0.0.1:${8554}/${fixtureId}` }
      : { file: value.file || "sample_h264.mp4" }),
  };
  const publishedView = {
    viewId: fixtureId,
    displayName,
    sourceId: fixtureId,
    defaultRuleId: "",
    allowedRuleIds: [],
    allowedOverlayModes: ["raw", "va-overlay", "va-rule"],
    showDashboard: true,
    showEvents: true,
    showMetadataSummary: true,
    clientGroups: [],
    maxTiles: 1,
    enabled: true,
  };
  return { source, publishedView };
}

function unwrapRecord(payload, fixtureId, matchFields = []) {
  if (payload === null || payload === undefined) return null;
  const matches = item => recordId(item) === fixtureId || matchFields.some(field => String(item?.[field] || "") === fixtureId);
  if (Array.isArray(payload)) return payload.find(matches) || null;
  for (const value of Object.values(payload)) {
    if (Array.isArray(value)) {
      const found = value.find(matches);
      if (found) return found;
    }
  }
  const direct = payload.source || payload.view || payload.profile || payload.rule || payload.vaRule || payload.user || payload.review || payload.channel;
  if (direct && typeof direct === "object") return direct;
  return recordId(payload) === fixtureId ? payload : null;
}

function recordId(value) {
  return String(value?.id || value?.sourceId || value?.viewId || value?.username || value?.eventId ||
    value?.channelId || value?.inviteId || value?.requestId || "");
}

export function normalizeInviteSeedResponse(value, { username = "", viewId = "" } = {}) {
  assert(value && typeof value === "object", "runtime invite seed response must be an object");
  const invite = value.invite && typeof value.invite === "object" ? value.invite : value;
  assert(typeof invite.token === "string" && invite.token.length > 0,
    "runtime invite seed response did not contain invite.token");
  assert(typeof invite.setupUrl === "string" && invite.setupUrl.includes(encodeURIComponent(invite.token)),
    "runtime invite seed response did not bind setupUrl to the token");
  if (username) assert(invite.username === username, "runtime invite seed username mismatch");
  if (viewId) assert(invite.viewId === viewId, "runtime invite seed viewId mismatch");
  return invite;
}

export function seedExactAccessRequestFixture(usersFile, {
  requestId,
  username,
  displayName,
  contact,
  reason,
  viewId,
} = {}) {
  assert(usersFile && fs.existsSync(usersFile), "runtime auth users file is unavailable");
  assert(requestId && username, "runtime exact access-request identity is required");
  const store = readJson(usersFile);
  store.users = Array.isArray(store.users) ? store.users : [];
  store.invites = Array.isArray(store.invites) ? store.invites : [];
  store.accessRequests = Array.isArray(store.accessRequests) ? store.accessRequests : [];
  store.accessRequests = store.accessRequests.filter(item =>
    item?.requestId !== requestId && item?.username !== username);
  const record = {
    requestId,
    username,
    displayName: displayName || username,
    contact: contact || "",
    reason: reason || "v390 exact runtime fixture",
    viewId: viewId || "",
    status: "pending",
    createdAt: new Date().toISOString(),
    decidedAt: "",
    decidedBy: "",
    inviteId: "",
  };
  store.accessRequests.push(record);
  writePrivateJson(usersFile, store);
  return record;
}

function defaultPublishedSourceIdentity(descriptor) {
  const viewId = String(descriptor.auth?.defaultViewId || "");
  const views = readJson(descriptor.registrySeedPayloadPaths?.views || "").views || [];
  const sources = readJson(descriptor.registrySeedPayloadPaths?.sources || "").sources || [];
  const view = views.find(value => String(value?.viewId || "") === viewId);
  const source = sources.find(value => String(value?.sourceId || "") === String(view?.sourceId || ""));
  const sourceId = String(source?.sourceId || "");
  const streamId = String(source?.canonicalSourceKey || "");
  assert(view && sourceId && streamId,
    "default PublishedView source identity is unavailable for viewer-scoped EventRecord seed");
  return { sourceId, streamId };
}

export function seedEventRecordFixture(eventStoragePath, {
  eventId,
  sourceId = "9001",
  streamId = sourceId,
  status = "recorded",
  eventType = "presence",
  className = "person",
  scenarioName = "",
  snapshotPath = "",
  clipPath = "",
  metadata = {},
} = {}) {
  assert(eventStoragePath, "runtime event storage path is unavailable");
  assert(eventId, "runtime EventRecord fixture ID is required");
  const timestampMs = Date.now();
  const record = {
    schema: "media-server.va.event-record.v1",
    eventId,
    streamId,
    sourceId,
    channelId: sourceId,
    trackId: 1,
    classId: 0,
    eventType,
    className,
    status,
    startTime: timestampMs,
    updateTime: timestampMs,
    endTime: timestampMs,
    zoneId: "",
    lineId: "",
    scenarioName,
    scenarioPhase: "",
    confidence: 0.9,
    snapshotPath,
    clipPath,
    preEventMs: 0,
    postEventMs: 0,
    metadata: { sourceId, ...metadata },
    fixtureOwner: "v390-self-contained-acceptance",
  };
  fs.appendFileSync(eventStoragePath, `${JSON.stringify(record)}\n`, { mode: 0o600 });
  fs.chmodSync(eventStoragePath, 0o600);
  return record;
}

export function seedVlmRuleSuggestionFixture(observationPath, { eventId, sourceId = "9001", searchTerm = "" } = {}) {
  assert(observationPath, "runtime VLM observation path is unavailable");
  assert(eventId, "runtime VLM rule suggestion fixture ID is required");
  const record = {
    schema: "media-server.vlm-observation.v1",
    observationId: `${eventId}-observation`,
    eventId,
    sourceId,
    ruleId: "",
    scenarioId: "",
    inputType: "event-record",
    inputEvidenceRefs: {},
    summary: `REVIEW4 exact local rule draft candidate ${String(searchTerm || "").trim()}`.trim(),
    eventExplanation: `test-owned manual draft candidate ${String(searchTerm || "").trim()}`.trim(),
    falsePositiveHints: [],
    operatorReviewQuestions: [],
    ruleSuggestion: {
      kind: "line-crossing",
      candidateId: `${eventId}-candidate`,
      suggestedAction: "manual-save-in-ops-rules",
      targetRoute: "/ops/rules",
      manualReviewRequired: true,
      autoApply: false,
      rationale: "operator review required",
      draftRule: {
        eventType: "line-crossing",
        classes: ["person"],
        minConfidence: 0.8,
        minDurationMs: 1000,
        direction: "any",
      },
    },
    uncertainty: 0.1,
    provider: "test-owned-local-fixture",
    model: "none",
    promptProfile: "review4-exact",
    privacyMode: "local-only",
    latencyMs: 0,
    createdAt: Date.now(),
    storageScope: "vlm-observation-store-only",
  };
  fs.mkdirSync(path.dirname(observationPath), { recursive: true });
  fs.appendFileSync(observationPath, `${JSON.stringify(record)}\n`, { mode: 0o600 });
  fs.chmodSync(observationPath, 0o600);
  return record;
}

function vlmObservationStoragePath(eventStoragePath) {
  const parsed = path.parse(eventStoragePath);
  return path.join(parsed.dir, `${parsed.name || "events"}.vlm-observations${parsed.ext || ".jsonl"}`);
}

export function resolveAuthoritativeReadback(endpoint, fixtureId) {
  const value = String(endpoint || "");
  if (value === "/client/api/preferences/live-layout") {
    return { endpoint: value, fixtureId: "", mode: "whole-response", matchFields: [] };
  }
  if (value === "/client/api/access-requests") {
    return {
      endpoint: "/ops/api/access-requests",
      fixtureId,
      mode: "fixture-record",
      matchFields: ["requestId", "username"],
      role: "admin",
    };
  }
  if (["/ops/api/sources/", "/ops/api/views/", "/ops/api/onvif/channels/"].some(prefix => value.startsWith(prefix))) {
    return {
      endpoint: "/ops/api/sources",
      secondaryEndpoint: "/ops/api/views",
      fixtureId,
      mode: "source-view-pair",
      matchFields: ["sourceId", "viewId"],
      role: "operator",
    };
  }
  const authCollections = [
    ["/ops/api/users/", "/ops/api/users"],
    ["/ops/api/invites/", "/ops/api/invites"],
    ["/ops/api/access-requests/", "/ops/api/access-requests"],
  ];
  for (const [prefix, collection] of authCollections) {
    if (value.startsWith(prefix)) {
      return { endpoint: collection, fixtureId, mode: "fixture-record", matchFields: ["username", "inviteId", "requestId"], role: "admin" };
    }
  }
  const collectionMappings = [
    ["/ops/api/vlm/profiles/", "/ops/api/vlm/profiles"],
    ["/lab/analysis/va-rules/", "/lab/analysis/va-rules"],
    ["/lab/analysis/rules/", "/lab/analysis/rules"],
    ["/lab/analysis/profiles/", "/lab/analysis/profiles"],
    ["/ops/api/events/reviews/", "/ops/api/events/reviews"],
  ];
  for (const [prefix, collection] of collectionMappings) {
    if (value.startsWith(prefix)) {
      return { endpoint: collection, fixtureId, mode: "fixture-record", matchFields: ["id", "ruleId", "profileId", "eventId"] };
    }
  }
  return { endpoint: value, fixtureId, mode: "fixture-record", matchFields: [] };
}

function expandFixturePath(value, fixtureId) {
  return String(value || "").replaceAll("{fixtureId}", encodeURIComponent(fixtureId));
}

function parseSecretEnvelope(raw) {
  if (!raw) return { roles: {}, refs: {} };
  const value = JSON.parse(raw);
  assert(value && typeof value === "object", "role secret envelope must be an object");
  return { roles: value.roles || {}, refs: value.refs || {} };
}

function generatedPassword() {
  const letters = "BDFKMNPRTVXYZ";
  const digits = "2749";
  const specials = "!@#$%";
  const entropy = crypto.randomBytes(36);
  let value = "V!";
  for (let index = 0; index < 12; index += 1) {
    value += letters[entropy[index * 3] % letters.length];
    value += digits[entropy[index * 3 + 1] % digits.length];
    value += specials[entropy[index * 3 + 2] % specials.length];
  }
  return `${value}aZ`;
}

async function postForm(url, values, { cookie = "" } = {}) {
  return fetch(url, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: new URLSearchParams(values),
  });
}

async function requestStatus(url, { cookie = "", method = "GET" } = {}) {
  const response = await fetch(url, {
    method,
    redirect: "manual",
    headers: cookie ? { Cookie: cookie } : {},
  });
  return {
    status: response.status,
    location: response.headers.get("location") || "",
  };
}

async function requestJson(url, { cookie = "" } = {}) {
  const response = await fetch(url, { headers: cookie ? { Cookie: cookie } : {} });
  let json = null;
  try { json = await response.json(); } catch { json = null; }
  return { status: response.status, json };
}

function cookieFromResponse(response) {
  const raw = response.headers.get("set-cookie") || "";
  const pair = raw.split(";", 1)[0];
  assert(/^[^=]+=.+/.test(pair), "login response session cookie missing");
  return pair;
}

function storageStateForCookie(cookie, httpBase) {
  const [name, ...parts] = cookie.split("=");
  const url = new URL(httpBase);
  return {
    cookies: [{ name, value: parts.join("="), domain: url.hostname, path: "/", expires: -1, httpOnly: true, secure: url.protocol === "https:", sameSite: "Lax" }],
    origins: [],
  };
}

function cookieHeaderFromStorageState(filePath) {
  const state = readJson(filePath);
  return (state.cookies || []).map(cookie => `${cookie.name}=${cookie.value}`).join("; ");
}

function validateDescriptor(descriptor, { rootDir, httpBase, runtimeDescriptorPath, roleStateMapPath }) {
  assert(descriptor.schema === descriptorSchema, "unexpected self-contained runtime descriptor schema");
  assert(descriptor.httpBase === httpBase, "runtime descriptor HTTP base mismatch");
  const root = fs.realpathSync(descriptor.temporaryRoot);
  assert(path.basename(root).startsWith("media_server_v390_ui-"), "runtime temporary root name mismatch");
  const parsedHttpBase = new URL(httpBase);
  const loopbackHosts = new Set(["127.0.0.1", "localhost", "::1", "[::1]"]);
  assert(parsedHttpBase.protocol === "http:" && loopbackHosts.has(parsedHttpBase.hostname),
    "runtime HTTP base must use a loopback HTTP endpoint");
  assert(Number(parsedHttpBase.port) === Number(descriptor.httpPort),
    "runtime descriptor HTTP port does not match httpBase");

  const containedFiles = [
    [runtimeDescriptorPath, "runtime descriptor"],
    [roleStateMapPath, "CLI roleStateMapPath"],
    [descriptor.roleStateMapPath, "descriptor roleStateMapPath"],
    [descriptor.serverLogPath, "serverLogPath"],
    [descriptor.eventStoragePath, "eventStoragePath"],
    [descriptor.auth?.usersFile, "auth usersFile"],
    ...Object.entries(descriptor.auth?.storageStatePaths || {}).map(([role, value]) => [value, `auth storageStatePaths.${role}`]),
    ...Object.entries(descriptor.registrySeedPayloadPaths || {}).map(([name, value]) => [value, `registrySeedPayloadPaths.${name}`]),
    ...(descriptor.stateFiles || []).map(value => [value, "stateFiles"]),
  ];
  for (const [candidate, label] of containedFiles) {
    assertContainedPath(root, candidate, label);
  }
  for (const [name, directoryPath] of Object.entries(descriptor.artifactPaths || {})) {
    assertContainedPath(root, directoryPath, `artifactPaths.${name}`);
  }
  assert(rootDir && path.isAbsolute(rootDir), "runtime repository root missing");
}

function assertReviewedMutationOutcome(caseId, observed) {
  if (caseId === "SRC-009") {
    assert(observed?.source?.displayName === "File Source Updated" && observed?.source?.zone === "South",
      `${caseId} source displayName/zone update is missing from authoritative readback`);
  } else if (caseId === "SRC-018") {
    assert(observed?.publishedView?.displayName === "View One Updated" &&
      observed?.publishedView?.allowedRuleIds?.includes("13") &&
      observed?.publishedView?.clientGroups?.includes("review4-client"),
    `${caseId} published-view rule/scope update is missing from authoritative readback`);
  } else if (caseId === "RULE-008") {
    assert(observed?.enabled === false,
      `${caseId} enabled-state mutation is missing from authoritative readback`);
  } else if (caseId === "RULE-011") {
    assert(String(observed?.analysis?.profileId || observed?.profileId || "") === "9101",
      `${caseId} profile mapping is missing from authoritative readback`);
  } else if (caseId === "RULE-012") {
    const points = observed?.event?.region?.points || observed?.region?.points || [];
    const firstX = Array.isArray(points?.[0]) ? points[0][0] : points?.[0]?.x;
    const firstY = Array.isArray(points?.[0]) ? points[0][1] : points?.[0]?.y;
    assert(Array.isArray(points) && Number(firstX) === 0.1 && Number(firstY) === 0.1,
      `${caseId} polygon mutation is missing from authoritative readback`);
  } else if (caseId === "RULE-030") {
    assert(Number(observed?.confidence ?? observed?.minConfidence) === 0.75,
      `${caseId} profile confidence mutation is missing from authoritative readback`);
  } else if (caseId === "RULE-073") {
    assert(String(observed?.scenario?.type || observed?.event?.type || "") === "wrong-direction" &&
      String(observed?.event?.region?.direction || observed?.scenario?.allowedDirection || "") === "forward",
    `${caseId} line direction mutation is missing from authoritative readback`);
  } else if (caseId === "RULE-074") {
    assert(String(observed?.scenario?.type || observed?.event?.type || "") === "wrong-direction" &&
      ["forward", "reverse"].includes(String(observed?.scenario?.allowedDirection || observed?.event?.region?.direction || "")),
    `${caseId} allowed direction policy is missing from authoritative readback`);
  } else if (caseId === "RULE-075") {
    assert(Number(observed?.scenario?.cooldownMs) === 9000,
      `${caseId} cooldown mutation is missing from authoritative readback`);
  } else if (caseId === "CLIENT-009") {
    const layout = observed?.userPreference?.workspaceLayout;
    assert(layout && Number(layout.gridSize) > 0 &&
      ["compact", "comfortable"].includes(layout.density) &&
      ["left", "right"].includes(layout.dockSide),
    `${caseId} grid/density/dock preference is missing from authoritative readback`);
  }
}

function assertContainedPath(root, candidate, label) {
  assert(typeof candidate === "string" && candidate.length > 0, `${label} path missing`);
  const resolved = path.resolve(candidate);
  const existing = fs.existsSync(resolved) ? resolved : nearestExistingParent(resolved);
  const real = fs.realpathSync(existing);
  assert(isInside(root, real), `${label} escapes temporary root: ${candidate}`);
}

function nearestExistingParent(candidate) {
  let current = path.dirname(candidate);
  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    assert(parent !== current, `no existing parent for runtime path: ${candidate}`);
    current = parent;
  }
  return current;
}

function isInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function resolvePath(rootDir, value) {
  return path.isAbsolute(value) ? path.resolve(value) : path.resolve(rootDir, value);
}

function writePrivateJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  fs.chmodSync(filePath, 0o600);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), "utf8"));
}

function safeName(value) {
  return String(value || "case").replace(/[^a-zA-Z0-9_.-]+/g, "-");
}

function stableJson(value) {
  return JSON.stringify(sortValue(value));
}

function sortValue(value) {
  if (Array.isArray(value)) return value.map(sortValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, sortValue(value[key])]));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
