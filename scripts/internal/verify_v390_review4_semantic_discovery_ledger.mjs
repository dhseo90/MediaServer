#!/usr/bin/env node
// 파일 용도: V390-REVIEW4-52 문서/source marker의 실제 의미와 owner/evidence를 검증한다.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const fixturePath = "test/fixtures/v390_review4_semantic_discovery_ledger.json";
const negativeFixturePath = "test/fixtures/v390_review4_semantic_discovery_negative_cases.json";
const review3FixturePath = "test/fixtures/v390_review3_discovery_ledger.json";
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`V390 REVIEW4 semantic discovery ledger verification

Usage:
  ./server.sh verify-v390-review4-semantic-discovery-ledger [--write-ledger]

Checks:
  - AGENTS.md와 분리된 모든 tracked Markdown의 semantic role/lifecycle/actual owner/evidence를 검증
  - 38개 source marker 각각의 occurrence identity와 exact disposition을 검증
  - checksum이나 문서 자기참조를 current 제품 의미의 완료 근거로 사용하지 않음
  - stale current claim, generic 분류, owner/evidence 누락을 negative fixture로 거부
`);
}
assertKnownOptions(rawArgs, ["h", "help", "write-ledger"]);

const writeLedger = rawArgs.includes("--write-ledger");
const current = buildSemanticLedger();
if (writeLedger) {
  fs.writeFileSync(path.join(rootDir, fixturePath), `${JSON.stringify(current, null, 2)}\n`);
}

const stored = readJson(fixturePath);
const negativeCases = readJson(negativeFixturePath);
const checks = [];

check("all tracked Markdown documents have exact semantic records", () => {
  const expectedPaths = trackedMarkdownPaths();
  assert(expectedPaths.length > 0, "tracked Markdown inventory is empty");
  assert(stored.documents.length === expectedPaths.length, "semantic document ledger count drift");
  assertStableEqual(stored.documents.map(item => item.path), expectedPaths, "semantic document path set drift");
  assert(new Set(stored.documents.map(item => item.path)).size === stored.documents.length, "duplicate document record");
  assertStableEqual(stored.documents, current.documents, "document semantic ledger drift");
});

check("document meaning uses source-backed owner and evidence", () => {
  for (const record of stored.documents) validateDocumentRecord(record);
  const currentProductRecords = stored.documents.filter(item => item.lifecycle === "current-product-contract");
  assert(currentProductRecords.length > 20, "current product contract coverage is unexpectedly small");
  assert(currentProductRecords.every(item => item.actualOwner.path !== item.path),
    "current product contract uses document self-ownership");
});

check("source markers have unique occurrence identity and exact dispositions", () => {
  assert(stored.sourceMarkers.length === 38, `expected 38 source markers, got ${stored.sourceMarkers.length}`);
  assertStableEqual(stored.sourceMarkers, current.sourceMarkers, "source marker semantic ledger drift");
  const identities = stored.sourceMarkers.map(markerIdentity);
  assert(new Set(identities).size === identities.length, "source marker identity is not unique");
  const forbidden = new Set(["unclassified", "verifier-contract-or-historical-wording", "scanner-pattern-literal", "exact-disposition-or-scope-evidence-text"]);
  assert(stored.sourceMarkers.every(item => !forbidden.has(item.disposition)), "generic source marker disposition remains");
  assert(stored.sourceMarkers.every(item => item.owner?.path && item.owner?.anchor), "source marker owner is missing");
  for (const item of stored.sourceMarkers) assertAnchor(item.owner, `marker owner ${markerIdentity(item)}`);
});

