#!/usr/bin/env node
// 파일 용도: 986개 feature ID의 exact implementation/UI/verifier manifest를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import {
  EXPECTED_FEATURE_ROWS,
  loadImplementationManifest,
  parseFeatureRows,
  validateImplementationManifest,
  validateImplementationManifestStructure,
  validateImplementationManifestEntries,
} from "./feature_implementation_manifest_lib.mjs";
import {
  summarizeSemanticClosure,
  validateReview4AppliedManifest,
} from "./feature_semantic_evidence_lib.mjs";
import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Feature implementation evidence verification

Usage:
  ./server.sh verify-feature-implementation-evidence [options]

Options:
  --refresh-manifest  Retired: generic regeneration cannot preserve independent REVIEW4 approval.
  --migrate-review3           Removed: REVIEW3 generator-owned approval is rejected.
  --review-ids IDS            Removed with --migrate-review3.
  --json-report PATH  Write the validation report.
  -h, --help          Show help.

The manifest is read-only; --json-report may write the explicitly requested report.
An explicitly approved manifest update uses:
  ./server.sh verify-v390-review4-feature-semantic-source-audit --apply-approved-manifest
That path validates current source proofs against the independent approval ledger;
it does not create an approval. This verifier does not execute product tests.`);
}

assertKnownOptions(rawArgs, [
  "refresh-manifest",
  "migrate-review3",
  "review-ids",
  "json-report",
  "h",
  "help",
]);
const args = parseArgs(rawArgs);
if (args.refreshManifest && args.migrateReview3) {
  throw new Error("--refresh-manifest and --migrate-review3 are mutually exclusive");
}
if (args.reviewIds.length > 0 && !args.migrateReview3) {
  throw new Error("--review-ids requires --migrate-review3");
}
if (args.migrateReview3) {
  throw new Error("--migrate-review3 was removed: candidate generation, reviewed proof specs, and independent approval must remain separate");
}
if (args.refreshManifest) {
  throw new Error("--refresh-manifest is retired: generic regeneration cannot preserve independent REVIEW4 approval; use verify-v390-review4-feature-semantic-source-audit --apply-approved-manifest only for an explicitly approved update");
}
const inventoryText = fs.readFileSync(
  path.join(rootDir, "docs/project-feature-test-inventory.md"),
  "utf8",
);
const rows = parseFeatureRows(inventoryText);

const manifest = loadImplementationManifest(rootDir);
const result = validateImplementationManifest({ rootDir, inventoryText, rows, manifest });
const review4GlobalErrors = validateReview4AppliedManifest({ rows, manifest });
const negativeChecks = runNegativeFixtures({ rootDir, inventoryText, rows, manifest,
  baselineValid: result.ok && review4GlobalErrors.length === 0 });

if (args.jsonReport) {
  const target = path.resolve(rootDir, args.jsonReport);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify({
    schema: "media-server.feature-implementation-evidence-validation.v1",
    executionEvidenceStatus: "not-execution-evidence",
    result,
    review4GlobalErrors,
    negativeChecks,
  }, null, 2)}\n`);
}

for (const error of result.errors) console.log(`[fail] ${error}`);
for (const error of review4GlobalErrors) console.log(`[fail] ${error}`);
for (const check of negativeChecks) {
  console.log(`[${check.executed === false ? "not-run" : check.pass ? "pass" : "fail"}] negative fixture ${check.name}`);
}

console.log("");
console.log("== Feature implementation evidence summary ==");
console.log(`- expectedFeatureRows: ${EXPECTED_FEATURE_ROWS}`);
console.log(`- inventoryRows: ${result.summary.inventoryRows}`);
console.log(`- manifestRows: ${result.summary.manifestRows}`);
console.log(`- sourceEvidenceRows: ${result.summary.sourceEvidenceRows}`);
console.log(`- uiEvidenceRows: ${result.summary.uiEvidenceRows}`);
console.log(`- verifierEvidenceRows: ${result.summary.verifierEvidenceRows}`);
console.log(`- manualUiCaseRows: ${result.summary.manualUiCaseRows}`);
console.log(`- semanticReviewedRows: ${result.summary.semanticReviewedRows}`);
console.log(`- uniqueSemanticDigests: ${result.summary.uniqueSemanticDigests}`);
console.log(`- reviewedCallChains: ${result.summary.reviewedCallChains}`);
console.log(`- uniqueReviewReasons: ${result.summary.uniqueReviewReasons}`);
console.log(`- validationErrors: ${result.summary.errors}`);
console.log(`- review4GlobalErrors: ${review4GlobalErrors.length}`);
console.log(`- negativeFixtures: ${negativeChecks.filter(check => check.pass).length}/${negativeChecks.length}`);
console.log("- executionEvidenceStatus: not-execution-evidence");

if (!result.ok || review4GlobalErrors.length > 0 || negativeChecks.some(check => !check.pass)) process.exit(1);

