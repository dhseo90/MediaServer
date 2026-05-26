#!/usr/bin/env node
// 파일 용도: GitHub Actions static/guardrail gate와 로컬 release 명령의 parity를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`CI/local gate parity verification

Usage:
  ./server.sh verify-ci-local-gate-parity

Checks:
  - Preflight static gates include the local release/static gate commands.
  - Licensing and Artifact Guardrails include source-only release guard commands.
  - RC Release Gate keeps longrun commands workflow_dispatch-only and artifact-backed.
  - Docs describe the CI/local matrix and the parity verifier.
  - A missing workflow command negative fixture fails.
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];
const workflowPaths = {
  preflight: ".github/workflows/preflight.yml",
  guardrails: ".github/workflows/licensing-artifact-guardrails.yml",
  rc: ".github/workflows/rc-release-gate.yml",
};

const expected = {
  preflight: [
    "verify-script-inventory",
    "verify-feature-inventory-coverage",
    "verify-actions-security",
    "verify-ci-local-gate-parity",
    "verify-code-comments",
    "verify-docs-links",
    "verify-docs-ui-assets",
    "verify-release-closeout-helper",
    "verify-ui-release-baseline-approval-log",
    "verify-ui-visual-artifact-index",
    "write-ui-visual-baseline-comment",
    "ui-visual-artifact-maintenance",
  ],
  guardrails: [
    "write-dependency-notice",
    "verify-public-repo-readiness",
    "dependency-snapshot",
    "verify-bundle-policy",
    "source-offer-checklist",
  ],
  rc: [
    "verify-predev",
    "verify-va-runtime-console-longrun",
    "rc-release-checklist",
    "rc-artifact-archive",
  ],
};

check("workflow command parity matrix is complete", () => {
  const workflows = readWorkflows();
  for (const [name, commands] of Object.entries(expected)) {
    const present = collectServerCommands(workflows[name]);
    const missing = commands.filter(command => !present.has(command));
    assert(missing.length === 0, `${name} workflow missing command(s): ${missing.join(", ")}`);
  }
});

check("preflight keeps shell/node syntax gates local and CI-visible", () => {
  const preflight = readText(workflowPaths.preflight);
  for (const snippet of [
    "bash -n server.sh scripts/internal/*.sh",
    "for file in scripts/internal/*.mjs; do",
    "node --check \"$file\"",
    "actions/checkout@v5",
    "actions/upload-artifact@v6",
  ]) {
    assert(preflight.includes(snippet), `preflight missing snippet: ${snippet}`);
  }
});

check("guardrail workflow publishes source-only release evidence", () => {
  const guardrails = readText(workflowPaths.guardrails);
  for (const snippet of [
    "media-server-licensing-artifact-guardrails",
    "/tmp/media_server_dependency_snapshot.md",
    "/tmp/media_server_bundle_policy.md",
    "/tmp/media_server_source_offer_checklist.md",
    "/tmp/media_server_public_repo_readiness.md",
  ]) {
    assert(guardrails.includes(snippet), `guardrails missing snippet: ${snippet}`);
  }
});

check("rc workflow keeps longrun gates explicit and artifact-backed", () => {
  const rc = readText(workflowPaths.rc);
  for (const snippet of [
    "workflow_dispatch",
    "run_predev_120",
    "run_va_runtime_120",
    "timeout-minutes: 300",
    "media-server-rc-gate",
    "retention-days: ${{ inputs.artifact_retention_days }}",
  ]) {
    assert(rc.includes(snippet), `rc workflow missing snippet: ${snippet}`);
  }
});

check("server and docs expose CI/local parity verifier", () => {
  const server = readText("server.sh");
  const inventory = readText("scripts/internal/verify_script_inventory.mjs");
  const docs = [
    readText("docs/stream-verification.md"),
    readText("docs/public-repo-final-review.md"),
    readText("docs/release-policy.md"),
    readText("docs/development-backlog.md"),
  ].join("\n");
  for (const snippet of [
    "verify-ci-local-gate-parity",
    "verify_ci_local_gate_parity.mjs",
  ]) {
    assert(server.includes(snippet), `server missing snippet: ${snippet}`);
  }
  assert(inventory.includes("verify_ci_local_gate_parity.mjs"), "script inventory missing parity verifier script");
  for (const snippet of [
    "media-server.ci-local-gate-parity.v1",
    "CI/local gate parity",
    "Preflight/static-gates/guardrails",
    "./server.sh verify-ci-local-gate-parity",
  ]) {
    assert(docs.includes(snippet), `docs missing snippet: ${snippet}`);
  }
});

check("negative missing workflow command fixture fails", () => {
  const preflight = readText(workflowPaths.preflight).replace("./server.sh verify-actions-security", "# removed verify-actions-security");
  const present = collectServerCommands(preflight);
  const missing = expected.preflight.filter(command => !present.has(command));
  assert(missing.includes("verify-actions-security"), "negative fixture must report missing verify-actions-security");
});

let pass = 0;
let fail = 0;
const failures = [];
for (const item of checks) {
  try {
    item.fn();
    pass += 1;
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    fail += 1;
    const message = error instanceof Error ? error.message : String(error);
    failures.push(`[${item.name}] ${message}`);
    console.log(`[fail] ${item.name}: ${message}`);
  }
}

console.log("");
console.log("== CI/local gate parity summary ==");
console.log("- schema: media-server.ci-local-gate-parity.v1");
console.log(`- preflightCommands: ${expected.preflight.length}`);
console.log(`- guardrailCommands: ${expected.guardrails.length}`);
console.log(`- rcCommands: ${expected.rc.length}`);
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
if (failures.length > 0) {
  console.log("- failures:");
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}

function readWorkflows() {
  return Object.fromEntries(Object.entries(workflowPaths).map(([name, file]) => [name, readText(file)]));
}

function collectServerCommands(text) {
  const commands = new Set();
  const regex = /\.\/server\.sh\s+([A-Za-z0-9_-]+)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    commands.add(match[1]);
  }
  return commands;
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