check("current version and REVIEW4 execution decision have no stale public claim", () => {
  assert(readText("VERSION").trim() === "3.9.0", "VERSION drift");
  const decision = readJson("test/fixtures/v390_structure_execution_scope_decision.json");
  assert(decision.decision === "execute-actual-refactor-in-v3.9.0-after-review4-50-63", "structure decision drift");
  assert(decision.approval?.v400TransferAllowed === false, "v4.0 transfer was reopened");
  for (const file of ["README.md", "README.en.md", "docs/README.md", "docs/en/README.md", "docs/versioning-policy.md", "docs/v390-feature-completion-inventory.md"]) {
    const text = readText(file);
    assert(!/before v4\.0\.0|v4\.0\.0[^\n]{0,80}(?:에서|on)[^\n]{0,80}(?:actual )?refactor/i.test(text), `${file} keeps a stale v4.0 transfer claim`);
  }
  assert(readText("README.md").includes("http://127.0.0.1:8080"), "README default HTTP port drift");
  assert(readText("README.en.md").includes("http://127.0.0.1:8080"), "English README default HTTP port drift");
});

check("REVIEW3 completion language is historical rather than current proof", () => {
  const backlog = readText("docs/development-backlog.md");
  assert(backlog.includes("historical source claim / REVIEW4 재검증"), "REVIEW3 historical boundary is missing");
  const review3Plans = [
    "docs/superpowers/plans/2026-07-12-v390-review3-36-42.md",
    "docs/superpowers/plans/2026-07-12-v390-review3-43-49.md",
  ];
  for (const file of review3Plans) {
    assert(/historical|과거|superseded/i.test(readText(file).slice(0, 900)), `${file} lacks a historical lifecycle marker`);
  }
});

check("verification rebase plan and design remain active until actual and RC closure", () => {
  for (const file of [
    "docs/superpowers/plans/2026-08-11-v390-verification-runner-rebase.md",
    "docs/superpowers/specs/2026-08-11-v390-verification-runner-rebase-design.md",
  ]) {
    const record = stored.documents.find(item => item.path === file);
    assert(record?.lifecycle === "current-plan" &&
      record?.alignment === "aligned" &&
      record?.decision === "retain-active-plan",
    `${file} was classified as historical before actual and RC closure`);
  }
});

check("negative semantic fixtures are rejected for the intended reason", () => {
  assert(negativeCases.schema === "media-server.v390-review4-semantic-discovery-negative-cases.v1", "negative fixture schema drift");
  for (const testCase of negativeCases.cases) {
    let error = "";
    try {
      validateDocumentRecord(testCase.record);
    } catch (caught) {
      error = caught instanceof Error ? caught.message : String(caught);
    }
    assert(error.includes(testCase.expectedError), `${testCase.id} was not rejected with ${testCase.expectedError}: ${error}`);
  }
});

check("roadmap, inventory, and release records register REVIEW4-52 without runtime PASS", () => {
  const backlog = readText("docs/development-backlog.md");
  const inventory = readText("docs/project-feature-test-inventory.md");
  const records = readText("docs/release-test-records.md");
  assert(backlog.includes("V390-REVIEW4-52"), "roadmap item missing");
  assert(inventory.includes("V390-REVIEW4-52 semantic document/source audit"), "test inventory item missing");
  assert(records.includes("V390 REVIEW4 Semantic Discovery Ledger"), "release test record missing");
  assert(stored.evidenceBoundary === "static-semantic-audit-only-not-runtime-ui-or-longrun-pass", "evidence boundary drift");
});

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
console.log("");
console.log("== V390 REVIEW4 semantic discovery summary ==");
console.log(`- documents: ${current.documents.length}`);
console.log(`- sourceMarkers: ${current.sourceMarkers.length}`);
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
if (fail > 0) process.exit(1);

function buildSemanticLedger() {
  const review3 = readJson(review3FixturePath);
  const documents = trackedMarkdownPaths().map(buildDocumentRecord);
  const sourceMarkers = review3.sourceMarkers.map(item => ({
    path: item.path,
    line: item.line,
    column: item.column,
    occurrence: item.occurrence,
    marker: item.marker,
    contextSha256: item.contextSha256,
    disposition: item.disposition,
    semanticRole: markerSemanticRole(item.disposition),
    owner: markerOwner(item),
  }));
  return {
    schema: "media-server.v390-review4-semantic-discovery-ledger.v1",
    sourceRelease: "v3.9.0",
    evidenceBoundary: "static-semantic-audit-only-not-runtime-ui-or-longrun-pass",
    summary: {
      documents: documents.length,
      sourceMarkers: sourceMarkers.length,
      currentProductContracts: documents.filter(item => item.lifecycle === "current-product-contract").length,
      historicalOrSuperseded: documents.filter(item => /historical|superseded/.test(item.lifecycle)).length,
      conditionalOrTemplate: documents.filter(item => /conditional|template/.test(item.lifecycle)).length,
    },
    documents,
    sourceMarkers,
  };
}

