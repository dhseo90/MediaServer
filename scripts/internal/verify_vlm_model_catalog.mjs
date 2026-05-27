#!/usr/bin/env node
// 파일 용도: v2.0.0 VLM 후보군 catalog가 license/privacy/bundle 경계를 지키는지 정적 검증한다.
// 동작 요약: 특정 VLM 모델을 기본값으로 고정하지 않고 Apache-2.0 source-only 프로젝트와 충돌하지 않는 review gate를 확인한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`VLM model catalog verification

Usage:
  ./server.sh verify-vlm-model-catalog [options]

Options:
  --catalog <path>      VLM 후보군 catalog JSON입니다. 기본 test/fixtures/vlm_model_catalog/candidate_families.json.
  --report <path>       Markdown 리포트를 저장합니다.
  --json-report <path>  JSON 리포트를 저장합니다.
  -h, --help            도움말 출력

Checks:
  - V200-S01이 특정 VLM 모델 기본값, 자동 설치, runtime 호출을 추가하지 않았는지 확인
  - 공식 model card/license 확인 전에는 1차 모델 선택을 완료로 보고하지 않는지 확인
  - 후보군 catalog가 프로젝트 Apache-2.0 license 비충돌 조건을 필수 review gate로 갖는지 확인
  - local/cloud 후보군이 privacy, external transfer, logging/retention, bundle boundary를 분리하는지 확인
  - VLM model/runtime artifact가 source-only release와 public repo guardrail에 포함되지 않도록 policy가 갱신됐는지 확인
