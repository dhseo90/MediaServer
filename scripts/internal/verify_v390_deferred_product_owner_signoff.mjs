#!/usr/bin/env node
// 파일 용도: REVIEW4-63의 실제 repository owner 결속, deferred 제품 범위 결정, source 근거와 후속 의존성을 검증한다.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 REVIEW4-63 accountable deferred product owner verification

Usage:
  ./server.sh verify-v390-deferred-product-owner-signoff
  ./server.sh verify-v390-deferred-product-owner-source-region-contract

Checks:
  - CODEOWNERS의 effective repository owner와 current /goal attestation 결속
  - action/credential/production restore/external provider/Re-ID exact 5개 결정
  - 역할명-only, field-smoke 치환, Re-ID 전체 미구현, 임의 후속 버전 예약 거부
  - 실제 route/schema/source/UI/boundary/verifier evidence와 구조화된 후속 의존성
  - implementation/field/release/UI/longrun false-PASS 비승격
`);
}

assertKnownOptions(rawArgs, ["h", "help", "source-region-contract"]);

const command = "verify-v390-deferred-product-owner-signoff";
const targetScript = "verify_v390_deferred_product_owner_signoff.mjs";
const fixtureRelativePath = "test/fixtures/v390_deferred_product_owner_signoff.json";
const fixturePath = path.join(rootDir, fixtureRelativePath);
const approvalSource = "/goal v3.9.0 (25) 잔여이슈 해결 4";
const accountableHandle = "@dhseo90";
const sourceRegionContractMode = rawArgs.includes("--source-region-contract");
const productUiPageScriptsPath = "src/ingress/product_ui_page_scripts.cpp";
const productUiServerPagesPath = "src/ingress/product_ui_server_pages.cpp";
const productUiSourceRegions = Object.freeze({
  "external-vlm-provider-call": Object.freeze({
    [productUiPageScriptsPath]: Object.freeze({
      startLocator: "      const renderV390FieldEvidenceBridgeDecision = (payload = {}) => {",
      endLocator: "      const refreshV390FieldEvidenceBridgeDecision = async ({",
      regionSha256: "4ee1566a473d9ddc338c052499b9ed8fc0831bcaa99e19867921c4958f8e84cc",
    }),
    [productUiServerPagesPath]: Object.freeze({
      startLocator: "      <section class=\"section-card ops-workspace-wide ops-field-evidence-bridge-decision\"",
      endLocator: "      <section class=\"section-card ops-workspace-wide ops-reid-assist-decision\"",
      regionSha256: "cd5024e9ab5caa968bb0b387df9e6d399485ff69cb06e907439083d8f27522b8",
    }),
  }),
  "model-backed-reid-session": Object.freeze({
    [productUiPageScriptsPath]: Object.freeze({
      startLocator: "      const renderV390ReidAssistDecision = (payload = {}) => {",
      endLocator: "      const refreshV390ReidAssistDecision = async ({",
      regionSha256: "22a48c2a5d243611ea77c92579a245ec75b92ad5cf94869d3baedca48f73513c",
    }),
    [productUiServerPagesPath]: Object.freeze({
      startLocator: "      <section class=\"section-card ops-workspace-wide ops-reid-assist-decision\"",
      endLocator: "      <section class=\"section-card ops-workspace-wide ops-site-client-notice-workspace\"",
      regionSha256: "adace168532d37a155dcf5e551a1cf37ffb989d3c0775e6f56633adea4c7b970",
    }),
  }),
});
const expected = new Map([
  ["action-execution", {
    functionalOwnerRole: "Product Owner",
    decision: "excluded-from-v3.9",
    implementationStatus: "deferred-capability-not-implemented",
    capabilityStatus: {
      productReadModelStatus: "implemented",
      actionWriteStatus: "not-implemented",
      currentReleaseExecutionEvidenceStatus: "not-run",
    },
    route: "/ops/api/actions/execution-deferral-decision",
    method: "GET",
    schema: "media-server.ops.v390-action-execution-deferral-decision.v1",
    sourceAnchors: [
      anchor("src/ingress/ops_action_execution_deferral.cpp", ["OpsV390ActionExecutionDeferralDecisionJson", "/ops/api/actions/execution-deferral-decision", "approvalGatedExecutionEnabled", "actionExecutionPerformed"]),
      anchor("src/ingress/product_ui_action_execution_deferral.cpp", ["renderV390ActionExecutionDeferralDecision", "dashActionExecutionDeferralText", "dashActionExecutionDeferralBoundary"]),
    ],
    uiRoute: "/ops/dashboard",
    uiSelectors: ["[data-testid=\"ops-action-execution-deferral-decision\"]", "#dashActionExecutionDeferralText", "#dashActionExecutionDeferralBoundary"],
    boundaryFields: ["approvalGatedExecutionEnabled=false", "actionExecutionPerformed=false", "externalDeliveryPerformed=false"],
    verifierCommands: ["./server.sh verify-v390-action-execution-deferral-decision"],
    dependencyIds: ["action-write-contract", "authorization-audit-rollback", "execution-evidence-plan"],
  }],
  ["persistent-credential-store", {
    functionalOwnerRole: "Security Owner",
    decision: "excluded-from-v3.9",
    implementationStatus: "deferred-capability-not-implemented",
    capabilityStatus: {
      sanitizedStatusSummaryStatus: "implemented",
      inMemoryFixtureFallbackStatus: "implemented",
      persistentStoreStatus: "not-implemented",
      currentReleaseIntegrationEvidenceStatus: "not-run",
    },
    route: "/ops/api/onvif/credential-provider-status",
    method: "GET",
    schema: "media-server.ops.v390-onvif-credential-provider-status.v1",
    sourceAnchors: [
      anchor("src/ingress/webrtc_http_server_ops_foundation.cpp", ["OpsV390OnvifCredentialProviderStatusSummaryJson", "/ops/api/onvif/credential-provider-status", "productPersistentSecretStoreEnabled", "secretMaterialStored"]),
      anchor("src/ingress/product_ui_ops_sources_script.cpp", ["renderOnvifCredentialProviderStatus", "onvifCredentialGateStatus", "persistent store deferred"]),
    ],
    uiRoute: "/ops/sources",
    uiSelectors: ["#onvifCredentialGateStatus"],
    boundaryFields: ["productPersistentSecretStoreEnabled=false", "secretMaterialStored=false", "credentialMaterialExposed=false"],
    verifierCommands: ["./server.sh verify-v390-onvif-credential-provider-status"],
    dependencyIds: ["secret-backend-selection", "rotation-revocation-recovery-policy", "secret-negative-integration-evidence"],
  }],
  ["production-restore", {
    functionalOwnerRole: "Operations and Release Owner",
    decision: "excluded-from-v3.9",
    implementationStatus: "product-automation-not-implemented",
    capabilityStatus: {
      operationalRunbookStatus: "documented",
      stagingValidationStatus: "implemented",
      productRestoreAutomationStatus: "not-implemented",
      productionCutoverEvidenceStatus: "not-run",
    },
    route: "/ops/api/source-registry/staging-restore-validation-handoff",
    method: "GET",
    schema: "media-server.ops.v390-staging-restore-validation-handoff.v1",
    sourceAnchors: [
      anchor("src/ingress/webrtc_http_server_runtime.cpp", ["/ops/api/source-registry/staging-restore-validation-handoff", "OpsV390StagingRestoreValidationHandoffJson"]),
      anchor("src/ingress/webrtc_http_server_ops_foundation.cpp", ["OpsV390StagingRestoreValidationHandoffJson", "media-server.ops.v390-staging-restore-validation-handoff.v1", "productionRestorePerformed", "automaticRecoveryPerformed"]),
      anchor("src/ingress/product_ui_ops_sources_script.cpp", ["renderStagingRestoreValidationHandoff", "sourceStagingRestoreValidationStatus", "productionRestorePerformed"]),
      anchor("src/ingress/webrtc_http_server.cpp", ["data-source-staging-restore-validation-handoff", "sourceStagingRestoreValidationStatus"]),
      anchor("docs/ops-backup-recovery.md", ["staging", "restore"]),
    ],
    uiRoute: "/ops/sources",
    uiSelectors: ["[data-source-staging-restore-validation-handoff=\"media-server.ops.v390-staging-restore-validation-handoff.v1\"]", "#sourceStagingRestoreValidationStatus"],
    boundaryFields: ["productionRestorePerformed=false", "automaticRecoveryPerformed=false", "sourceRegistryWritePerformed=false"],
    verifierCommands: ["./server.sh verify-v390-backup-recovery-handoff-validation"],
    dependencyIds: ["production-cutover-approval", "backup-restore-integrity-evidence", "rollback-and-field-validation"],
  }],
  ["external-vlm-provider-call", {
    functionalOwnerRole: "Privacy and Security Owner",
    decision: "excluded-from-v3.9",
    implementationStatus: "product-runtime-call-not-implemented",
    capabilityStatus: {
      productRuntimeProviderCallStatus: "forbidden-and-not-implemented",
      conditionalFieldHarnessStatus: "implemented",
      currentFieldRunStatus: "not-run",
    },
    route: "/ops/api/field-evidence/bridge-decision",
    method: "GET",
    schema: "media-server.ops.v390-field-evidence-bridge-decision.v1",
    sourceAnchors: [
      anchor("src/ingress/webrtc_http_server_ops_workflows.cpp", ["OpsV390FieldEvidenceBridgeDecisionJson", "/ops/api/field-evidence/bridge-decision", "cloudProviderCalled", "vlmProviderCalled"]),
      regionAnchor("external-vlm-provider-call", productUiPageScriptsPath, ["renderV390FieldEvidenceBridgeDecision", "dashFieldEvidenceBridgeText", "dashFieldEvidenceBridgeBoundary"]),
      regionAnchor("external-vlm-provider-call", productUiServerPagesPath, ["ops-field-evidence-bridge-decision", "dashFieldEvidenceBridgeText", "dashFieldEvidenceBridgeBoundary"]),
      anchor("scripts/internal/verify_vlm_cloud_provider_field_smoke_gate.mjs", ["approval", "provider"]),
    ],
    uiRoute: "/ops/dashboard",
    uiSelectors: ["[data-testid=\"ops-field-evidence-bridge-decision\"]", "#dashFieldEvidenceBridgeText", "#dashFieldEvidenceBridgeBoundary"],
    boundaryFields: ["providerCallAllowed=false", "cloudProviderCalled=false", "vlmProviderCalled=false"],
    verifierCommands: ["./server.sh verify-v390-conditional-field-ai-decisions", "./server.sh verify-vlm-cloud-provider-field-smoke-gate --help"],
    dependencyIds: ["data-transfer-retention-approval", "provider-credential-budget-policy", "redaction-field-evidence"],
  }],
  ["model-backed-reid-session", {
    functionalOwnerRole: "Product and ML Owner",
    decision: "excluded-from-v3.9-supported-release-scope",
    implementationStatus: "experimental-capability-implemented-release-evidence-not-executed",
    capabilityStatus: {
      sourceCapabilityStatus: "implemented-opt-in-experimental",
      defaultEnabled: false,
      supportedReleaseScope: "excluded",
      modelBundleStatus: "not-included",
      actualSessionEvidenceStatus: "not-run",
    },
    route: "/ops/api/analysis/reid-assist-decision",
    method: "GET",
    schema: "media-server.ops.v390-reid-assist-decision.v1",
    sourceAnchors: [
      anchor("src/ingress/webrtc_http_server_ops_workflows.cpp", ["OpsV390ReidAssistDecisionJson", "/ops/api/analysis/reid-assist-decision", "modelSessionLoadPerformed", "modelBackedExecutionPerformed"]),
      anchor("src/analysis/appearance_extractor.cpp", ["ExperimentalOnnxReidExtractor", "session_->Run", "CreateAppearanceExtractorFromConfig"]),
      anchor("src/analysis/analysis_manager.cpp", ["CreateAppearanceExtractorFromConfig"]),
      regionAnchor("model-backed-reid-session", productUiPageScriptsPath, ["renderV390ReidAssistDecision", "dashReidAssistDecisionText", "dashReidAssistDecisionBoundary"]),
      regionAnchor("model-backed-reid-session", productUiServerPagesPath, ["ops-reid-assist-decision", "dashReidAssistDecisionText", "dashReidAssistDecisionBoundary"]),
    ],
    uiRoute: "/ops/dashboard",
    uiSelectors: ["[data-testid=\"ops-reid-assist-decision\"]", "#dashReidAssistDecisionText", "#dashReidAssistDecisionBoundary"],
    boundaryFields: ["defaultEnabled=false", "modelSessionLoadPerformed=false", "modelBackedExecutionPerformed=false"],
    verifierCommands: ["./server.sh verify-v390-reid-readiness-consistency"],
    dependencyIds: ["model-bundle-license-approval", "privacy-retention-approval", "session-performance-field-evidence"],
  }],
]);

if (sourceRegionContractMode) {
  runSourceRegionContract();
}

const checks = [];

check("v3 decision record binds the effective repository owner and current goal attestation", () => {
  assert(fs.existsSync(fixturePath), "missing deferred owner sign-off fixture");
  const fixture = loadFixture();
  const effectiveOwners = effectiveCodeownersFor(fixtureRelativePath);
  assertExactArray(effectiveOwners, [accountableHandle], "effective CODEOWNERS");
  validateHeader(fixture, effectiveOwners);
});

check("exact five decisions preserve truthful capability and execution status", () => {
  validateDecisions(loadFixture());
});

check("decision evidence resolves to current source, route, UI, boundary, and verifier owners", () => {
  validateEvidence(loadFixture());
});

check("negative variants reject role-only, field-smoke substitution, owner drift, future scheduling, and Re-ID false claims", () => {
  const fixture = loadFixture();
  expectRejected(mutate(fixture, draft => { delete draft.decisions[0].accountableSubjectRef; }), "role-only owner record");
  expectRejected(mutate(fixture, draft => { draft.decisions[2].id = "real-external-field-smoke"; }), "field-smoke substitution");
  expectRejected(mutate(fixture, draft => { draft.approvalAuthority.accountableSubject.handle = "@invented-owner"; }), "invented owner");
  expectRejected(mutate(fixture, draft => { draft.decisions[0].followup.scheduled = true; }), "unapproved future scheduling");
  expectRejected(mutate(fixture, draft => { draft.decisions[4].implementationStatus = "not-executed"; }), "Re-ID entire capability false claim");
  expectRejected(mutate(fixture, draft => { draft.decisions[2].capabilityStatus.stagingValidationStatus = "not-implemented"; }), "staging restore false claim");
  expectRejected(mutate(fixture, draft => { draft.decisions[3].capabilityStatus.conditionalFieldHarnessStatus = "not-implemented"; }), "field harness false claim");
  expectRejected(mutate(fixture, draft => { draft.decisions[1].followup.dependencies = []; }), "missing dependency contract");
});

check("roadmap, inventory, evidence, and plan record REVIEW4-63 without false PASS", () => {
  const sources = [
    ["feature inventory", "docs/v390-feature-completion-inventory.md", ["## Deferred Product Owner Sign-off (Development 16 / REVIEW4-63)", accountableHandle, "repository-scoped-product-scope-attestation", approvalSource, "post-v3.9-unassigned", "production-restore", "implemented-opt-in-experimental"]],
    ["backlog", "docs/development-backlog.md", ["V390-REVIEW4-63", "실제 책임자 `@dhseo90`", "외부 field smoke는 별도 조건부"]],
    ["project inventory", "docs/project-feature-test-inventory.md", ["SAFE-214", "OPS-181", accountableHandle, "production restore", "model-backed Re-ID"]],
    ["stream verification", "docs/stream-verification.md", [command, "REVIEW4-63", "repository-code-owner"]],
    ["release evidence", "docs/release-evidence-index.md", ["REVIEW4-63", accountableHandle, "production restore"]],
    ["release records", "docs/release-test-records.md", ["V390-REVIEW4-63", "UI/30분/120분/field 미실행"]],
    ["implementation plan", "docs/superpowers/plans/2026-07-12-v390-review4-50-62.md", ["[x] 63", accountableHandle, "post-v3.9-unassigned"]],
  ];
  for (const [label, relativePath, snippets] of sources) {
    const contents = read(relativePath);
    for (const snippet of snippets) {
      assert(contents.includes(snippet), `${label} missing snippet: ${snippet}`);
    }
  }
});

check("server dispatch and script inventory expose the verifier", () => {
  const server = read("server.sh");
  const inventory = read("scripts/internal/verify_script_inventory.mjs");
  for (const snippet of [command, targetScript]) {
    assert(server.includes(snippet), `server.sh missing ${snippet}`);
  }
  assert(inventory.includes("user-facing JS option parsers reject unknown options"), "script inventory option gate missing");
});

const failed = checks.filter(item => !item.ok);
for (const item of checks) {
  console.log(`[${item.ok ? "pass" : "fail"}] ${item.name}${item.error ? `: ${item.error}` : ""}`);
}
console.log("\n== v3.9.0 REVIEW4-63 accountable deferred product owner sign-off ==");
console.log(`- accountableSubject: ${accountableHandle} (repository-code-owner)`);
console.log(`- decisions: ${expected.size}`);
console.log("- followupAssignment: post-v3.9-unassigned / scheduled=false");
console.log("- externalFieldSmoke: separate conditional-not-run");
console.log("- implementation/field/release/UI/longrun PASS claimed: false");
console.log(`- pass: ${checks.length - failed.length}`);
console.log(`- fail: ${failed.length}`);
process.exit(failed.length === 0 ? 0 : 1);

function validateHeader(fixture, effectiveOwners) {
  assert(fixture.schema === "media-server.v390-deferred-product-owner-signoff.v3", "unexpected fixture schema");
  assert(fixture.release === "v3.9.0", "fixture release must be v3.9.0");
  assert(fixture.developmentItem === 16 && fixture.review4Item === 63, "Development 16 / REVIEW4-63 identity mismatch");
  assert(fixture.recordKind === "accountable-owner-decision-record", "record kind must be accountable-owner-decision-record");
  assert(fixture.implementationStatus === "decision-record-complete-capabilities-mixed", "top-level implementation status must preserve mixed capability truth");
  assert(fixture.evidenceStatus === "decision-only-not-implementation-or-execution-evidence", "top-level evidence status mismatch");
  assert(fixture.ownerIdentityPolicy === "codeowners-handle-plus-functional-role-no-personal-name-or-organizational-authority-inference", "owner identity policy mismatch");
  const subject = fixture.approvalAuthority?.accountableSubject;
  assert(subject?.id === "repo-owner-v1", "accountable subject id mismatch");
  assert(subject?.kind === "repository-code-owner", "accountable subject kind mismatch");
  assert(subject?.handle === accountableHandle, "accountable subject handle mismatch");
  assert(subject?.authorityScope === "repository-scoped-product-scope-attestation", "accountable authority scope mismatch");
  assert(subject?.source === ".github/CODEOWNERS", "accountable subject source mismatch");
  assert(subject?.effectivePattern === "*", "accountable CODEOWNERS pattern mismatch");
  assertExactArray(subject?.effectiveOwners, effectiveOwners, "recorded effective CODEOWNERS");
  assertExactArray(subject?.notClaimed, ["personal-identity", "organizational-role-delegation", "employment-relationship", "security-privacy-ml-certification"], "owner non-claims");
  const attestation = fixture.approvalAuthority?.attestation;
  assert(attestation?.status === "accepted-by-current-goal", "attestation status mismatch");
  assert(attestation?.source === approvalSource, "approval source must identify the current user goal");
  assert(attestation?.sourceDigest === sha256(approvalSource), "approval source digest mismatch");
  assert(attestation?.recordedDate === "2026-07-13", "approval date must be 2026-07-13");
  assert(attestation?.reviewItem === 63, "attestation review item mismatch");
  assert(attestation?.evidenceStatus === "user-directive-recorded-not-cryptographically-verifiable", "attestation evidence boundary mismatch");
  assert(fixture.externalFieldSmoke?.includedInDeferredDecisionSet === false, "field smoke must remain outside the exact decision set");
  assert(fixture.externalFieldSmoke?.status === "conditional-not-run", "field smoke status must remain conditional-not-run");
  assert(fixture.externalFieldSmoke?.fixture === "test/fixtures/v390_external_field_smoke_no_device_closure.json", "field smoke fixture link mismatch");
  assert(fixture.externalFieldSmoke?.verifier === "./server.sh verify-v390-external-field-smoke-no-device-closure", "field smoke verifier link mismatch");
}

function validateDecisions(fixture) {
  validateHeader(fixture, effectiveCodeownersFor(fixtureRelativePath));
  assert(Array.isArray(fixture.decisions) && fixture.decisions.length === expected.size, "exactly five decisions are required");
  const actualIds = new Set();
  for (const decision of fixture.decisions) {
    assert(expected.has(decision.id), `unexpected deferred item: ${decision.id}`);
    assert(!actualIds.has(decision.id), `duplicate deferred item: ${decision.id}`);
    actualIds.add(decision.id);
    const spec = expected.get(decision.id);
    assert(decision.functionalOwnerRole === spec.functionalOwnerRole, `${decision.id}: functional owner role mismatch`);
    const decisionOwnerSubjectRef = decision.accountableSubjectRef;
    const accountableOwnerBound = decisionOwnerSubjectRef === "repo-owner-v1";
    const accountableOwnerDecisionBound = accountableOwnerBound && decisionOwnerSubjectRef === "repo-owner-v1";
    assert(accountableOwnerDecisionBound,
      `${decision.id}: missing accountable subject reference`);
    assert(decision.approvalStatus === "attested-current-goal", `${decision.id}: approval status mismatch`);
    assert(decision.decision === spec.decision, `${decision.id}: v3.9 decision mismatch`);
    assert(decision.implementationStatus === spec.implementationStatus, `${decision.id}: implementation status mismatch`);
    assert(deepEqual(decision.capabilityStatus, spec.capabilityStatus), `${decision.id}: capability status mismatch`);
    const falsePassClaimed = decision.fieldPassClaimed === true || decision.releasePassClaimed === true ||
      decision.uiFulltestPassClaimed === true || decision.longrunPassClaimed === true;
    const executionTruthful = decision.executionStatus === "not-executed" && falsePassClaimed === false;
    assert(executionTruthful && falsePassClaimed === false,
      `${decision.id}: current execution and field/release/UI/longrun PASS claims must remain false`);
    assert(typeof decision.rationale === "string" && decision.rationale.length >= 80, `${decision.id}: rationale is incomplete`);
    const followup = decision.followup;
    assert(followup?.assignment === "post-v3.9-unassigned", `${decision.id}: follow-up assignment mismatch`);
    assert(followup?.scheduled === false, `${decision.id}: an unapproved future release must not be scheduled`);
    assert(followup?.targetVersion === null, `${decision.id}: target version must remain unassigned`);
    assert(followup?.dependencyStatus === "blocked-until-reopen-conditions-approved", `${decision.id}: dependency status mismatch`);
    assert(Array.isArray(followup?.dependencies) && followup.dependencies.length === spec.dependencyIds.length, `${decision.id}: dependency count mismatch`);
    assertExactArray(followup.dependencies.map(item => item.id), spec.dependencyIds, `${decision.id}: dependency ids`);
    for (const dependency of followup.dependencies) {
      assert(typeof dependency.ownerRole === "string" && dependency.ownerRole.length >= 5, `${decision.id}/${dependency.id}: dependency owner role missing`);
      assert(typeof dependency.approvalCondition === "string" && dependency.approvalCondition.length >= 30, `${decision.id}/${dependency.id}: approval condition missing`);
      assert(typeof dependency.verificationCondition === "string" && dependency.verificationCondition.length >= 30, `${decision.id}/${dependency.id}: verification condition missing`);
    }
    assertExactArray(followup.reopenConditions, spec.dependencyIds, `${decision.id}: structured reopen conditions`);
  }
  assert(actualIds.size === expected.size, "deferred decision set is incomplete");
  assert(!actualIds.has("real-external-field-smoke"), "external field smoke must not replace production restore");
}

function validateEvidence(fixture) {
  validateDecisions(fixture);
  validateMigratedProductUiRegionCoverage(fixture);
  const server = read("server.sh");
  for (const decision of fixture.decisions) {
    const spec = expected.get(decision.id);
    const evidence = decision.evidence;
    assert(evidence?.route === spec.route, `${decision.id}: route evidence mismatch`);
    assert(evidence?.method === spec.method, `${decision.id}: method evidence mismatch`);
    assert(evidence?.schema === spec.schema, `${decision.id}: schema evidence mismatch`);
    assert(evidence?.uiRoute === spec.uiRoute, `${decision.id}: UI route evidence mismatch`);
    assertExactArray(evidence?.uiSelectors, spec.uiSelectors, `${decision.id}: UI selectors`);
    assertExactArray(evidence?.boundaryFields, spec.boundaryFields, `${decision.id}: boundary fields`);
    assertExactArray(evidence?.verifierCommands, spec.verifierCommands, `${decision.id}: verifier commands`);
    assert(Array.isArray(evidence?.documentation) && evidence.documentation.length >= 1, `${decision.id}: documentation evidence missing`);
    for (const relativePath of evidence.documentation) {
      assert(fs.existsSync(path.join(rootDir, relativePath)), `${decision.id}: missing documentation ${relativePath}`);
    }
    assert(Array.isArray(evidence?.sourceAnchors) && evidence.sourceAnchors.length === spec.sourceAnchors.length, `${decision.id}: source anchor count mismatch`);
    for (let index = 0; index < spec.sourceAnchors.length; index += 1) {
      const actualAnchor = evidence.sourceAnchors[index];
      const expectedAnchor = spec.sourceAnchors[index];
      assert(actualAnchor.file === expectedAnchor.file, `${decision.id}: source anchor file mismatch at ${index}`);
      assertExactArray(actualAnchor.requiredTokens, expectedAnchor.requiredTokens, `${decision.id}: source anchor tokens at ${index}`);
      const source = read(actualAnchor.file);
      if (expectedAnchor.sourceRegion) {
        assert(!Object.hasOwn(actualAnchor, "sourceFileSha256"), `${decision.id}: migrated source anchor must not use whole-file hash fallback`);
        assert(deepEqual(actualAnchor.sourceRegion, expectedAnchor.sourceRegion), `${decision.id}: source region binding mismatch at ${actualAnchor.file}`);
        validateSourceRegionBinding(source, actualAnchor.sourceRegion, actualAnchor.requiredTokens, `${decision.id}: ${actualAnchor.file}`);
      } else {
        assert(!Object.hasOwn(actualAnchor, "sourceRegion"), `${decision.id}: unexpected source region binding at ${actualAnchor.file}`);
        assert(actualAnchor.sourceFileSha256 === sha256(source), `${decision.id}: source file digest drift at ${actualAnchor.file}`);
        for (const token of actualAnchor.requiredTokens) {
          assert(source.includes(token), `${decision.id}: source anchor missing ${token} in ${actualAnchor.file}`);
        }
      }
    }
    for (const selector of evidence.uiSelectors) {
      const selectorTokens = selectorSourceTokens(selector);
      const sourceFound = evidence.sourceAnchors.some(item => {
        const source = read(item.file);
        return selectorTokens.some(token => source.includes(token));
      });
      assert(sourceFound, `${decision.id}: UI selector is not source-backed: ${selector}`);
    }
    for (const boundary of evidence.boundaryFields) {
      const [field, value] = boundary.split("=");
      const escapedCpp = `\\\"${field}\\\":${value}`;
      const jsonStyle = `\"${field}\": ${value}`;
      const sourceFound = evidence.sourceAnchors.some(item => {
        const source = read(item.file);
        return source.includes(boundary) || source.includes(escapedCpp) || source.includes(jsonStyle) || source.includes(field);
      });
      assert(sourceFound, `${decision.id}: boundary is not source-backed: ${boundary}`);
    }
    for (const verifierCommand of evidence.verifierCommands) {
      const name = verifierCommand.split(/\s+/)[1];
      assert(name?.startsWith("verify-"), `${decision.id}: malformed verifier command ${verifierCommand}`);
      assert(server.includes(name), `${decision.id}: server dispatch missing ${name}`);
    }
  }
}