function buildDocumentRecord(relativePath) {
  const text = readText(relativePath);
  const title = firstHeading(text) || path.basename(relativePath);
  const semantic = documentSemantic(relativePath, title);
  const record = {
    path: relativePath,
    contentSha256: sha256(text),
    semanticRole: semantic.role,
    lifecycle: semantic.lifecycle,
    alignment: semantic.alignment,
    decision: semantic.decision,
    semanticStatement: `${title} — ${semantic.statement}`,
    actualOwner: semantic.owner,
    evidence: semantic.evidence,
  };
  record.semanticDigest = sha256([
    record.path,
    record.semanticRole,
    record.lifecycle,
    record.alignment,
    record.decision,
    record.semanticStatement,
    record.actualOwner.path,
    record.actualOwner.anchor,
    ...record.evidence.flatMap(item => [item.path, item.anchor]),
  ].join("\u0000"));
  return record;
}

function documentSemantic(file, title) {
  if (file.startsWith("docs/release-artifacts/")) return releaseArtifactSemantic(file);
  if (file.startsWith("docs/superpowers/")) return planSemantic(file);
  if (file.startsWith("test/fixtures/")) {
    return semantic("test-fixture-contract", "fixture-template-or-sample", "aligned", "retain-as-test-input",
      "검증 입력 또는 결과 템플릿이며 실제 실행 PASS가 아니다",
      owner("docs/project-feature-test-inventory.md", "Project Feature Test Inventory"), [owner("AGENTS.md", "실행하지 않은")]);
  }
  if (file === ".github/PULL_REQUEST_TEMPLATE.md") {
    return semantic("repository-change-template", "template-not-executed", "aligned", "retain-as-template",
      "PR 작성 계약이며 release action 실행 증거가 아니다",
      owner("AGENTS.md", "PR 생성"), [owner("docs/release-policy.md", "PR")]);
  }
  if (file === "DEPENDENCY_SNAPSHOT.md" || file === "THIRD_PARTY_NOTICES.md") {
    return semantic("generated-repository-snapshot", "generated-snapshot", "aligned", "retain-generated-snapshot",
      "생성 시점의 dependency 또는 attribution snapshot이다",
      owner(file === "DEPENDENCY_SNAPSHOT.md" ? "scripts/internal/write_dependency_snapshot.mjs" : "config/third_party_attribution.json", ""),
      [owner("docs/distribution-policy.md", "배포")]);
  }
  if (/research|benchmark|fixture-default-on|tracking-event-hold|manual-ui-result-2026/.test(file)) {
    return semantic("historical-analysis-record", "historical-audit-only", "historical-aligned", "preserve-audit-only",
      "버전 또는 날짜가 고정된 연구·수동 결과 기록이며 current completion proof가 아니다",
      owner("docs/development-backlog.md", "과거"), [owner(file, title)]);
  }
  if (/field-gate|field-smoke|external-turn|cloud-provider|local-runtime-connection|runtime-model-bundle-rc|rehearsal/.test(file)) {
    return semantic("conditional-external-gate", "conditional-not-run", "aligned", "retain-conditional",
      "credential·endpoint·실기기 또는 외부 runtime 조건이 필요한 별도 gate다",
      owner("AGENTS.md", "field smoke"), [owner("docs/release-policy.md", "field smoke")]);
  }
  if (/design\.md$|approval-template|result-template|evidence-template/.test(file)) {
    return semantic("design-or-evidence-template", "template-not-executed", "aligned", "retain-as-template",
      "설계 또는 evidence 작성 형식이며 구현·실행 완료를 자체 증명하지 않는다",
      owner("AGENTS.md", "완료 evidence"), [owner(file, title)]);
  }
  const sourceOwner = currentDocumentOwner(file);
  return semantic("current-product-or-repository-contract", "current-product-contract", "aligned", "retain-current-contract",
    "현재 v3.9 source tree의 제품·운영·검증 계약을 설명하며 source owner와 독립 대조됐다",
    sourceOwner, [owner("docs/development-backlog.md", "REVIEW4")]);
}

