#!/usr/bin/env node
// 파일 용도: 현재 v1.8 기준 기능/UI/검증 inventory 문서가 실제 command/route 범위를 덮는지 점검한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Project feature/test inventory verification

Usage:
  ./server.sh verify-project-inventory

Checks:
  - docs/project-feature-test-inventory.md exists and is linked from docs/README.md
  - inventory lists required current sections, UI routes, closed routes, and comparison/gap states
  - every current server.sh command appears in the inventory
  - current-facing docs outside backlog/history do not mention old v1.1-v1.7 baselines
  - current command set has no version-specific verify-v*/verify_v* release verifier
`);
}

assertKnownOptions(rawArgs, ["help"]);

const checks = [];

const inventoryPath = path.join(rootDir, "docs/project-feature-test-inventory.md");
const inventory = readText(inventoryPath);
const docsIndex = readText(path.join(rootDir, "docs/README.md"));
const server = readText(path.join(rootDir, "server.sh"));

check("inventory document is indexed and scoped to current v1.8.0", () => {
  assert(docsIndex.includes("project-feature-test-inventory.md"), "docs index does not link project inventory");
  requireText(inventory, "현재 release 목표 `v1.8.0`", "inventory does not pin v1.8.0 release target");
  requireText(inventory, "인앱 브라우저에서 모든 기능을 직접 클릭하고", "inventory does not separate manual UI full-test evidence");
  requireText(inventory, "이 문서는 현재 제품 기준만 다룹니다", "inventory does not separate archive history");
});

check("inventory has required feature/UI/test/comparison sections", () => {
  for (const heading of [
    "## Code Feature Inventory",
    "## UI-Accessible Feature Inventory",
    "## Current Verification Inventory",
    "## Comparison Result",
    "## Current Gaps",
    "## Maintenance Rules",
  ]) {
    requireText(inventory, heading, `inventory missing section ${heading}`);
  }
});

check("inventory covers required product UI and closed routes", () => {
  for (const route of [
    "/",
    "/setup",
    "/login",
    "/password/change",
    "/invite/setup",
    "/client/request-access",
    "/ops/home",
    "/ops/dashboard",
    "/ops/sources",
    "/ops/rules",
    "/ops/users",
    "/ops/events",
    "/client/live",
    "/client/dashboard",
    "/lab",
    "/lab/rules",
    "/lab/import",
    "/webrtc/test",
  ]) {
    requireText(inventory, `\`${route}\``, `inventory missing route ${route}`);
  }

  for (const boundary of [
    "열리면 실패",
    "직접 제품 UI 없음",
    "제품 UI 없음",
    "UI 풀테스트 evidence는 별도 수행 필요",
    "이 문서 기준 미수행",
  ]) {
    requireText(inventory, boundary, `inventory missing boundary phrase: ${boundary}`);
  }
});

check("inventory covers current server.sh command set", () => {
  const commands = parseServerCommands();
  const missing = [];
  for (const command of commands) {
    if (!inventory.includes(`\`${command}\``)) {
      missing.push(command);
    }
  }
  assert(missing.length === 0, `inventory missing server.sh command(s):\n${missing.join("\n")}`);
});

check("inventory comparison reports code/UI/test mismatch classes", () => {
  for (const phrase of [
    "Code + UI + automated tests 있음",
    "Code + tests 있음, 제품 UI 없음",
    "Code + tests 있음, UI 노출 제한",
    "UI + tests 있음, 실제 full manual evidence 없음",
    "Tests 있음, 현재 제품 기능 아님",
    "Tests 있음, 환경/field gate",
  ]) {
    requireText(inventory, phrase, `inventory missing comparison class: ${phrase}`);
  }

  for (const gap of [
    "Manual UI full test evidence는 아직 없음",
    "모든 VA scenario가 실제 브라우저 UI에서 실제 이벤트 발생까지 확인됐다는 증거는",
    "실장비 ONVIF, 외부 WHEP/TURN, 장시간 soak",
    "Integrator role은 API/scope 중심",
  ]) {
    requireText(inventory, gap, `inventory missing explicit gap: ${gap}`);
  }
});

check("current command set excludes version-specific release verifiers", () => {
  const commands = parseServerCommands().filter(command => /^verify-v[0-9]/.test(command));
  assert(commands.length === 0, `version-specific verify-v command(s) remain:\n${commands.join("\n")}`);

  const versionScripts = fs
    .readdirSync(path.join(rootDir, "scripts/internal"))
    .filter(name => /^verify_v[0-9]/.test(name));
  assert(versionScripts.length === 0, `version-specific verify_v script(s) remain:\n${versionScripts.join("\n")}`);

  assert(!/verify-v[0-9]/.test(server), "server.sh still documents version-specific verify-v command");
  assert(!/verify_v[0-9]/.test(server), "server.sh still references version-specific verify_v script");
});

check("current-facing docs outside backlog/history do not carry old version baselines", () => {
  const offenders = [];
  for (const file of walk(path.join(rootDir, "docs"))) {
    const relative = path.relative(rootDir, file);
    if (!relative.endsWith(".md")) continue;
    if (relative === "docs/development-backlog.md") continue;
    if (relative.startsWith("docs/history/")) continue;
    const text = readText(file);
    const matches = [...text.matchAll(/v1\.(?:1|2|3|4|5|6|7)(?:\.0|\.1)?/g)].map(match => match[0]);
    if (matches.length > 0) {
      offenders.push(`${relative}: ${[...new Set(matches)].join(", ")}`);
    }
  }
  assert(offenders.length === 0, `old version baseline mention(s) remain outside archive:\n${offenders.join("\n")}`);
});

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

console.log("");
console.log("== Project feature/test inventory verification summary ==");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function requireText(text, needle, message) {
  assert(text.includes(needle), message);
}

function readText(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function parseServerCommands() {
  const commands = [];
  const regex = /^\s{2}([a-zA-Z0-9_.|-]+)\)/gm;
  let match;
  while ((match = regex.exec(server)) !== null) {
    for (const command of match[1].split("|")) {
      if (!commands.includes(command)) commands.push(command);
    }
  }
  return commands.filter(command => command !== "*");
}

function walk(dir) {
  const result = [];
  for (const name of fs.readdirSync(dir)) {
    const current = path.join(dir, name);
    const stat = fs.statSync(current);
    if (stat.isDirectory()) result.push(...walk(current));
    else result.push(current);
  }
  return result;
}