function effectiveCodeownersFor(relativePath) {
  const entries = read(".github/CODEOWNERS")
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line && !line.startsWith("#"))
    .map(line => {
      const [pattern, ...owners] = line.split(/\s+/);
      return { pattern, owners };
    });
  const matches = entries.filter(entry => codeownersPatternMatches(entry.pattern, relativePath));
  assert(matches.length > 0, `no effective CODEOWNERS rule for ${relativePath}`);
  const effective = matches.at(-1);
  assert(effective.pattern === "*", `effective CODEOWNERS rule drifted: ${effective.pattern}`);
  return effective.owners;
}

function codeownersPatternMatches(pattern, relativePath) {
  if (pattern === "*") return true;
  const normalized = pattern.replace(/^\//, "");
  if (normalized.endsWith("/**")) return relativePath.startsWith(normalized.slice(0, -3));
  if (normalized.endsWith("/")) return relativePath.startsWith(normalized);
  return normalized === relativePath;
}

function selectorSourceTokens(selector) {
  if (selector.startsWith("#")) return [selector, selector.slice(1)];
  const attribute = /^\[([^=]+)=\"([^\"]+)\"\]$/.exec(selector);
  if (attribute) {
    const [, name, value] = attribute;
    return [selector, `${name}=\"${value}\"`, `${name}=\\\"${value}\\\"`];
  }
  return [selector];
}

function anchor(file, requiredTokens) {
  return { file, requiredTokens };
}

function regionAnchor(decisionId, file, requiredTokens) {
  return {
    file,
    requiredTokens,
    sourceRegion: productUiSourceRegions[decisionId][file],
  };
}

function validateMigratedProductUiRegionCoverage(fixture) {
  const migratedIds = Object.keys(productUiSourceRegions);
  const decisions = new Map((fixture.decisions || []).map(item => [item.id, item]));
  for (const decisionId of migratedIds) {
    const decision = decisions.get(decisionId);
    assert(decision, `missing migrated decision ${decisionId}`);
    for (const file of Object.keys(productUiSourceRegions[decisionId])) {
      const anchors = (decision.evidence?.sourceAnchors || []).filter(item => item.file === file);
      assert(anchors.length === 1, `${decisionId}: expected exactly one migrated source anchor for ${file}`);
      const [sourceAnchor] = anchors;
      assert(sourceAnchor.sourceRegion && typeof sourceAnchor.sourceRegion === "object", `${decisionId}: source region binding missing for ${file}`);
      assert(!Object.hasOwn(sourceAnchor, "sourceFileSha256"), `${decisionId}: migrated source anchor must not retain whole-file hash fallback for ${file}`);
    }
  }
}

function validateSourceRegionBinding(source, binding, requiredTokens, label) {
  assert(binding && typeof binding === "object", `${label}: source region binding missing`);
  const startLocator = typeof binding.startLocator === "string" ? binding.startLocator : "";
  const endLocator = typeof binding.endLocator === "string" ? binding.endLocator : "";
  assert(startLocator.trim().length > 0, `${label}: start locator missing`);
  assert(endLocator.trim().length > 0, `${label}: end locator missing`);
  assert(startLocator !== endLocator, `${label}: source region locators must differ`);
  const startIndexes = allIndexesOf(source, startLocator);
  const endIndexes = allIndexesOf(source, endLocator);
  assert(startIndexes.length === 1, `${label}: start locator must occur exactly once`);
  assert(endIndexes.length === 1, `${label}: end locator must occur exactly once`);
  const startIndex = startIndexes[0];
  const endIndex = endIndexes[0];
  assert(startIndex < endIndex, `${label}: source region locators are reversed`);
  const body = source.slice(startIndex + startLocator.length, endIndex);
  assert(body.trim().length > 0, `${label}: source region body is empty`);
  const region = source.slice(startIndex, endIndex);
  assert(/^[a-f0-9]{64}$/.test(String(binding.regionSha256 || "")), `${label}: source region digest format invalid`);
  assert(sha256(region) === binding.regionSha256, `${label}: source region digest drift`);
  assert(Array.isArray(requiredTokens) && requiredTokens.length > 0, `${label}: required tokens missing`);
  for (const token of requiredTokens) {
    assert(typeof token === "string" && token.length > 0, `${label}: required token invalid`);
    assert(region.includes(token), `${label}: required token outside bounded region: ${token}`);
  }
  return { region, startIndex, endIndex };
}

function allIndexesOf(source, locator) {
  const indexes = [];
  let cursor = 0;
  while (cursor <= source.length - locator.length) {
    const index = source.indexOf(locator, cursor);
    if (index < 0) break;
    indexes.push(index);
    cursor = index + locator.length;
  }
  return indexes;
}

function runSourceRegionContract() {
  const contractChecks = [];
  const fixture = loadFixture();
  const source = read(productUiPageScriptsPath);
  const decision = fixture.decisions.find(item => item.id === "external-vlm-provider-call");
  const sourceAnchor = decision?.evidence?.sourceAnchors?.find(item => item.file === productUiPageScriptsPath);
  assert(sourceAnchor, "contract fixture field source anchor missing");

  contractCheck(contractChecks, "unrelated source region change preserves the bounded digest", () => {
    validateSourceRegionBinding(`// unrelated event-rule UI region\n${source}`, sourceAnchor.sourceRegion, sourceAnchor.requiredTokens, "unrelated-region");
  });
  contractCheck(contractChecks, "bounded source region content change is rejected", () => {
    const changed = source.replace(sourceAnchor.sourceRegion.startLocator,
      `${sourceAnchor.sourceRegion.startLocator}\n        // semantic mutation inside bounded region`);
    expectRegionRejected(changed, sourceAnchor.sourceRegion, sourceAnchor.requiredTokens, "bounded-region-change");
  });
  contractCheck(contractChecks, "required token moved outside the bounded region is rejected", () => {
    const token = "dashFieldEvidenceBridgeText";
    const extracted = extractSourceRegion(source, sourceAnchor.sourceRegion, "required-token-move");
    const changedRegion = extracted.region.replaceAll(token, "dashFieldEvidenceBridgeMovedText");
    const changed = `${source.slice(0, extracted.startIndex)}${changedRegion}${source.slice(extracted.endIndex)}\n// ${token}\n`;
    const changedBinding = { ...sourceAnchor.sourceRegion, regionSha256: sha256(changedRegion) };
    expectRegionRejected(changed, changedBinding, sourceAnchor.requiredTokens, "required-token-move");
  });
  contractCheck(contractChecks, "stale source region digest is rejected", () => {
    expectRegionRejected(source, { ...sourceAnchor.sourceRegion, regionSha256: "0".repeat(64) }, sourceAnchor.requiredTokens, "stale-region-digest");
  });
  contractCheck(contractChecks, "missing and duplicate locators are rejected", () => {
    const missing = source.replace(sourceAnchor.sourceRegion.startLocator, "missing-field-render-locator");
    expectRegionRejected(missing, sourceAnchor.sourceRegion, sourceAnchor.requiredTokens, "missing-locator");
    const duplicate = `${source}\n${sourceAnchor.sourceRegion.startLocator}\n`;
    expectRegionRejected(duplicate, sourceAnchor.sourceRegion, sourceAnchor.requiredTokens, "duplicate-locator");
  });
  contractCheck(contractChecks, "reversed and empty source regions are rejected", () => {
    const reverseSource = `${sourceAnchor.sourceRegion.endLocator}\nbody\n${sourceAnchor.sourceRegion.startLocator}`;
    expectRegionRejected(reverseSource, { ...sourceAnchor.sourceRegion, regionSha256: "0".repeat(64) }, sourceAnchor.requiredTokens, "reversed-locators");
    const emptySource = `${sourceAnchor.sourceRegion.startLocator}${sourceAnchor.sourceRegion.endLocator}`;
    expectRegionRejected(emptySource, { ...sourceAnchor.sourceRegion, regionSha256: "0".repeat(64) }, sourceAnchor.requiredTokens, "empty-region");
  });
  contractCheck(contractChecks, "both migrated decisions must use source region bindings", () => {
    const partial = structuredClone(fixture);
    const reid = partial.decisions.find(item => item.id === "model-backed-reid-session");
    for (const reidAnchor of reid.evidence.sourceAnchors.filter(item => Object.hasOwn(productUiSourceRegions[reid.id], item.file))) {
      delete reidAnchor.sourceRegion;
      reidAnchor.sourceFileSha256 = sha256(read(reidAnchor.file));
    }
    let rejected = false;
    try {
      validateMigratedProductUiRegionCoverage(partial);
    } catch {
      rejected = true;
    }
    assert(rejected, "partial migration of only one decision was accepted");
  });

  const failed = contractChecks.filter(item => !item.ok);
  for (const item of contractChecks) {
    console.log(`[${item.ok ? "pass" : "fail"}] ${item.name}${item.error ? `: ${item.error}` : ""}`);
  }
  console.log("\n== v3.9.0 deferred owner source-region contract ==");
  console.log(`- pass: ${contractChecks.length - failed.length}`);
  console.log(`- fail: ${failed.length}`);
  process.exit(failed.length === 0 ? 0 : 1);
}

function extractSourceRegion(source, binding, label) {
  const startIndexes = allIndexesOf(source, binding.startLocator);
  const endIndexes = allIndexesOf(source, binding.endLocator);
  assert(startIndexes.length === 1, `${label}: start locator must occur exactly once`);
  assert(endIndexes.length === 1, `${label}: end locator must occur exactly once`);
  assert(startIndexes[0] < endIndexes[0], `${label}: source region locators are reversed`);
  return {
    region: source.slice(startIndexes[0], endIndexes[0]),
    startIndex: startIndexes[0],
    endIndex: endIndexes[0],
  };
}

function expectRegionRejected(source, binding, requiredTokens, label) {
  let rejected = false;
  try {
    validateSourceRegionBinding(source, binding, requiredTokens, label);
  } catch {
    rejected = true;
  }
  assert(rejected, `${label}: invalid source region was accepted`);
}

function contractCheck(contractChecks, name, fn) {
  try {
    fn();
    contractChecks.push({ name, ok: true });
  } catch (error) {
    contractChecks.push({ name, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}

function loadFixture() {
  return JSON.parse(fs.readFileSync(fixturePath, "utf8"));
}

function expectRejected(fixture, label) {
  let rejected = false;
  try {
    validateEvidence(fixture);
  } catch {
    rejected = true;
  }
  assert(rejected, `negative fixture accepted: ${label}`);
}

function mutate(value, fn) {
  const draft = structuredClone(value);
  fn(draft);
  return draft;
}

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function deepEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function assertExactArray(actual, expectedValues, label) {
  assert(Array.isArray(actual), `${label} must be an array`);
  assert(deepEqual(actual, expectedValues), `${label} mismatch`);
}

function check(name, fn) {
  try {
    fn();
    checks.push({ name, ok: true });
  } catch (error) {
    checks.push({ name, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