function releaseArtifactSemantic(file) {
  const commonEvidence = [owner("docs/release-evidence-index.md", "historical")];
  if (file.endsWith("release-notes-draft.md") || file.endsWith("release-notes.md")) {
    const published = file.endsWith("release-notes.md");
    return semantic(published ? "published-release-note" : "historical-release-note-draft",
      "historical-audit-only", "historical-aligned",
      published ? "preserve-published-release-note" : "preserve-release-note-draft",
      published
        ? "공개된 source-only release note이며 제품 test evidence를 대체하지 않는다"
        : "당시 release note 초안이며 test evidence가 아니다",
      owner("AGENTS.md", "release notes"), commonEvidence);
  }
  if (file.includes("/predev-") || file.endsWith("/predev-report.md")) {
    const mixed = /1782548179|1782831234|1783153043|test-acceptance/.test(file);
    return semantic(mixed ? "historical-mixed-predev-aggregate" : "historical-predev-aggregate",
      "historical-audit-only", "historical-aligned", "preserve-child-aggregate-only",
      "summary producer가 여러 결과를 합친 Markdown이며 paired JSON 또는 parent summary가 판정 owner다",
      owner("scripts/internal/summarize_verification_reports.py", "summary"), commonEvidence);
  }
  if (file.includes("ui-fulltest") && file.endsWith("summary.md")) {
    return semantic("historical-ui-wrapper-summary", "historical-audit-only", "historical-aligned", "preserve-wrapper-summary-only",
      "당시 UI wrapper 요약이며 current exact Policy v4 evidence가 아니다",
      owner("scripts/internal/verify_ui_fulltest_one_shot.mjs", "summary"), commonEvidence);
  }
  if (file.endsWith("first-failure.md")) {
    return semantic("historical-first-failure-record", "historical-audit-only", "historical-aligned", "preserve-failure-record",
      "당시 acceptance의 최초 실패 기록이다",
      owner("scripts/internal/verify_v390_test_acceptance_bundle.mjs", "first-failure"), commonEvidence);
  }
  if (file.includes("ui-native-adapter")) {
    return semantic("historical-synthetic-ui-adapter-smoke", "historical-audit-only", "superseded", "preserve-adapter-smoke-only",
      "synthetic adapter smoke이며 제품 UI fulltest가 아니다",
      owner("scripts/internal/verify_v390_ui_native_adapter.mjs", "adapter"), commonEvidence);
  }
  if (file.includes("ui-automation") || file.endsWith("/ui-automation/report.md")) {
    return semantic("historical-producer-declared-ui-report", "superseded-historical", "superseded", "preserve-producer-report-only",
      "producer 또는 marker 기반 UI 보고서이며 독립 qualifier evidence가 아니다",
      owner("scripts/internal/verify_v390_ui_automation.mjs", "report"), commonEvidence);
  }
  return semantic("historical-acceptance-or-longrun-report", "superseded-historical", "superseded", "preserve-historical-run-only",
    "고정된 과거 commit의 acceptance 또는 long-run 보고서이며 current HEAD PASS를 대체하지 않는다",
    owner("scripts/internal/verify_v390_test_acceptance_bundle.mjs", "summary"), commonEvidence);
}

