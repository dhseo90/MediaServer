#!/usr/bin/env node
// 파일 용도: v2.1.0 S11 runtime/model bundle RC rehearsal의 차단 기준과 증적 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Runtime/model bundle RC rehearsal verification

Usage:
  ./server.sh verify-runtime-model-bundle-rc-rehearsal [options]

Options:
  --report <path>       Write a Markdown RC rehearsal report.
  --json-report <path>  Write a JSON RC rehearsal report.
  -h, --help            Show help.

Checks:
  - V210-S11 fixture keeps source-only as the default release decision.
  - Runtime/model, GPL-risk runtime, missing provenance/license, and release asset upload candidates are blocked.
  - Rehearsal does not create a real bundle or upload release assets.
  - Bundle policy, release dry-run, dependency snapshot, source offer, docs, feature inventory, server.sh, and script inventory are wired.
`);
}

assertKnownOptions(rawArgs, ["report", "json-report", "h", "help"]);

const args = parseArgs(rawArgs);
const fixturePath = "test/fixtures/runtime_model_bundle_rc_rehearsal/cases.json";
const fixture = readJson(fixturePath);
const report = {
  schema: "media-server.runtime-model-bundle-rc-rehearsal-report.v1",
  targetStep: "V210-S11",
  generatedAt: new Date().toISOString(),
  gateStatus: "pass",
  fixturePath,
  defaultReleaseBoundary: "source-only",
  actualBundleCreated: false,
  releaseAssetUploaded: false,
  runtimeModelBundleSelected: false,
  rcRehearsalOnly: true,
  sourceOnlyDefault: true,
  policyEvidence: {
    verifyBundlePolicy: "./server.sh verify-bundle-policy",
    verifyReleaseBundleDryRun: "./server.sh verify-release-bundle-dry-run --candidate source-only",
    dependencySnapshot: "./server.sh dependency-snapshot --stable --no-linked-libs",
    sourceOfferChecklist: "./server.sh source-offer-checklist --stable --bundle-policy-report <json>",
  },
  summary: {
    fixtureCases: 0,
    allowedDefault: 0,
    rcOnly: 0,
    blocked: 0,
    releaseAssetUploads: 0,
  },
  cases: [],
  checks: [],
};
const productServer = readText("src/ingress/webrtc_http_server.cpp");
assert(productServer.includes("source-only PASS boundary"), "source-only PASS boundary must remain the default release asset policy");

const checks = [];

check("tracked repository and release inputs contain no model/runtime/credential bundle assets", () => {
  const trackedFiles = execFileSync("git", ["ls-files", "-z"], { cwd: rootDir })
    .toString("utf8").split("\0").filter(Boolean);
  const trackedForbiddenAssets = trackedFiles.filter(file =>
    /(?:^|\/)(?:[^/]+\.)?(?:gguf|ggml|safetensors|ckpt|onnx|engine|plan|pt|pth|tflite)$/i.test(file) ||
    /(?:^|\/)(?:runtime-package|model-weights?|download-token|provider-credential)(?:\/|\.|$)/i.test(file));
  const modelArtifactDownloaded = trackedForbiddenAssets.length > 0;
  assert(modelArtifactDownloaded === false && trackedForbiddenAssets.length === 0,
    `tracked model/runtime/download-token/credential assets must remain absent: ${trackedForbiddenAssets.join(", ")}`);
});

check("fixture covers required V210-S11 runtime/model bundle RC matrix", () => {
  assert(fixture.schema === "media-server.runtime-model-bundle-rc-rehearsal-fixtures.v1", "fixture schema mismatch");
  assert(fixture.targetStep === "V210-S11", "fixture targetStep mismatch");
  const ids = new Set((fixture.cases || []).map(item => item.id));
  for (const id of [
    "source-only-default-pass",
    "local-binary-no-runtime-model-rc-only",
    "offline-package-no-runtime-model-rc-only",
    "container-root-no-runtime-model-rc-only",
    "runtime-model-included-blocked",
    "gpl-risk-runtime-binary-blocked",
    "missing-hash-provenance-license-blocked",
    "release-asset-upload-blocked",
  ]) {
    assert(ids.has(id), `missing runtime/model bundle RC case: ${id}`);
  }
});

check("fixture decisions keep source-only default and block runtime/model release assets", () => {
  const cases = fixture.cases.map(evaluateFixtureCase);
  report.cases = cases;
  report.summary.fixtureCases = cases.length;
  report.summary.allowedDefault = cases.filter(item => item.allowedForDefaultRelease).length;
  report.summary.rcOnly = cases.filter(item => item.allowedForRcRehearsal && !item.allowedForDefaultRelease).length;
  report.summary.blocked = cases.filter(item => item.blocked).length;
  report.summary.releaseAssetUploads = cases.filter(item => item.releaseAssetUploaded).length;

  for (const item of cases) {
    assert(item.status === "pass", `${item.id}: fixture expectation mismatch`);
    assert(item.actualBundleCreated === false, `${item.id}: rehearsal must not create a real bundle`);
    assert(item.releaseAssetUploaded === false, `${item.id}: modelArtifactDownloaded/source-only release asset upload must remain absent`);
    if (item.includesRuntime || item.includesModel || item.gplRiskRuntime || item.releaseAssetUploadRequested) {
      assert(item.allowedForDefaultRelease === false, `${item.id}: risky candidate must not be default release`);
    }
  }
  assert(report.summary.allowedDefault === 1, "exactly one source-only default case expected");
  assert(report.summary.rcOnly === 3, "expected three no-runtime/no-model RC-only rehearsal cases");
  assert(report.summary.blocked === 4, "expected four blocked risky cases");
  assert(report.summary.releaseAssetUploads === 0, "rehearsal must upload zero release assets");
});

check("bundle policy blocks runtime/model/GPL-risk paths", () => {
  const policy = readJson("config/bundle_distribution_policy.json");
  const ruleIds = new Set((policy.rules || []).map(rule => rule.id));
  for (const id of [
    "ffmpeg-cli",
    "ffmpeg-libraries",
    "x264-x265-runtime",
    "gstreamer-gpl-risk-plugins",
    "onnx-runtime-package",
    "model-binary",
  ]) {
    assert(ruleIds.has(id), `bundle policy missing rule: ${id}`);
  }
  const releaseDryRun = readText("scripts/internal/verify_release_bundle_dry_run.mjs");
  for (const snippet of [
    "source-only",
    "local-binary",
    "offline-package",
    "container-root",
    "offline-model-binary",
    "container-onnx-runtime-package",
    "container-gstreamer-gpl-plugin",
    "release-bundle-dry-run-summary.v1",
  ]) {
    assert(releaseDryRun.includes(snippet), `release bundle dry-run missing snippet: ${snippet}`);
  }
});

check("dependency snapshot and source offer inputs preserve hash/provenance/license review boundary", () => {
  const snapshot = readText("DEPENDENCY_SNAPSHOT.md");
  const attribution = readText("config/third_party_attribution.json");
  const sourceOffer = readText("scripts/internal/write_source_offer_checklist.mjs");
  for (const snippet of [
    "media-server.dependency-snapshot.v1",
    "sha256=",
    "ONNX Runtime",
    "Ultralytics YOLO model asset",
    "GPL build flag",
  ]) {
    assert(snapshot.includes(snippet), `dependency snapshot missing review snippet: ${snippet}`);
  }
  for (const snippet of [
    "bundlePolicyCommand",
    "source offer",
    "license",
    "assets",
  ]) {
    assert(attribution.includes(snippet), `third-party attribution missing snippet: ${snippet}`);
  }
  for (const snippet of [
    "source offer checklist",
    "license text",
    "attribution",
    "bundle-policy-report",
  ]) {
    assert(sourceOffer.includes(snippet), `source offer checklist writer missing snippet: ${snippet}`);
  }
});

check("docs, feature inventory, server command, and script inventory are wired", () => {
  const docs = [
    readText("docs/runtime-model-bundle-rc-rehearsal.md"),
    readText("docs/distribution-policy.md"),
    readText("docs/release-policy.md"),
    readText("docs/development-backlog.md"),
    readText("docs/stream-verification.md"),
    readText("docs/project-feature-test-inventory.md"),
    readText("docs/README.md"),
  ].join("\n");
  const serverSh = readText("server.sh");
  const scriptInventory = readText("scripts/internal/verify_script_inventory.mjs");
  const coverage = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
  const manifest = JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json"));
  for (const snippet of [
    "V210-S11",
    "Runtime/model bundle RC rehearsal",
    "media-server.runtime-model-bundle-rc-rehearsal-fixtures.v1",
    "media-server.runtime-model-bundle-rc-rehearsal-report.v1",
    "verify-runtime-model-bundle-rc-rehearsal",
    "source-only-default-pass",
    "runtime-model-included-blocked",
    "gpl-risk-runtime-binary-blocked",
    "release-asset-upload-blocked",
    "LAB-062",
    "SAFE-040",
  ]) {
    assert(docs.includes(snippet), `docs missing runtime/model bundle RC snippet: ${snippet}`);
  }
  for (const snippet of [
    "verify-runtime-model-bundle-rc-rehearsal",
    "verify_runtime_model_bundle_rc_rehearsal.mjs",
  ]) {
    assert(serverSh.includes(snippet), `server.sh missing runtime/model bundle RC snippet: ${snippet}`);
  }
  assert(scriptInventory.includes("verify_runtime_model_bundle_rc_rehearsal.mjs"), "script inventory missing runtime/model bundle RC verifier");
  for (const id of ["LAB-062", "SAFE-040"]) {
    assert(manifest.items.find(item => item.id === id)?.verifierEvidence?.command === "verify-runtime-model-bundle-rc-rehearsal",
      `${id} manifest verifier command drift`);
  }
  assert(coverage.includes("validateImplementationManifest") && coverage.includes("verifierEvidenceRows"),
    "feature coverage must validate manifest-backed verifier evidence");
});

let failCount = 0;
for (const item of checks) {
  try {
    item.fn();
    report.checks.push({ name: item.name, status: "pass" });
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    failCount += 1;
    report.gateStatus = "fail";
    const message = error instanceof Error ? error.message : String(error);
    report.checks.push({ name: item.name, status: "fail", message });
    console.log(`[fail] ${item.name}: ${message}`);
  }
}

assertRuntimeModelBundleArtifact(report);

console.log("");
console.log("== Runtime/model bundle RC rehearsal summary ==");
console.log(`- schema: ${report.schema}`);
console.log(`- gateStatus: ${report.gateStatus}`);
console.log(`- defaultReleaseBoundary: ${report.defaultReleaseBoundary}`);
console.log(`- actualBundleCreated: ${report.actualBundleCreated}`);
console.log(`- releaseAssetUploaded: ${report.releaseAssetUploaded}`);
console.log(`- runtimeModelBundleSelected: ${report.runtimeModelBundleSelected}`);
console.log(`- rcRehearsalOnly: ${report.rcRehearsalOnly}`);
console.log(`- allowedDefault: ${report.summary.allowedDefault}`);
console.log(`- rcOnly: ${report.summary.rcOnly}`);
console.log(`- blocked: ${report.summary.blocked}`);
console.log(`- pass: ${report.checks.filter(item => item.status === "pass").length}`);
console.log(`- fail: ${failCount}`);

if (args.report) writeText(path.resolve(rootDir, args.report), renderMarkdown(report));
if (args.jsonReport) writeText(path.resolve(rootDir, args.jsonReport), `${JSON.stringify(report, null, 2)}\n`);
if (failCount > 0) process.exit(1);

function evaluateFixtureCase(item) {
  const riskyRuntime = item.includesRuntime || item.gplRiskRuntime;
  const missingReview = (item.includesRuntime || item.includesModel || item.gplRiskRuntime) &&
    (!item.hashPresent || !item.provenancePresent || item.licenseReview === "missing");
  let decision = "rc-rehearsal-only";
  let allowedForDefaultRelease = false;
  let allowedForRcRehearsal = true;
  let blocked = false;
  if (item.candidate === "source-only" && !item.includesBinary && !riskyRuntime && !item.includesModel) {
    decision = "allow-default-source-only";
    allowedForDefaultRelease = true;
  } else if (item.releaseAssetUploadRequested) {
    decision = "blocked-release-asset-upload";
    allowedForRcRehearsal = false;
    blocked = true;
  } else if (item.gplRiskRuntime) {
    decision = "blocked-gpl-risk-runtime";
    allowedForRcRehearsal = false;
    blocked = true;
  } else if (missingReview) {
    decision = "blocked-missing-review-evidence";
    allowedForRcRehearsal = false;
    blocked = true;
  } else if (item.includesRuntime || item.includesModel) {
    decision = "blocked-runtime-or-model-included";
    allowedForRcRehearsal = false;
    blocked = true;
  }
  const actualBundleCreated = false;
  const releaseAssetUploaded = false;
  const status =
    item.expected?.decision === decision &&
    item.expected?.allowedForDefaultRelease === allowedForDefaultRelease &&
    item.expected?.allowedForRcRehearsal === allowedForRcRehearsal &&
    item.expected?.blocked === blocked &&
    item.expected?.actualBundleCreated === actualBundleCreated &&
    item.expected?.releaseAssetUploaded === releaseAssetUploaded
      ? "pass"
      : "fail";
  return {
    id: item.id,
    candidate: item.candidate,
    includesBinary: item.includesBinary,
    includesRuntime: item.includesRuntime,
    includesModel: item.includesModel,
    gplRiskRuntime: item.gplRiskRuntime,
    releaseAssetUploadRequested: item.releaseAssetUploadRequested,
    decision,
    allowedForDefaultRelease,
    allowedForRcRehearsal,
    blocked,
    actualBundleCreated,
    releaseAssetUploaded,
    status,
  };
}

function renderMarkdown(payload) {
  const lines = [
    "# Runtime/Model Bundle RC Rehearsal Report",
    "",
    `- schema: ${payload.schema}`,
    `- targetStep: ${payload.targetStep}`,
    `- generatedAt: ${payload.generatedAt}`,
    `- gateStatus: ${payload.gateStatus}`,
    `- defaultReleaseBoundary: ${payload.defaultReleaseBoundary}`,
    `- actualBundleCreated: ${payload.actualBundleCreated}`,
    `- releaseAssetUploaded: ${payload.releaseAssetUploaded}`,
    `- runtimeModelBundleSelected: ${payload.runtimeModelBundleSelected}`,
    `- rcRehearsalOnly: ${payload.rcRehearsalOnly}`,
    "",
    "## Fixture Cases",
    "",
    "| case | candidate | decision | default | rcOnly | blocked | assetUploaded | status |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (const item of payload.cases) {
    lines.push(`| ${cell(item.id)} | ${cell(item.candidate)} | ${cell(item.decision)} | ${item.allowedForDefaultRelease} | ${item.allowedForRcRehearsal && !item.allowedForDefaultRelease} | ${item.blocked} | ${item.releaseAssetUploaded} | ${item.status} |`);
  }
  lines.push("", "## Checks", "", "| check | status | message |", "| --- | --- | --- |");
  for (const checkItem of payload.checks) {
    lines.push(`| ${cell(checkItem.name)} | ${checkItem.status} | ${cell(checkItem.message || "")} |`);
  }
  return `${lines.join("\n")}\n`;
}

function parseArgs(argsList) {
  const parsed = {};
  for (let index = 0; index < argsList.length; index += 1) {
    const token = argsList[index];
    if (token.startsWith("--report=")) parsed.report = token.slice("--report=".length);
    else if (token === "--report") parsed.report = argsList[++index];
    else if (token.startsWith("--json-report=")) parsed.jsonReport = token.slice("--json-report=".length);
    else if (token === "--json-report") parsed.jsonReport = argsList[++index];
  }
  return parsed;
}

function check(name, fn) {
  checks.push({ name, fn });
}

function assertRuntimeModelBundleArtifact(value) {
  const artifactPath = path.join(process.env.TMPDIR || "/tmp", `media-server-runtime-model-bundle-${process.pid}.json`);
  fs.writeFileSync(artifactPath, `${JSON.stringify(value)}\n`, "utf8");
  try {
    const observedReport = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    assert(observedReport.schema === "media-server.runtime-model-bundle-rc-rehearsal-report.v1" && observedReport.cases.every(result => result.actualBundleCreated === false), "runtime/model bundle artifact actualBundleCreated readback mismatch");
  } finally {
    fs.rmSync(artifactPath, { force: true });
  }
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function writeText(outputPath, content) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, content, "utf8");
}

function cell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\s+/g, " ").trim() || "-";
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
