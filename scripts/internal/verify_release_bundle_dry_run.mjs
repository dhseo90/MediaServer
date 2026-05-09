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
  --binary <path>    bundle에 넣을 media_server binary입니다. 기본 build-gst-onnx/media_server.
  --work-dir <path>  dry-run bundle을 만들 디렉터리입니다. 기본은 /tmp 임시 디렉터리입니다.
  --policy <path>    bundle policy JSON입니다. 기본 config/bundle_distribution_policy.json.
  --keep             임시 bundle 디렉터리를 지우지 않습니다.
  -h, --help         도움말 출력
`);
}
assertKnownOptions(rawArgs, ["binary", "work-dir", "policy", "keep", "h", "help"]);

const args = parseArgs(rawArgs);
const binaryPath = path.resolve(rootDir, args.binary || defaultBinaryPath());
const policyPath = path.resolve(rootDir, args.policy || "config/bundle_distribution_policy.json");
const bundleRoot = args.workDir
  ? path.resolve(rootDir, args.workDir)
  : fs.mkdtempSync(path.join(os.tmpdir(), "media-server-release-bundle-"));
const keepBundle = args.keep === true || Boolean(args.workDir);

if (!fs.existsSync(binaryPath)) {
  fail(`media_server binary not found: ${path.relative(rootDir, binaryPath)}`);
}

assertSafeBundleRoot(bundleRoot);
prepareBundle(bundleRoot, binaryPath);
const reportPath = path.join(bundleRoot, "bundle-policy-report.md");
const jsonReportPath = path.join(bundleRoot, "bundle-policy-report.json");
const verifyScript = path.join(scriptDir, "verify_bundle_distribution_policy.mjs");
const result = spawnSync(process.execPath, [
  verifyScript,
  "--bundle-dir",
  bundleRoot,
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

console.log(`[pass] release bundle dry-run: ${bundleRoot}`);
console.log(`[pass] release bundle policy report: ${reportPath}`);
if (!keepBundle) {
  fs.rmSync(bundleRoot, { recursive: true, force: true });
  console.log("[pass] release bundle dry-run cleanup complete");
}

function prepareBundle(bundleRootPath, sourceBinary) {
  fs.rmSync(bundleRootPath, { recursive: true, force: true });
  fs.mkdirSync(path.join(bundleRootPath, "bin"), { recursive: true });
  fs.mkdirSync(path.join(bundleRootPath, "docs"), { recursive: true });
  fs.writeFileSync(path.join(bundleRootPath, ".media_server_release_bundle_dry_run"), "generated\n", "utf8");
  copyFile(sourceBinary, path.join(bundleRootPath, "bin", "media_server"));
  for (const file of ["README.md", "LICENSE", "NOTICE", "THIRD_PARTY_NOTICES.md", "DEPENDENCY_SNAPSHOT.md"]) {
    copyIfExists(path.join(rootDir, file), path.join(bundleRootPath, file));
  }
  for (const file of ["docs/distribution-policy.md", "docs/stream-verification.md"]) {
    copyIfExists(path.join(rootDir, file), path.join(bundleRootPath, file));
  }
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
    if (raw === "keep") {
      parsed.keep = true;
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

function fail(message) {
  console.error(`[fail] ${message}`);
  process.exit(1);
}
