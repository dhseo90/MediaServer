#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const checks = [];

const rcPredevCommand = "./server.sh verify-predev --soak-minutes 120";
const rcRuntimeCommand = "./server.sh verify-va-runtime-console-longrun --duration-minutes 120";

check("stream verification guide defines the RC-only release gate", () => {
  const docs = readText("docs/stream-verification.md");
  const requiredSnippets = [
    "### RC 전용 Release Gate",
    "상시 실행하지 않습니다",
    "release candidate",
    rcPredevCommand,
    rcRuntimeCommand,
    "--include-sidechannel",
    "--include-dashboard",
    "--include-rtsp",
    "--idle-after-cleanup-minutes 30",
    "./server.sh rc-release-checklist",
  ];
  for (const snippet of requiredSnippets) {
    assert(docs.includes(snippet), `docs/stream-verification.md is missing RC gate snippet: ${snippet}`);
  }
});

check("default smoke scripts do not call RC-only longrun commands", () => {
  const testAll = readText("scripts/internal/test_all.sh");
  const forbidden = [
    "verify-predev --soak-minutes 120",
    "verify-va-runtime-console-longrun --duration-minutes 120",
    "verify-va-runtime-console-longrun",
    "verify-va-runtime-console-cycles",
  ];
  for (const snippet of forbidden) {
    assert(!testAll.includes(snippet), `test_all.sh must not call RC-only command: ${snippet}`);
  }
});

check("server exposes RC gate verification without running the longrun", () => {
  const server = readText("server.sh");
  assert(server.includes("verify-rc-release-gate"), "server.sh is missing verify-rc-release-gate command");
  assert(server.includes("verify_rc_release_gate.mjs"), "server.sh does not dispatch verify_rc_release_gate.mjs");
  assert(server.includes("rc-release-checklist"), "server.sh is missing rc-release-checklist command");
  assert(server.includes("write_rc_release_checklist.mjs"), "server.sh does not dispatch write_rc_release_checklist.mjs");
});

check("release checklist generator writes Markdown and HTML", () => {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "media-server-rc-checklist-"));
  const predevSummary = path.join(workDir, "predev-summary.json");
  const runtimeSummary = path.join(workDir, "runtime-summary.json");
  const predevReport = path.join(workDir, "predev-report.md");
  const runtimeReport = path.join(workDir, "runtime-report.md");
  const output = path.join(workDir, "release-checklist.md");
  const htmlOutput = path.join(workDir, "release-checklist.html");
  fs.writeFileSync(predevSummary, JSON.stringify({ status: "pass", passCount: 69, failCount: 0 }), "utf8");
  fs.writeFileSync(runtimeSummary, JSON.stringify({ ok: true, passCount: 12, failCount: 0 }), "utf8");
  fs.writeFileSync(predevReport, "# predev\n", "utf8");
  fs.writeFileSync(runtimeReport, "# runtime\n", "utf8");
  execFileSync(process.execPath, [
    path.join(rootDir, "scripts/internal/write_rc_release_checklist.mjs"),
    "--predev-summary", predevSummary,
    "--predev-report", predevReport,
    "--runtime-summary", runtimeSummary,
    "--runtime-report", runtimeReport,
    "--output", output,
    "--html-output", htmlOutput,
  ], { cwd: rootDir, stdio: "pipe" });
  const markdown = fs.readFileSync(output, "utf8");
  const html = fs.readFileSync(htmlOutput, "utf8");
  assert(markdown.includes("# RC Release Checklist"), "release checklist missing title");
  assert(markdown.includes("overall: PASS"), "release checklist missing PASS status");
  assert(markdown.includes("Predev 120m soak"), "release checklist missing predev row");
  assert(markdown.includes("VA runtime console 120m longrun"), "release checklist missing runtime row");
  assert(html.includes("RC Release Checklist"), "release checklist HTML missing title");
});

check("backlog keeps 120 minute soak as release-candidate or high-risk gate", () => {
  const backlog = readText("docs/development-backlog.md");
  const requiredSnippets = [
    "`./server.sh verify-predev --soak-minutes 120`은 상시 실행하지 않고 release candidate 또는 고위험 변경 gate로만 실행합니다.",
    "./server.sh verify-va-runtime-console-longrun --duration-minutes 120",
  ];
  for (const snippet of requiredSnippets) {
    assert(backlog.includes(snippet), `docs/development-backlog.md is missing RC gate snippet: ${snippet}`);
  }
});

let failCount = 0;
for (const item of checks) {
  try {
    item.run();
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    failCount += 1;
    const message = error instanceof Error ? error.message : String(error);
    console.log(`[fail] ${item.name}: ${message}`);
  }
}

console.log("");
console.log("== RC release gate verification summary ==");
console.log(`- pass: ${checks.length - failCount}`);
console.log(`- fail: ${failCount}`);

if (failCount > 0) {
  process.exit(1);
}

function check(name, run) {
  checks.push({ name, run });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}
