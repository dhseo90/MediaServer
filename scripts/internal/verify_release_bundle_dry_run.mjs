#!/usr/bin/env node
// 파일 용도: 기본 release bundle 구성을 임시 디렉터리에 만들고 bundle policy gate를 실행한다.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Release bundle dry-run

Usage:
  ./server.sh verify-release-bundle-dry-run [options]

Options:
  --candidate <list>          검사할 후보입니다. all, source-only, local-binary, offline-package, container-root.
                              쉼표로 여러 후보를 지정할 수 있습니다. 기본 all.
  --binary <path>             bundle에 넣을 media_server binary입니다. 기본 build-gst-onnx/media_server.
  --work-dir <path>           dry-run bundle을 만들 디렉터리입니다. 기본은 /tmp 임시 디렉터리입니다.
  --policy <path>             bundle policy JSON입니다. 기본 config/bundle_distribution_policy.json.
  --no-negative-fixtures      위험 후보가 정책 gate에서 차단되는지 확인하는 fixture 검사를 건너뜁니다.
  --keep                      임시 bundle 디렉터리를 지우지 않습니다.
  -h, --help                  도움말 출력
`);
}
assertKnownOptions(rawArgs, ["candidate", "binary", "work-dir", "policy", "no-negative-fixtures", "keep", "h", "help"]);

const args = parseArgs(rawArgs);
const binaryPath = path.resolve(rootDir, args.binary || defaultBinaryPath());
const policyPath = path.resolve(rootDir, args.policy || "config/bundle_distribution_policy.json");
const bundleRoot = args.workDir
  ? path.resolve(rootDir, args.workDir)
  : fs.mkdtempSync(path.join(os.tmpdir(), "media-server-release-bundle-"));
const keepBundle = args.keep === true || Boolean(args.workDir);
const CANDIDATES = [
  {
    id: "source-only",
    requiresBinary: false,
    prepare: prepareSourceOnlyBundle,
  },
  {
    id: "local-binary",
    requiresBinary: true,
    prepare: prepareLocalBinaryBundle,
  },
  {
    id: "offline-package",
    requiresBinary: true,
    prepare: prepareOfflinePackageBundle,
  },
  {
    id: "container-root",
    requiresBinary: true,
    prepare: prepareContainerRootBundle,
  },
];
const CANDIDATE_BY_ID = new Map(CANDIDATES.map((candidate) => [candidate.id, candidate]));
const selectedCandidates = parseCandidateSelection(args.candidate || "all");
const singleCandidateAtRoot = selectedCandidates.length === 1;
const verifyNegativeFixtures = args.noNegativeFixtures !== true;

if (selectedCandidates.some((candidate) => candidate.requiresBinary) && !fs.existsSync(binaryPath)) {
  fail(`media_server binary not found: ${path.relative(rootDir, binaryPath)}`);
}

assertSafeBundleRoot(bundleRoot);
prepareBundleWorkspace(bundleRoot);
const verifyScript = path.join(scriptDir, "verify_bundle_distribution_policy.mjs");

const candidateReports = [];
for (const candidate of selectedCandidates) {
  const candidateRoot = singleCandidateAtRoot ? bundleRoot : path.join(bundleRoot, candidate.id);
  candidate.prepare(candidateRoot);
  candidateReports.push(runPolicyGate({
    id: candidate.id,
    bundleDir: candidateRoot,
    reportPath: path.join(candidateRoot, "bundle-policy-report.md"),
    jsonReportPath: path.join(candidateRoot, "bundle-policy-report.json"),
  }));
}

const negativeFixtureReports = verifyNegativeFixtures
  ? runNegativeFixtureChecks(path.join(bundleRoot, "_negative-policy-fixtures"))
  : [];
const summary = buildDryRunSummary({ candidateReports, negativeFixtureReports });
const summaryPath = path.join(bundleRoot, "release-bundle-dry-run-summary.md");
const summaryJsonPath = path.join(bundleRoot, "release-bundle-dry-run-summary.json");
writeText(summaryPath, renderDryRunSummaryMarkdown(summary));
writeText(summaryJsonPath, `${JSON.stringify(summary, null, 2)}\n`);

console.log(`[pass] release bundle dry-run: ${bundleRoot}`);
console.log(`[pass] release bundle candidates: ${candidateReports.map((report) => report.candidate).join(", ")}`);
console.log(`[pass] release bundle dry-run summary: ${summaryPath}`);
if (!keepBundle) {
  fs.rmSync(bundleRoot, { recursive: true, force: true });
  console.log("[pass] release bundle dry-run cleanup complete");
}

function prepareSourceOnlyBundle(bundleRootPath) {
  prepareCandidateRoot(bundleRootPath, "source-only");
  copyCommonReleaseDocs(bundleRootPath);
  copyIfExists(path.join(rootDir, "server.sh"), path.join(bundleRootPath, "server.sh"));
  copyIfExists(path.join(rootDir, "config/bundle_distribution_policy.json"), path.join(bundleRootPath, "config/bundle_distribution_policy.json"));
  writeCandidateManifest(bundleRootPath, {
    candidate: "source-only",
    includesBinary: false,
    packageShape: "source archive rehearsal",
  });
}

function prepareLocalBinaryBundle(bundleRootPath) {
  prepareCandidateRoot(bundleRootPath, "local-binary");
  fs.mkdirSync(path.join(bundleRootPath, "bin"), { recursive: true });
  copyFile(binaryPath, path.join(bundleRootPath, "bin", "media_server"));
  copyCommonReleaseDocs(bundleRootPath);
  writeCandidateManifest(bundleRootPath, {
    candidate: "local-binary",
    includesBinary: true,
    packageShape: "local binary bundle rehearsal",
  });
}

function prepareOfflinePackageBundle(bundleRootPath) {
  prepareCandidateRoot(bundleRootPath, "offline-package");
  fs.mkdirSync(path.join(bundleRootPath, "bin"), { recursive: true });
  fs.mkdirSync(path.join(bundleRootPath, "offline"), { recursive: true });
  copyFile(binaryPath, path.join(bundleRootPath, "bin", "media_server"));
  copyCommonReleaseDocs(bundleRootPath);
  writeText(path.join(bundleRootPath, "offline/INSTALL.md"), [
    "# Offline Package Rehearsal",
    "",
    "This dry-run package intentionally omits FFmpeg, GStreamer, ONNX Runtime, model files,",
    "customer media, logs, auth stores, snapshots, and evidence bundles.",
    "",
    "Runtime dependencies remain user-installed package manager dependencies.",
    "",
  ].join("\n"));
  writeCandidateManifest(bundleRootPath, {
    candidate: "offline-package",
    includesBinary: true,
    packageShape: "offline package rehearsal without third-party runtime or model binaries",
  });
}

function prepareContainerRootBundle(bundleRootPath) {
  prepareCandidateRoot(bundleRootPath, "container-root");
  const appRoot = path.join(bundleRootPath, "opt/media-server");
  const docRoot = path.join(bundleRootPath, "usr/local/share/doc/media-server");
  fs.mkdirSync(path.join(appRoot, "bin"), { recursive: true });
  fs.mkdirSync(docRoot, { recursive: true });
  copyFile(binaryPath, path.join(appRoot, "bin", "media_server"));
  copyCommonReleaseDocs(appRoot);
  copyIfExists(path.join(rootDir, "THIRD_PARTY_NOTICES.md"), path.join(docRoot, "THIRD_PARTY_NOTICES.md"));
  writeText(path.join(bundleRootPath, "container-root.README.md"), [
    "# Container Root Rehearsal",
    "",
    "This root filesystem fixture represents a container release candidate shape only.",
    "It intentionally avoids copying package-manager runtime directories, ONNX Runtime packages,",
    "model binaries, source URLs, logs, auth stores, snapshots, and evidence bundles.",
    "",
  ].join("\n"));
  writeCandidateManifest(appRoot, {
    candidate: "container-root",
    includesBinary: true,
    packageShape: "container root filesystem rehearsal without bundled media/runtime/model payloads",
  });
}

function prepareCandidateRoot(bundleRootPath, candidateId) {
  fs.rmSync(bundleRootPath, { recursive: true, force: true });
  fs.mkdirSync(bundleRootPath, { recursive: true });
  fs.writeFileSync(path.join(bundleRootPath, ".media_server_release_bundle_dry_run"), "generated\n", "utf8");
  writeText(path.join(bundleRootPath, "REHEARSAL_SCOPE.md"), [
    `# ${candidateId} Release Bundle Rehearsal`,
    "",
    "- Source-only policy remains the default release boundary.",
    "- FFmpeg/GStreamer GPL-risk runtime, ONNX Runtime package, model binary, customer media, auth store, logs, snapshots, and evidence bundles are intentionally excluded.",
    "- This directory is a dry-run fixture, not a release asset.",
    "",
  ].join("\n"));
}

