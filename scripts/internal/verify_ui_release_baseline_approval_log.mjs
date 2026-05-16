#!/usr/bin/env node
// 파일 용도: UI visual release baseline approval log template과 CI 연결을 정적 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`UI release baseline approval log verification

Usage:
  ./server.sh verify-ui-release-baseline-approval-log

Checks:
  - docs/ui-visual-release-baseline-approval-template.md required fields
  - PR/release/verification docs link the approval log workflow
  - preflight CI runs this presence check without write permissions
`);
}
assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];

check("release baseline approval template has required fields", () => {
  const template = readText("docs/ui-visual-release-baseline-approval-template.md");
  for (const snippet of [
    "UI Visual Release Baseline Approval Log",
    "approved comparator",
    "public release asset",
    "candidate pass proof",
    "## Baseline Identity",
    "baseline run:",
    "branch/tag:",
    "commit:",
    "artifact directory:",
    "`visual-regression-manifest.json`:",
    "`index.md`:",
    "retention: 45 days",
    "## Replacement Reason",
    "affected pages/viewports:",
    "expected visual change:",
    "linked issue/PR:",
    "## Comparison Evidence",
    "previous baseline artifact:",
    "candidate artifact:",
    "`visual-baseline-diff.json`:",
    "`visual-baseline-diff.md`:",
    "decision: pass / review / fail",
    "review-required items:",
    "## Manual Review",
    "320px reviewed:",
    "390px reviewed:",
    "760px reviewed:",
    "1180px reviewed:",
    "client/viewer source URL hidden:",
    "Developer URL hidden:",
    "raw JSON/debug counters/BBox diagnostics hidden:",
    "rule/profile editor hidden from client/viewer:",
    "## Approval",
    "approver:",
    "approval date:",
    "accepted baseline run:",
    "release/RC note link:",
    "## Not Run / Limitations",
    "실물 ONVIF/RTSP/WebRTC 원본 장비 field smoke:",
    "장시간 테스트:",
    "`verify-predev`:",
    "reason:",
  ]) {
    assert(template.includes(snippet), `approval template missing snippet: ${snippet}`);
  }
});

check("PR and release docs require approval log evidence", () => {
  const docs = [
    readText(".github/PULL_REQUEST_TEMPLATE.md"),
    readText("docs/release-policy.md"),
    readText("docs/stream-verification.md"),
    readText("docs/ui-guide.md"),
  ].join("\n");
  for (const snippet of [
    "docs/ui-visual-release-baseline-approval-template.md",
    "accepted baseline run",
    "approved comparator",
    "not a public release asset",
    "candidate pass proof",
    "./server.sh verify-ui-release-baseline-approval-log",
  ]) {
    assert(docs.includes(snippet), `release baseline docs missing snippet: ${snippet}`);
  }
});

check("preflight runs release baseline approval log presence check", () => {
  const workflow = readText(".github/workflows/preflight.yml");
  for (const snippet of [
    "UI release baseline approval log presence",
    "./server.sh verify-ui-release-baseline-approval-log",
    "permissions:",
    "contents: read",
  ]) {
    assert(workflow.includes(snippet), `preflight missing release baseline approval log snippet: ${snippet}`);
  }
  assert(!workflow.includes("pull-requests: write"), "preflight must not open pull-requests: write for approval log presence check");
});

check("server entrypoint exposes release baseline approval log verifier", () => {
  const server = readText("server.sh");
  const inventory = readText("scripts/internal/verify_script_inventory.mjs");
  assert(server.includes("verify-ui-release-baseline-approval-log"), "server.sh is missing verify-ui-release-baseline-approval-log");
  assert(server.includes("verify_ui_release_baseline_approval_log.mjs"), "server.sh is missing verifier script reference");
  assert(inventory.includes("verify_ui_release_baseline_approval_log.mjs"), "script inventory is missing verify_ui_release_baseline_approval_log.mjs");
});

let failCount = 0;
for (const item of checks) {
  try {
    item.run();
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    failCount += 1;
    console.log(`[fail] ${item.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log("");
console.log("== UI release baseline approval log verification summary ==");
console.log(`- pass: ${checks.length - failCount}`);
console.log(`- fail: ${failCount}`);
if (failCount > 0) process.exit(1);

function check(name, run) {
  checks.push({ name, run });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