`);
}

assertKnownOptions(rawArgs, ["catalog", "report", "json-report", "h", "help"]);

const args = parseArgs(rawArgs);
const catalogPath = path.resolve(rootDir, args.catalog || "test/fixtures/vlm_model_catalog/candidate_families.json");
const reportPath = args.report ? path.resolve(rootDir, args.report) : "";
const jsonReportPath = args.jsonReport ? path.resolve(rootDir, args.jsonReport) : "";
const checks = [];
const report = {
  schema: "media-server.vlm-model-catalog-report.v1",
  generatedAt: new Date().toISOString(),
  status: "pass",
  catalog: relativePath(catalogPath),
  checks: [],
};

check("project license constraint is documented for V200-S01", () => {
  const license = readText("LICENSE");
  const selectionDoc = readText("docs/vlm-model-selection.md");
  const backlog = readText("docs/development-backlog.md");
  assert(license.includes("Apache License") && license.includes("Version 2.0"), "root LICENSE is not Apache-2.0 text");
  for (const snippet of [
    "프로젝트 라이선스 제약",
    "Apache-2.0",
    "프로젝트 license 변경",
    "license 또는 commercial-use 조건이 불명확하면 `not-approved`",
    "공식 출처로 확인",
  ]) {
    assert(selectionDoc.includes(snippet), `selection doc missing license constraint snippet: ${snippet}`);
  }
  for (const snippet of [
    "| 1 | V200-S01 | 진행 | VLM 후보군/선택 기준 |",
    "프로젝트 라이선스와 충돌하지 않는지",
    "공식 model card/license 확인과 1차 모델 선택 결정은 미완료",
    "`verify-vlm-model-catalog`",
  ]) {
    assert(backlog.includes(snippet), `development backlog missing V200-S01 completion snippet: ${snippet}`);
  }
  return {
    projectLicense: "Apache-2.0",
    step: "V200-S01",
  };
});

check("catalog is classification-only and has no default model or runtime action", () => {
  const catalog = readCatalog();
  assert(catalog.schema === "media-server.vlm-model-catalog.v1", "catalog schema mismatch");
  assert(catalog.targetStep === "V200-S01", "catalog target step mismatch");
  assert(catalog.catalogStatus === "classification-only", "catalog must be classification-only");
  assert(catalog.projectLicenseConstraint?.projectLicense === "Apache-2.0", "catalog must pin project license identifier");
  assert(catalog.projectLicenseConstraint?.mustNotViolateProjectLicense === true, "catalog must require project license compatibility");
  assert(catalog.projectLicenseConstraint?.mustNotRequireProjectRelicense === true, "catalog must block project relicensing requirements");
  assert(catalog.projectLicenseConstraint?.uncertainLicenseMeans === "not-approved", "uncertain license must remain not-approved");
  assert(catalog.defaults?.defaultProvider === null, "catalog must not set a default provider");
  assert(catalog.defaults?.defaultModel === null, "catalog must not set a default model");
  assert(catalog.defaults?.autoInstall === false, "catalog must not enable auto install");
  assert(catalog.defaults?.bundleModelArtifacts === false, "catalog must not bundle model artifacts");
  assert(catalog.defaults?.runtimeCalls === false, "catalog must not perform runtime calls");
  assert(catalog.modelSelectionDecision?.status === "pending-official-model-card-review", "model selection decision must remain pending until official review");
  assert(catalog.modelSelectionDecision?.primaryModel === null, "catalog must not set a primary model before official review");
  assert(Array.isArray(catalog.modelSelectionDecision?.fallbackModels) && catalog.modelSelectionDecision.fallbackModels.length === 0, "catalog must not set fallback models before official review");
  assert(Array.isArray(catalog.modelSelectionDecision?.excludedModels) && catalog.modelSelectionDecision.excludedModels.length === 0, "catalog must not set excluded models before official review");
  for (const required of [
    "official model card review",
    "license and commercial-use review",
    "project Apache-2.0 compatibility decision",
    "source-only release compatibility decision",
    "primary/fallback/excluded model decision",
  ]) {
    assert(catalog.modelSelectionDecision?.completionRequires?.includes(required), `model selection completion requirement missing: ${required}`);
  }
  for (const scope of [
    "exact model/version pinning",
    "default model selection",
    "automatic install",
    "runtime call",
    "VLMObservation sidecar storage",
    "Event POST/WebRTC/SSE/WS metadata schema change",
    "model/runtime bundle release",
  ]) {
    assert(catalog.nonScope?.includes(scope), `catalog nonScope missing: ${scope}`);
  }
  return {
    status: catalog.catalogStatus,
    nonScopeCount: catalog.nonScope.length,
  };
});

check("candidate families cover local and cloud without exact model pinning", () => {
  const catalog = readCatalog();
  const families = Array.isArray(catalog.candidateFamilies) ? catalog.candidateFamilies : [];
  assert(families.length >= 2, "catalog should include local and cloud candidate families");
  const local = families.find((item) => item.deploymentClass === "local");
  const cloud = families.find((item) => item.deploymentClass === "cloud");
  assert(local, "catalog missing local VLM family");
  assert(cloud, "catalog missing cloud VLM family");
  assert(local.exampleFamilies?.some((item) => /Qwen/i.test(item)), "local family missing Qwen family example");
  assert(local.exampleFamilies?.some((item) => /Gemma/i.test(item)), "local family missing Gemma family example");
  assert(cloud.exampleFamilies?.some((item) => /Gemini/i.test(item)), "cloud family missing Gemini family example");
  for (const family of families) {
    assert(family.exactModelPinned === false, `${family.id}: exact model must not be pinned`);
    assert(family.recommendationStatus === "not-ranked", `${family.id}: recommendation must not be ranked in V200-S01`);
    assert(family.licenseReview?.status === "required", `${family.id}: license review must be required`);
    assert(family.licenseReview?.mustNotViolateProjectLicense === true, `${family.id}: project license compatibility must be required`);
    assert(family.licenseReview?.projectLicenseCompatibility === "review-required", `${family.id}: compatibility must remain review-required`);
    assert(family.bundlePolicy?.modelArtifactsInRepo === false, `${family.id}: model artifacts must not be in repo`);
    assert(family.bundlePolicy?.modelArtifactsInReleaseAsset === false, `${family.id}: model artifacts must not be in release asset`);
    assert(family.bundlePolicy?.runtimeArtifactsInDefaultBundle === false, `${family.id}: runtime artifacts must not be in default bundle`);
    assert(family.bundlePolicy?.sourceOnlyDefault === true, `${family.id}: source-only default must remain true`);
  }
  return {
    candidateFamilies: families.map((item) => item.id),
  };
});

check("privacy and cloud opt-in boundaries are explicit", () => {
  const catalog = readCatalog();
  const local = catalog.candidateFamilies.find((item) => item.deploymentClass === "local");
  const cloud = catalog.candidateFamilies.find((item) => item.deploymentClass === "cloud");
  assert(local.privacyReview?.externalTransfer === false, "local family must not require external transfer");
  assert(local.privacyReview?.cloudOptInRequired === false, "local family should not require cloud opt-in");
  assert(local.privacyReview?.rawResponseViewerVisible === false, "local raw response must not be viewer-visible");
  assert(cloud.privacyReview?.externalTransfer === true, "cloud family must mark external transfer");
  assert(cloud.privacyReview?.cloudOptInRequired === true, "cloud family must require explicit cloud opt-in");
  assert(cloud.privacyReview?.providerLoggingReviewRequired === true, "cloud family must require provider logging review");
  assert(cloud.privacyReview?.credentialInRepoAllowed === false, "cloud credential must not be allowed in repo");
  return {
    localExternalTransfer: local.privacyReview.externalTransfer,
    cloudExternalTransfer: cloud.privacyReview.externalTransfer,
  };
});

check("bundle and public repo policies block VLM model artifacts", () => {
  const bundlePolicy = readJson("config/bundle_distribution_policy.json");
  const publicPolicy = readJson("config/public_repo_policy.json");
  const bundleText = JSON.stringify(bundlePolicy, null, 2);
  const publicText = JSON.stringify(publicPolicy, null, 2);
  for (const snippet of [
    "VLM model artifact",
    "gguf",
    "ggml",
    "safetensors",
    "ckpt",
  ]) {
    assert(bundleText.includes(snippet), `bundle policy missing VLM artifact guard: ${snippet}`);
  }
  for (const snippet of [
    "gguf",
    "ggml",
    "safetensors",
    "ckpt",
  ]) {
    assert(publicText.includes(snippet), `public repo policy missing VLM artifact guard: ${snippet}`);
  }
  const modelRule = bundlePolicy.rules?.find((rule) => rule.id === "model-binary");
  assert(modelRule, "bundle policy missing model-binary rule");
  assert(modelRule.reason.includes("VLM"), "model-binary rule reason must mention VLM");
  return {
    bundlePolicy: "config/bundle_distribution_policy.json",
    publicRepoPolicy: "config/public_repo_policy.json",
  };
});

check("docs and command inventory expose the VLM catalog verifier", () => {
  const docsIndex = readText("docs/README.md");
  const stream = readText("docs/stream-verification.md");
  const server = readText("server.sh");
  const inventory = readText("scripts/internal/verify_script_inventory.mjs");
  for (const [label, text, snippets] of [
    ["docs/README.md", docsIndex, ["vlm-model-selection.md", "VLM 후보/선택 기준"]],
    ["docs/stream-verification.md", stream, ["./server.sh verify-vlm-model-catalog", "VLM 후보군 catalog"]],
    ["server.sh", server, ["verify-vlm-model-catalog", "verify_vlm_model_catalog.mjs"]],
    ["verify_script_inventory.mjs", inventory, ["verify_vlm_model_catalog.mjs"]],
  ]) {
    for (const snippet of snippets) {
      assert(text.includes(snippet), `${label} missing VLM catalog verifier snippet: ${snippet}`);
    }
  }
  return {
    command: "./server.sh verify-vlm-model-catalog",
  };
});

let failCount = 0;
for (const item of checks) {
  try {
    const details = item.run() || {};
    report.checks.push({ name: item.name, status: "pass", details });
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    failCount += 1;
    const message = error instanceof Error ? error.message : String(error);
    report.checks.push({ name: item.name, status: "fail", message });
    console.log(`[fail] ${item.name}: ${message}`);
  }
}

report.status = failCount > 0 ? "fail" : "pass";

console.log("");
console.log("== VLM model catalog verification summary ==");
console.log(`- catalog: ${report.catalog}`);
console.log(`- pass: ${checks.length - failCount}`);
console.log(`- fail: ${failCount}`);

if (reportPath) {
  writeText(reportPath, renderMarkdownReport(report));
  console.log(`- report: ${relativePath(reportPath)}`);
}
if (jsonReportPath) {
  writeText(jsonReportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`- jsonReport: ${relativePath(jsonReportPath)}`);
}

if (failCount > 0) process.exit(1);

function check(name, run) {
  checks.push({ name, run });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseArgs(argv) {
  const result = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--catalog") {
      result.catalog = argv[++i];
    } else if (arg === "--report") {
      result.report = argv[++i];
    } else if (arg === "--json-report") {
      result.jsonReport = argv[++i];
    }
  }
  return result;
}

function readText(relative) {
  return fs.readFileSync(path.join(rootDir, relative), "utf8");
}

function readJson(relative) {
  return JSON.parse(readText(relative));
}

function readCatalog() {
  return JSON.parse(fs.readFileSync(catalogPath, "utf8"));
}

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, "utf8");
}

function relativePath(filePath) {
  return path.relative(rootDir, filePath).replaceAll(path.sep, "/") || ".";
}

function renderMarkdownReport(payload) {
  const lines = [
    "# VLM Model Catalog Verification Report",
    "",
    `- schema: ${payload.schema}`,
    `- status: ${payload.status}`,
    `- generatedAt: ${payload.generatedAt}`,
    `- catalog: ${payload.catalog}`,
    "",
    "| Check | Status | Details |",
    "| --- | --- | --- |",
  ];
  for (const item of payload.checks) {
    const details = item.status === "pass"
      ? JSON.stringify(item.details || {})
      : item.message || "";
    lines.push(`| ${escapeCell(item.name)} | ${item.status.toUpperCase()} | ${escapeCell(details)} |`);
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function escapeCell(value) {
  return String(value).replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}