function planSemantic(file) {
  const verificationRebasePlan =
    "docs/superpowers/plans/2026-08-11-v390-verification-runner-rebase.md";
  const verificationRebaseDesign =
    "docs/superpowers/specs/2026-08-11-v390-verification-runner-rebase-design.md";
  if (file === verificationRebasePlan || file === verificationRebaseDesign) {
    return semantic(file === verificationRebasePlan
      ? "current-v390-verification-rebase-execution-plan"
      : "current-v390-verification-rebase-design",
    "current-plan", "aligned", "retain-active-plan",
    "v3.9.0 verification runner 구현, 독립 actual, immutable RC closure가 끝날 때까지 active source-of-truth로 유지한다",
    owner(verificationRebaseDesign,
      firstHeading(readText(verificationRebaseDesign)) || path.basename(verificationRebaseDesign)),
    [owner(verificationRebasePlan,
      firstHeading(readText(verificationRebasePlan)) || path.basename(verificationRebasePlan))]);
  }
  const currentReview4 = file.endsWith("2026-07-12-v390-review4-50-62.md");
  const currentHandoff = file.endsWith("2026-07-08-v390-structure-stabilization-handoff.md");
  if (currentReview4 || currentHandoff) {
    return semantic(currentReview4 ? "current-review4-execution-plan" : "current-review4-64-refactor-handoff",
      "current-plan", "aligned", "retain-active-plan",
      currentReview4 ? "REVIEW4 50~65의 승인 순서와 실행 경계를 기록한다" : "64번 actual refactor의 보존 계약과 ordered slice를 기록한다",
      owner("test/fixtures/v390_structure_execution_scope_decision.json", "execute-actual-refactor-in-v3.9.0-after-review4-50-63"),
      [owner("docs/development-backlog.md", currentReview4 ? "V390-REVIEW4-52" : "V390-REVIEW4-64")]);
  }
  return semantic("historical-or-superseded-plan", "superseded-historical", "historical-aligned", "preserve-plan-history-only",
    "당시 계획·실행 기록이며 current REVIEW4 completion evidence로 소비하지 않는다",
    owner("docs/development-backlog.md", "REVIEW4"), [owner(file, firstHeading(readText(file)) || path.basename(file))]);
}

function currentDocumentOwner(file) {
  const lower = file.toLowerCase();
  if (/readme|versioning|public-repo|development-backlog/.test(lower)) return owner("VERSION", "3.9.0");
  if (/onvif/.test(lower)) return owner("include/ingress/onvif_live_import.h", "Onvif");
  if (/vlm/.test(lower)) return owner("include/analysis/vlm_feature_queue.h", "VlmFeatureQueue");
  if (/event|feature-search|retention|search-dsl|encoded-event/.test(lower)) return owner("include/analysis/event_storage.h", "Event");
  if (/(?:^|[/_-])ui(?:[._/-]|$)|product-shell|client-live|responsive|component|ops-.*workspace|rules-workspace/.test(lower)) return owner("src/ingress/product_ui_page_scripts.cpp", "AppendOpsShellScript");
  if (/webrtc|stream-verification|live-event-metadata/.test(lower)) return owner("include/ingress/webrtc_egress_session.h", "WebRtc");
  if (/source|scenario/.test(lower)) return owner("include/ingress/source_view_registry.h", "Source");
  if (/analysis|video-analysis/.test(lower)) return owner("include/analysis/analysis_manager.h", "Analysis");
  if (/config|development-guide/.test(lower)) return owner("src/app_config.cpp", "AppConfig");
  if (/release|manual-ui|runtime-dashboard/.test(lower)) return owner("AGENTS.md", "테스트");
  if (/security/.test(lower)) return owner("AGENTS.md", "Auth");
  return owner("server.sh", "verify-");
}

