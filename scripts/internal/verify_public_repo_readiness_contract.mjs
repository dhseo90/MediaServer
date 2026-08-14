#!/usr/bin/env node
// 파일 용도: public readiness scanner가 개인 경로, raw evidence, 대형 text secret을 실제로 차단하는지 검증한다.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const rawArgs = process.argv.slice(2);
if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Public repo readiness contract verification

Usage:
  ./server.sh verify-public-repo-readiness-contract

Checks personal paths, ephemeral temp paths, large tracked-text secrets,
raw release artifacts, and bounded public summaries.
`);
}
assertKnownOptions(rawArgs, ["h", "help"]);

let scanner = null;
try {
  scanner = await import("./public_repo_readiness_lib.mjs");
} catch (_error) {
  scanner = null;
}

assert(scanner, "public_repo_readiness_lib.mjs must exist");
assert(typeof scanner.scanTrackedTextFile === "function", "scanTrackedTextFile export missing");
assert(typeof scanner.findDeniedContent === "function", "findDeniedContent export missing");
assert(typeof scanner.isDeniedArtifactPath === "function", "isDeniedArtifactPath export missing");

const policy = {
  deniedTrackedContentPatterns: [
    { id: "personal-home-path", pattern: "(?:^|[\\\"' ])/(?:Users|home)/[^/\\s]+/" },
    { id: "ephemeral-private-tmp", pattern: "\\x2fprivate\\x2fvar\\x2ffolders\\x2f[^\\s\\\"']+" },
  ],
  deniedReleaseArtifactBasenames: [
    "auth-registry",
    "registry.json",
    "seed.json",
    "ports.json",
    "server.log",
    "trace.log",
  ],
  trackedTextExtensions: [".md", ".json", ".jsonl", ".mjs", ".cpp", ".h", ".txt", ".html", ".yml", ".yaml", ".sh"],
  secretPatterns: [
    { id: "github-token", pattern: "gh[pousr]_[A-Za-z0-9_]{20,}" },
  ],
};

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "media-server-public-contract-"));
try {
  const cases = [
    {
      path: "docs/report.md",
      text: ["", "Users", "example", "private", "repo"].join("/"),
      expectedId: "personal-home-path",
    },
    {
      path: "docs/report.md",
      text: ["", "private", "var", "folders", "ab", "temp", "run.json"].join("/"),
      expectedId: "ephemeral-private-tmp",
    },
    {
      path: "test/fixtures/large.json",
      text: `${"x".repeat(2 * 1024 * 1024)}ghp_${"A".repeat(24)}`,
      expectedId: "github-token",
    },
  ];

  for (const item of cases) {
    const absolute = path.join(tempRoot, path.basename(item.path));
    fs.writeFileSync(absolute, item.text, "utf8");
    const hits = scanner.scanTrackedTextFile(absolute, item.path, policy);
    assert(hits.some((hit) => hit.id === item.expectedId), `${item.expectedId} was not detected in ${item.path}`);
  }

  for (const denied of [
    "docs/release-artifacts/v3.9.1/run/auth-registry",
    "docs/release-artifacts/v3.9.1/run/server.log",
  ]) {
    assert(scanner.isDeniedArtifactPath(denied, policy), `raw release artifact was allowed: ${denied}`);
  }

  for (const allowed of [
    "docs/release-artifacts/v3.9.1/final/summary.json",
    "docs/release-artifacts/v3.9.1/final/report.md",
  ]) {
    assert(!scanner.isDeniedArtifactPath(allowed, policy), `bounded release artifact was denied: ${allowed}`);
  }

  const repositoryRelative = scanner.findDeniedContent("docs/release-artifacts/v3.9.1/final/summary.json", policy);
  assert(repositoryRelative.length === 0, "repository-relative path was treated as denied content");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

console.log("Public repo readiness contract verification");
console.log("- personal home path: PASS");
console.log("- ephemeral temp path: PASS");
console.log("- large tracked text secret: PASS");
console.log("- raw release artifact path: PASS");
console.log("- bounded summary path: PASS");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
