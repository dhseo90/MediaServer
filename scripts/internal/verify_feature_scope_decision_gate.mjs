#!/usr/bin/env node
// 파일 용도: v1.8.0 안정화 범위에서 새 기능 후보를 구현으로 승격하지 않는 decision gate를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`Feature scope decision gate verification

Usage:
  ./server.sh verify-feature-scope-gate

Checks:
  - v1.8.0 roadmap이 새 제품 기능 구현을 비범위로 유지하는지 확인
  - 기능 후보 상태와 owner approval gate가 문서화됐는지 확인
  - schema/auth/media path 영향 검토가 decision record 필수 필드인지 확인
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];

check("v1.8.0 roadmap keeps feature candidates out of hardening scope", () => {
  const backlog = readText("docs/development-backlog.md");
  for (const snippet of [
    "## 활성 차기 로드맵: v1.8.0 Release Trust Hardening",
    "새 제품 기능 확장이 아니라",
    "v1.8.0 비범위:",
    "새 제품 기능 구현 착수",
    "v1.8.0 Feature Scope Decision Gate",
    "v1.8.0 P0/P1 release trust gate가 모두 닫히기 전에는 새 기능 후보를 구현으로",
    "release trust gate를 위한 verifier, 문서",
    "screenshot capture, manual evidence, UI copy/layout 보정뿐입니다.",
  ]) {
    assert(backlog.includes(snippet), `development backlog missing scope gate snippet: ${snippet}`);
  }
});

check("decision statuses and approval fields are explicit", () => {
  const backlog = readText("docs/development-backlog.md");
  for (const snippet of [
    "`candidate-only`",
    "`approved-next-roadmap`",
    "`deferred-non-scope`",
    "owner approval",
    "not approved",
    "contract impact",
    "roadmap review, non-scope review, `./server.sh verify-feature-scope-gate`",
  ]) {
    assert(backlog.includes(snippet), `development backlog missing decision record snippet: ${snippet}`);
  }
});

check("contract invariants remain listed before feature promotion", () => {
  const backlog = readText("docs/development-backlog.md");
  for (const snippet of [
    "WebRTC DataChannel",
    "Event POST",
    "SSE/WS metadata schema",
    "auth/session contract",
    "RTSP/WebRTC media path",
  ]) {
    assert(backlog.includes(snippet), `development backlog missing invariant snippet: ${snippet}`);
  }
});

check("release evidence index links the feature scope gate", () => {
  const evidence = readText("docs/release-evidence-index.md");
  const server = readText("server.sh");
  const inventory = readText("scripts/internal/verify_script_inventory.mjs");
  assert(evidence.includes("Feature scope decision gate"), "release evidence index missing feature scope row");
  assert(evidence.includes("./server.sh verify-feature-scope-gate"), "release evidence index missing feature scope verifier command");
  assert(server.includes("verify-feature-scope-gate"), "server.sh is missing verify-feature-scope-gate");
  assert(server.includes("verify_feature_scope_decision_gate.mjs"), "server.sh is missing feature scope verifier script reference");
  assert(inventory.includes("verify_feature_scope_decision_gate.mjs"), "script inventory is missing feature scope verifier");
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
console.log("== Feature scope decision gate verification summary ==");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}