function copyCommonReleaseDocs(destinationRoot) {
  fs.mkdirSync(path.join(destinationRoot, "docs"), { recursive: true });
  for (const file of ["README.md", "README.en.md", "LICENSE", "NOTICE", "THIRD_PARTY_NOTICES.md", "DEPENDENCY_SNAPSHOT.md", "CONTRIBUTING.md"]) {
    copyIfExists(path.join(rootDir, file), path.join(destinationRoot, file));
  }
  for (const file of ["docs/distribution-policy.md", "docs/release-policy.md", "docs/stream-verification.md", "docs/versioning-policy.md"]) {
    copyIfExists(path.join(rootDir, file), path.join(destinationRoot, file));
  }
}

function writeCandidateManifest(destinationRoot, fields) {
  writeText(path.join(destinationRoot, "release-bundle-candidate-manifest.json"), `${JSON.stringify({
    schema: "media-server.release-bundle-dry-run-candidate.v1",
    generatedAt: new Date().toISOString(),
    releaseBoundary: "source-only-default-without-third-party-runtime-or-model-binaries",
    excludedByDefault: [
      "ffmpeg",
      "ffprobe",
      "libav*",
      "x264/x265",
      "GStreamer GPL-risk plugins",
      "ONNX Runtime package",
      "YOLO/model binaries",
      "customer or field media",
      "auth store",
      "logs",
      "snapshots",
      "evidence bundles",
    ],
    ...fields,
  }, null, 2)}\n`);
}