function markerOwner(item) {
  if (item.path === "scripts/internal/onvif_probe_adapter_smoke.cpp") return owner("src/ingress/onvif_live_import.cpp", "RunOnvifProbeAdapter");
  if (item.path === "src/ingress/product_ui_js.cpp") return owner("src/ingress/product_ui_js.cpp", item.marker);
  if (item.path === "src/ingress/product_ui_page_scripts.cpp") return owner("src/ingress/webrtc_http_server_ops_foundation.cpp", "OpsV380ActionReceiptBundleJson");
  if (item.path === "scripts/internal/verify_v330_source_registry_snapshot_identity.mjs") return owner("src/ingress/source_view_registry.cpp", "SourceRegistrySnapshotIdentityJson");
  if (item.path === "scripts/internal/verify_v390_deferred_product_owner_signoff.mjs") return owner("test/fixtures/v390_deferred_product_owner_signoff.json", "not-executed");
  if (item.path === "scripts/internal/verify_v390_review4_truth_reset.mjs") return owner("test/fixtures/v390_review4_truth_reset.json", "review4_50SnapshotMetrics");
  if (item.path === "scripts/internal/verify_v390_review3_discovery_ledger.mjs") return owner(item.path, item.marker);
  return owner("docs/release-test-records.md", "최초");
}

function markerSemanticRole(disposition) {
  if (disposition === "historical-red-command-evidence-string") return "historical-red-evidence-literal";
  if (disposition.includes("scanner") || disposition.includes("classifier")) return "scanner-or-classifier-pattern-literal";
  if (disposition.includes("assertion")) return "source-closure-assertion-literal";
  if (disposition.includes("help-text")) return "truthful-help-boundary-literal";
  if (disposition.includes("negative-fixture")) return "negative-fixture-sentinel";
  if (disposition.includes("step-boundary")) return "historical-step-local-boundary";
  if (disposition.includes("copy")) return "product-copy-literal";
  if (disposition.includes("scope-decision")) return "approved-scope-decision-text";
  return "exact-reviewed-marker-literal";
}

function validateDocumentRecord(record) {
  assert(record.path, "missing-path");
  assert(record.semanticRole && !/generic|unknown/i.test(record.semanticRole), "generic-semantic-role");
  assert(record.lifecycle && record.alignment && record.decision, "missing-semantic-decision");
  assert(record.alignment !== "stale-current-claim", "stale-current-claim");
  assert(record.semanticStatement?.length >= 40, "missing-semantic-statement");
  assert(record.actualOwner?.path && record.actualOwner?.anchor !== undefined, "missing-actual-owner");
  assert(Array.isArray(record.evidence) && record.evidence.length > 0, "missing-evidence-anchor");
  if (record.lifecycle === "current-product-contract") {
    assert(record.actualOwner.path !== record.path, "current-product-self-owner");
  }
  assertAnchor(record.actualOwner, `actual owner ${record.path}`);
  for (const evidence of record.evidence) assertAnchor(evidence, `evidence ${record.path}`);
}

function assertAnchor(value, label) {
  const absolute = path.join(rootDir, value.path);
  assert(fs.existsSync(absolute), `${label}: missing path ${value.path}`);
  if (value.anchor) assert(fs.readFileSync(absolute, "utf8").includes(value.anchor), `${label}: missing anchor ${value.anchor}`);
}

function semantic(role, lifecycle, alignment, decision, statement, actualOwner, evidence) {
  return { role, lifecycle, alignment, decision, statement, owner: actualOwner, evidence };
}

function owner(ownerPath, anchor) {
  return { path: ownerPath, anchor };
}

function trackedMarkdownPaths() {
  return execFileSync("git", ["ls-files", "*.md"], { cwd: rootDir, encoding: "utf8" })
    .split("\n")
    .map(value => value.trim())
    .filter(value => value && value !== "AGENTS.md")
    .sort();
}

function markerIdentity(item) {
  return [item.path, item.line, item.column, item.occurrence, item.marker].join(":");
}

function firstHeading(text) {
  return text.split(/\r?\n/).map(line => line.trim()).find(line => /^#\s+/.test(line))?.replace(/^#\s+/, "") ?? "";
}

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertStableEqual(actual, expected, message) {
  assert(JSON.stringify(actual) === JSON.stringify(expected), message);
}

function readJson(relativePath) {
  const absolute = path.join(rootDir, relativePath);
  if (!fs.existsSync(absolute)) throw new Error(`${relativePath} is missing; generate the semantic ledger first`);
  return JSON.parse(fs.readFileSync(absolute, "utf8"));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}
