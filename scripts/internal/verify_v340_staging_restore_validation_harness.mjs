#!/usr/bin/env node
// 파일 용도: v3.4.0 Step 4 Staging Restore Validation Harness와 문서/inventory 연결을 검증한다.

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.4.0 Staging Restore Validation Harness

Usage:
  ./server.sh verify-v340-staging-restore-validation-harness

Checks:
  - validates a temporary restore runtime without production writes
  - rejects invalid JSON, duplicate sourceId, missing PublishedView sourceId references, auth store mode != 0600, checksum mismatch, and invalid viewer scopes
  - checks backlog, stream verification, release records, feature inventory, coverage verifier, script inventory, and server dispatch wiring
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v340-staging-restore-validation-harness";
const schema = "media-server.ops.v340-staging-restore-validation-harness.v1";
const files = {
  server: readText("src/ingress/webrtc_http_server.cpp"),
  backlog: readText("docs/development-backlog.md"),
  streamVerification: readText("docs/stream-verification.md"),
  featureInventory: readText("docs/project-feature-test-inventory.md"),
  featureCoverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
  projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  releaseRecords: readText("docs/release-test-records.md"),
  serverSh: readText("server.sh"),
};

const checks = [];

check("staging restore harness rejects invalid restore packages in a temporary runtime", () => {
  const result = runHarnessSelfTest();
  assert(result.pass === 7, `expected 7 passing harness cases, got ${result.pass}`);
  assert(result.fail === 0, `expected 0 failing harness cases, got ${result.fail}`);
  assert(result.cleanupOk === true, "temporary runtime cleanup failed");
});

check("candidate package exposes staging restore validation command and no-production-write boundary", () => {
  for (const snippet of [
    "stagingRestoreValidationHarness",
    "./server.sh verify-v340-staging-restore-validation-harness",
    "productionWritePerformed",
    "stagingOnly",
    "authStoreMode0600",
    "checksumVerified",
    "viewerScopeVerified",
    "duplicateSourceIdRejected",
    "missingSourceIdReferenceRejected",
  ]) {
    assertIncludes(files.server, snippet, "v340 candidate package staging harness markers");
  }
});

check("roadmap records v3.4 Step 4 staging restore validation harness", () => {
  for (const snippet of [
    "| 4 | v3.4.0 (4) Staging Restore Validation Harness | P0 | 완료 |",
    "임시 runtime에서 JSON parse, 중복 ID, 누락 sourceId 참조, auth store `0600`, checksum, viewer scope를 production write 없이 검증",
    "## v3.4.0 Step 4 개발 기록",
    "`./server.sh verify-v340-staging-restore-validation-harness`",
    "verify_v340_staging_restore_validation_harness.mjs",
    "production write 없이 검증",
    "source health replay/diff, Ops UI, approval-gated checklist 완료 evidence가 아닙니다",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog v3.4 Step 4");
  }
});

check("stream verification exposes v3.4 Step 4 command and boundary", () => {
  for (const snippet of [
    `| v3.4.0 (4) | \`./server.sh ${command}\` | Staging Restore Validation Harness.`,
    "temporary staging runtime",
    "JSON parse, duplicate sourceId, missing sourceId reference, auth store `0600`, checksum, viewer scope",
    "production write 없이 검증",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification v3.4 Step 4");
  }
});

check("feature inventory and release records map v3.4 Step 4", () => {
  for (const snippet of [
    `v3.4.0 (4) Staging Restore Validation Harness | \`LAB-090\`, \`SAFE-127\`, \`OPS-094\` | \`${command}\``,
    "LAB-090 | V340 Step 4 staging restore validation harness",
    "SAFE-127 | V340 Step 4 staging restore no-production-write boundary",
    "OPS-094 | V340 Step 4 Staging Restore Validation Harness 게이트",
  ]) {
    assertIncludes(files.featureInventory, snippet, "feature inventory v3.4 Step 4");
  }
  for (const snippet of [
    "V340 Staging Restore Validation Harness",
    `\`./server.sh ${command}\``,
    "v340 Step 4 RED staging restore validation harness gate",
    "v340 Step 4 staging restore validation harness final",
    "v340 Step 4 UI 풀테스트",
    "v340 Step 4 30분/120분 longrun",
  ]) {
    assertIncludes(files.releaseRecords, snippet, "release records v3.4 Step 4");
  }
});

check("server entrypoint and inventory verifiers include v3.4 Step 4 command", () => {
  assertIncludes(files.serverSh, command, "server.sh command");
  assertIncludes(files.serverSh, "verify_v340_staging_restore_validation_harness.mjs", "server.sh script dispatch");
  assertIncludes(files.featureCoverageVerifier, command, "feature coverage verifier");
  for (const id of ["LAB-090", "SAFE-127", "OPS-094"]) {
    assertIncludes(files.projectInventoryVerifier, id, `project inventory verifier ${id}`);
  }
  assertIncludes(files.scriptInventory, "verify_v340_staging_restore_validation_harness.mjs", "script inventory");
});

const results = runChecks();
console.log("");
console.log("== v3.4.0 staging restore validation harness summary ==");
console.log(`- schema: ${schema}`);
console.log("- step: v3.4.0 (4)");
console.log("- stagingRuntime: temporary-only-cleaned");
console.log("- validates: JSON parse, duplicate sourceId, missing PublishedView sourceId, auth store 0600, checksum, viewer scope");
console.log("- productionWritePerformed: false");
console.log("- uiFulltest: not-run-by-this-command");
console.log("- longrun30Or120: not-run-by-this-command");
console.log(`- pass: ${results.pass}`);
console.log(`- fail: ${results.fail}`);
if (results.fail > 0) process.exit(1);

function runHarnessSelfTest() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "media-server-v340-staging-"));
  let cleanupOk = false;
  const cases = [];
  try {
    cases.push(expectValid("valid package", root, buildFixture()));
    cases.push(expectInvalid("invalid JSON", root, buildFixture(), (fixture) => {
      fixture.rawSourceRegistryJson = "{";
    }, "source registry JSON parse failed"));
    cases.push(expectInvalid("duplicate sourceId", root, buildFixture(), (fixture) => {
      fixture.sourceRegistry.sources.push({ ...fixture.sourceRegistry.sources[0], displayName: "Duplicate" });
    }, "duplicate sourceId"));
    cases.push(expectInvalid("missing PublishedView sourceId", root, buildFixture(), (fixture) => {
      fixture.publishedViews.views[0].sourceId = "missing-source";
    }, "missing sourceId reference"));
    cases.push(expectInvalid("auth store mode", root, buildFixture(), (fixture) => {
      fixture.authStoreMode = 0o644;
    }, "auth store mode must be 0600"));
    cases.push(expectInvalid("checksum mismatch", root, buildFixture(), (fixture) => {
      fixture.expectedChecksums["source-registry.json"] = "sha256:bad";
    }, "checksum mismatch"));
    cases.push(expectInvalid("viewer scope", root, buildFixture(), (fixture) => {
      fixture.publishedViews.views[0].clientGroups = [];
    }, "viewer scope missing"));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    cleanupOk = !fs.existsSync(root);
  }
  return {
    pass: cases.filter(Boolean).length,
    fail: cases.filter((item) => !item).length,
    cleanupOk,
  };
}