function runNegativeFixtures({ rootDir, inventoryText, rows, manifest, baselineValid }) {
  const cases = [
    {
      name: "missing-id",
      mutate(copy) { copy.items = copy.items.filter(item => item.id !== "UI-019"); },
      expect: "manifest missing feature ID UI-019",
    },
    {
      name: "duplicate-id",
      mutate(copy) { mutateItem(copy, 1, item => { item.id = copy.items[0].id; }); },
      expect: "manifest contains duplicate feature IDs",
    },
    {
      name: "wrong-section-prefix",
      mutate(copy) { mutateItem(copy, 0, item => { item.section = "J"; }); },
      expect: "section mismatch",
    },
    {
      name: "missing-source-file",
      mutate(copy) { mutateItem(copy, 0, item => { item.sourceEvidence.file = "src/missing.cpp"; }); },
      expect: "file is not tracked",
    },
    {
      name: "missing-source-anchor",
      mutate(copy) { mutateItem(copy, 0, item => { item.sourceEvidence.anchor = "__missing_feature_anchor__"; }); },
      expect: "anchor missing",
    },
    {
      name: "missing-ui-control-anchor",
      mutate(copy) {
        mutateItem(copy, entry => entry.uiEvidence, item => {
          item.uiEvidence.anchor = "__missing_ui_control__";
        });
      },
      expect: "anchor missing",
    },
    {
      name: "missing-ui-screen-route",
      mutate(copy) {
        mutateItem(copy, entry => entry.uiEvidence, item => {
          item.uiEvidence.screenRoute = "/missing-product-screen";
        });
      },
      expect: "UI screenRoute missing from product source",
    },
    {
      name: "unknown-verifier-command",
      mutate(copy) {
        mutateItem(copy, entry => entry.verifierEvidence?.command, item => {
          item.verifierEvidence.command = "verify-does-not-exist";
        });
      },
      expect: "verifier command not dispatched",
    },
    {
      name: "missing-verifier-assertion",
      mutate(copy) { mutateItem(copy, 0, item => { item.verifierEvidence.anchor = "__missing_assertion__"; }); },
      expect: "anchor missing",
    },
    {
      name: "legacy-longrun-command",
      mutate(copy) {
        mutateItem(copy, entry => entry.longrunEvidence?.soak30, item => {
          item.longrunEvidence.soak30 = "./server.sh verify-predev --soak-minutes 30";
        });
      },
      expect: "30분 mapping must use the v3.9 canonical runner",
    },
    {
      name: "inventory-hash-drift",
      mutate(copy) { copy.inventorySha256 = "0".repeat(64); },
      expect: "inventorySha256 drift",
    },
    {
      name: "missing-reviewed-call-chain",
      mutate(copy) { mutateItem(copy, 0, item => { delete item.semanticEvidence.callChain; }); },
      expect: "REVIEW4 compatibility call chain drift",
    },
    {
      name: "bulk-review-reason",
      mutate(copy) { mutateItem(copy, 1, item => { item.review.reason = copy.items[0].review.reason; }); },
      expect: "bulk or duplicate semantic review reason detected",
    },
    {
      name: "safe-140-unrelated-owner",
      mutate(copy) {
        mutateItem(copy, entry => entry.id === "SAFE-140", item => {
          item.semanticEvidence.review4Proof.roles.action.symbol = "OpsV380ClientNoticeDraftQueueJson";
        });
      },
      expect: "REVIEW4 source-flow digest drift",
    },
    {
      name: "rule-017-generic-json-owner",
      mutate(copy) {
        mutateItem(copy, entry => entry.id === "RULE-017", item => {
          item.semanticEvidence.review4Proof.roles.owner.symbol = "ExtractObjectField";
        });
      },
      expect: "REVIEW4 source-flow digest drift",
    },
  ];
  // 반례가 복제 없이 정상 입력을 바꿔 이전 검증을 무효화하지 못하게 한다.
  if (baselineValid) freezeFixtureInput(manifest.items);
  return cases.map(testCase => {
    if (!baselineValid) return { name: testCase.name, pass: false, executed: false, reason: "baseline-validation-failed" };
    const copy = { ...manifest, items: [...manifest.items] };
    testCase.mutate(copy);
    // 정상 입력 전체 검증은 위에서 완료했다. 내장 반례는 copy-on-write로 만든 변경 항목만
    // 같은 항목 검사에 넣고, 누락/중복/해시/사유 등의 집합 조건은 매번 전체로 확인한다.
    const unchanged = new Set(manifest.items);
    const changedItems = copy.items.filter(item => !unchanged.has(item));
    const errors = [
      ...validateImplementationManifestStructure({ inventoryText, rows, manifest: copy }),
      ...validateImplementationManifestEntries({ rootDir, rows, items: changedItems }),
    ];
    return {
      name: testCase.name,
      executed: true,
      pass: errors.some(error => error.includes(testCase.expect)),
    };
  });
}

function freezeFixtureInput(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return;
  for (const nested of Object.values(value)) freezeFixtureInput(nested);
  Object.freeze(value);
}

function mutateItem(manifest, selector, mutate) {
  const index = Number.isInteger(selector)
    ? selector
    : manifest.items.findIndex(selector);
  if (index < 0 || index >= manifest.items.length) {
    throw new Error("negative fixture target item missing");
  }
  const item = structuredClone(manifest.items[index]);
  manifest.items[index] = item;
  mutate(item);
}

function parseArgs(argsList) {
  const parsed = {
    refreshManifest: false,
    migrateReview3: false,
    reviewIds: [],
    jsonReport: "",
  };
  for (let index = 0; index < argsList.length; index += 1) {
    const token = argsList[index];
    if (token === "--refresh-manifest") parsed.refreshManifest = true;
    else if (token === "--migrate-review3") parsed.migrateReview3 = true;
    else if (token.startsWith("--review-ids=")) parsed.reviewIds = parseReviewIds(token.slice("--review-ids=".length));
    else if (token === "--review-ids") parsed.reviewIds = parseReviewIds(argsList[++index]);
    else if (token.startsWith("--json-report=")) parsed.jsonReport = token.slice("--json-report=".length);
    else if (token === "--json-report") parsed.jsonReport = argsList[++index];
  }
  return parsed;
}

function parseReviewIds(value) {
  const ids = String(value || "").split(",").map(item => item.trim()).filter(Boolean);
  if (ids.length === 0 || new Set(ids).size !== ids.length) throw new Error("--review-ids requires unique comma-separated IDs");
  return ids;
}