function prepareBundleWorkspace(bundleRootPath) {
  fs.rmSync(bundleRootPath, { recursive: true, force: true });
  fs.mkdirSync(bundleRootPath, { recursive: true });
  fs.writeFileSync(path.join(bundleRootPath, ".media_server_release_bundle_dry_run"), "generated\n", "utf8");
}

function assertSafeBundleRoot(bundleRootPath) {
  const resolved = path.resolve(bundleRootPath);
  if (resolved === rootDir || rootDir.startsWith(`${resolved}${path.sep}`)) {
    fail(`unsafe work-dir for dry-run cleanup: ${path.relative(rootDir, resolved) || "."}`);
  }
  if (!fs.existsSync(resolved)) return;
  const marker = path.join(resolved, ".media_server_release_bundle_dry_run");
  const entries = fs.readdirSync(resolved).filter((name) => name !== ".DS_Store");
  if (entries.length > 0 && !fs.existsSync(marker)) {
    fail(`work-dir is not empty and has no dry-run marker: ${path.relative(rootDir, resolved)}`);
  }
}

function runPolicyGate({ id, bundleDir, reportPath, jsonReportPath }) {
  const result = spawnSync(process.execPath, [
    verifyScript,
    "--bundle-dir",
    bundleDir,
    "--policy",
    policyPath,
    "--output",
    reportPath,
    "--json-output",
    jsonReportPath,
  ], {
    cwd: rootDir,
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });

  process.stdout.write(result.stdout || "");
  process.stderr.write(result.stderr || "");
  if (result.status !== 0 || result.error) {
    if (!keepBundle) console.log(`[info] failed dry-run bundle kept for inspection: ${bundleRoot}`);
    process.exit(result.status || 1);
  }
  const report = readJson(jsonReportPath);
  return {
    candidate: id,
    status: report.status,
    filesScanned: report.filesScanned,
    pathHitCount: report.pathHitCount,
    linkedHitCount: report.linkedHitCount,
    bundleDir: path.relative(rootDir, bundleDir).replaceAll(path.sep, "/") || ".",
    report: path.relative(rootDir, reportPath).replaceAll(path.sep, "/"),
    jsonReport: path.relative(rootDir, jsonReportPath).replaceAll(path.sep, "/"),
  };
}

function runNegativeFixtureChecks(fixtureRoot) {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
  const fixtures = [
    {
      id: "binary-ffmpeg-cli",
      file: "bin/ffmpeg",
      expectedRule: "ffmpeg-cli",
    },
    {
      id: "offline-model-binary",
      file: "models/yolo11n.onnx",
      expectedRule: "model-binary",
    },
    {
      id: "container-onnx-runtime-package",
      file: "opt/media-server/lib/libonnxruntime.dylib",
      expectedRule: "onnx-runtime-package",
    },
    {
      id: "container-gstreamer-gpl-plugin",
      file: "usr/lib/gstreamer-1.0/libgstlibav.so",
      expectedRule: "gstreamer-gpl-risk-plugins",
    },
  ];
  const reports = [];
  for (const fixture of fixtures) {
    const root = path.join(fixtureRoot, fixture.id);
    fs.mkdirSync(path.dirname(path.join(root, fixture.file)), { recursive: true });
    writeText(path.join(root, ".media_server_release_bundle_dry_run"), "generated\n");
    writeText(path.join(root, fixture.file), "dry-run blocked fixture\n");
    const jsonReportPath = path.join(root, "bundle-policy-report.json");
    const result = spawnSync(process.execPath, [
      verifyScript,
      "--bundle-dir",
      root,
      "--policy",
      policyPath,
      "--json-output",
      jsonReportPath,
    ], {
      cwd: rootDir,
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
    });
    if (result.status === 0 || result.error) {
      process.stdout.write(result.stdout || "");
      process.stderr.write(result.stderr || "");
      fail(`negative fixture was not blocked: ${fixture.id}`);
    }
    const report = readJson(jsonReportPath);
    const hitRules = new Set((report.hits || []).map((hit) => hit.ruleId));
    if (!hitRules.has(fixture.expectedRule)) {
      process.stdout.write(result.stdout || "");
      process.stderr.write(result.stderr || "");
      fail(`negative fixture did not hit expected rule ${fixture.expectedRule}: ${fixture.id}`);
    }
    reports.push({
      fixture: fixture.id,
      status: "blocked",
      expectedRule: fixture.expectedRule,
      hitCount: report.hits.length,
    });
    console.log(`[pass] blocked risky fixture: ${fixture.id} -> ${fixture.expectedRule}`);
  }
  return reports;
}