function expectValid(name, root, fixture) {
  const result = validateStagingRestoreFixture(root, name, fixture);
  assert(result.ok, `${name} expected valid, got ${result.error}`);
  return true;
}

function expectInvalid(name, root, fixture, mutate, expectedError) {
  mutate(fixture);
  const result = validateStagingRestoreFixture(root, name, fixture);
  assert(!result.ok, `${name} expected invalid`);
  assert(result.error.includes(expectedError), `${name} expected error ${expectedError}, got ${result.error}`);
  return true;
}

function buildFixture() {
  const sourceRegistry = {
    schema: "media-server.ops.source-registry.staging.v1",
    sources: [
      { sourceId: "source-a", kind: "rtsp", displayName: "Lobby", enabled: true },
      { sourceId: "source-b", kind: "webrtc", displayName: "Gate", enabled: true },
    ],
  };
  const publishedViews = {
    schema: "media-server.ops.published-view.staging.v1",
    views: [
      { viewId: "view-a", sourceId: "source-a", clientGroups: ["ops"], enabled: true },
      { viewId: "view-b", sourceId: "source-b", clientGroups: ["ops"], enabled: true },
    ],
  };
  return {
    sourceRegistry,
    publishedViews,
    rawSourceRegistryJson: "",
    rawPublishedViewsJson: "",
    authStoreMode: 0o600,
    expectedChecksums: {},
    productionWritePlanned: false,
  };
}

function validateStagingRestoreFixture(root, name, fixture) {
  const stagingRoot = path.join(root, name.replace(/[^a-z0-9-]+/gi, "-"));
  fs.mkdirSync(stagingRoot, { recursive: true });
  const sourceText = fixture.rawSourceRegistryJson || `${JSON.stringify(fixture.sourceRegistry, null, 2)}\n`;
  const viewsText = fixture.rawPublishedViewsJson || `${JSON.stringify(fixture.publishedViews, null, 2)}\n`;
  const sourcePath = path.join(stagingRoot, "source-registry.json");
  const viewsPath = path.join(stagingRoot, "published-views.json");
  const authPath = path.join(stagingRoot, "auth-users.json");
  fs.writeFileSync(sourcePath, sourceText);
  fs.writeFileSync(viewsPath, viewsText);
  fs.writeFileSync(authPath, "{\"users\":[]}\n", { mode: fixture.authStoreMode });
  fs.chmodSync(authPath, fixture.authStoreMode);

  const checksums = {
    "source-registry.json": `sha256:${sha256(sourceText)}`,
    "published-views.json": `sha256:${sha256(viewsText)}`,
    ...fixture.expectedChecksums,
  };
  if (fixture.productionWritePlanned) {
    return { ok: false, error: "production write planned" };
  }
  let sources;
  let views;
  try {
    sources = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  } catch {
    return { ok: false, error: "source registry JSON parse failed" };
  }
  try {
    views = JSON.parse(fs.readFileSync(viewsPath, "utf8"));
  } catch {
    return { ok: false, error: "published views JSON parse failed" };
  }
  const sourceIds = new Set();
  for (const source of sources.sources || []) {
    if (!source.sourceId) return { ok: false, error: "sourceId missing" };
    if (sourceIds.has(source.sourceId)) return { ok: false, error: "duplicate sourceId" };
    sourceIds.add(source.sourceId);
  }
  for (const view of views.views || []) {
    if (!sourceIds.has(view.sourceId)) return { ok: false, error: "missing sourceId reference" };
    if (!Array.isArray(view.clientGroups) || view.clientGroups.length === 0) {
      return { ok: false, error: "viewer scope missing" };
    }
  }
  const authMode = fs.statSync(authPath).mode & 0o777;
  if (authMode !== 0o600) {
    return { ok: false, error: "auth store mode must be 0600" };
  }
  for (const [file, expected] of Object.entries(checksums)) {
    const actual = `sha256:${sha256(fs.readFileSync(path.join(stagingRoot, file)))}`;
    if (actual !== expected) {
      return { ok: false, error: "checksum mismatch" };
    }
  }
  return { ok: true, error: "" };
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
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

function check(name, fn) {
  checks.push({ name, fn });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing snippet: ${snippet}`);
}