function buildDryRunSummary({ candidateReports, negativeFixtureReports }) {
  return {
    schema: "media-server.release-bundle-dry-run-summary.v1",
    generatedAt: new Date().toISOString(),
    policy: path.relative(rootDir, policyPath).replaceAll(path.sep, "/"),
    bundleRoot: path.relative(rootDir, bundleRoot).replaceAll(path.sep, "/") || ".",
    binary: selectedCandidates.some((candidate) => candidate.requiresBinary)
      ? path.relative(rootDir, binaryPath).replaceAll(path.sep, "/")
      : null,
    candidates: candidateReports,
    negativeFixtures: negativeFixtureReports,
  };
}

function renderDryRunSummaryMarkdown(summary) {
  const lines = [
    "# Release Bundle Dry-Run Summary",
    "",
    `- schema: ${summary.schema}`,
    `- generatedAt: ${summary.generatedAt}`,
    `- policy: ${summary.policy}`,
    `- bundleRoot: ${summary.bundleRoot}`,
    `- binary: ${summary.binary || "not required"}`,
    "",
    "## Candidates",
    "",
    "| Candidate | Status | Files | Path hits | Linked hits | Report |",
    "| --- | --- | ---: | ---: | ---: | --- |",
  ];
  for (const candidate of summary.candidates) {
    lines.push(`| ${cell(candidate.candidate)} | ${cell(candidate.status)} | ${candidate.filesScanned} | ${candidate.pathHitCount} | ${candidate.linkedHitCount} | ${cell(candidate.report)} |`);
  }
  lines.push("", "## Negative Policy Fixtures", "", "| Fixture | Status | Expected rule | Hits |", "| --- | --- | --- | ---: |");
  if (summary.negativeFixtures.length === 0) {
    lines.push("| skipped | skipped | - | 0 |");
  } else {
    for (const fixture of summary.negativeFixtures) {
      lines.push(`| ${cell(fixture.fixture)} | ${cell(fixture.status)} | ${cell(fixture.expectedRule)} | ${fixture.hitCount} |`);
    }
  }
  return `${lines.join("\n")}\n`;
}

function copyIfExists(from, to) {
  if (!fs.existsSync(from)) return;
  copyFile(from, to);
}

function copyFile(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

function defaultBinaryPath() {
  const candidates = ["build-gst-onnx/media_server", "build-gst/media_server", "build/media_server"];
  return candidates.find((candidate) => fs.existsSync(path.join(rootDir, candidate))) || candidates[0];
}

function parseCandidateSelection(value) {
  const aliases = new Map([
    ["source", "source-only"],
    ["source-only", "source-only"],
    ["binary", "local-binary"],
    ["local-binary", "local-binary"],
    ["offline", "offline-package"],
    ["offline-package", "offline-package"],
    ["container", "container-root"],
    ["container-root", "container-root"],
  ]);
  const requested = String(value || "all").split(",").map((token) => token.trim()).filter(Boolean);
  const ids = requested.includes("all")
    ? CANDIDATES.map((candidate) => candidate.id)
    : requested.map((token) => aliases.get(token) || token);
  const uniqueIds = [...new Set(ids)];
  const unknown = uniqueIds.filter((id) => !CANDIDATE_BY_ID.has(id));
  if (unknown.length > 0) {
    fail(`unknown release bundle candidate: ${unknown.join(", ")}`);
  }
  return uniqueIds.map((id) => CANDIDATE_BY_ID.get(id));
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const raw = token.slice(2);
    const eq = raw.indexOf("=");
    if (eq >= 0) {
      parsed[toCamel(raw.slice(0, eq))] = raw.slice(eq + 1);
      continue;
    }
    if (raw === "keep" || raw === "no-negative-fixtures") {
      parsed[toCamel(raw)] = true;
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      parsed[toCamel(raw)] = next;
      index += 1;
    } else {
      parsed[toCamel(raw)] = "1";
    }
  }
  return parsed;
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_match, chr) => chr.toUpperCase());
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeText(filePath, text) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, text, "utf8");
}

function cell(value) {
  return String(value || "-").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
}

function fail(message) {
  console.error(`[fail] ${message}`);
  process.exit(1);
}
