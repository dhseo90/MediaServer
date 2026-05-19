#!/usr/bin/env node
// 파일 용도: v1.5.0 follow-up closure가 범위 안 후속 이슈를 모두 닫고 별도 Phase gate를 과장하지 않는지 검증한다.
// 동작 요약: closure 문서, v1.5.0 verifier 연결, roadmap/docs index/stream verification 경계를 정적으로 확인한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v1.5.0 follow-up closure verification

Usage:
  ./server.sh verify-v150-follow-up-closure

Checks:
  - docs/v1.5.0-follow-up-closure.md가 v1.5.0 roadmap 항목 7개를 분류함
  - v1.5.0 범위 안 개발 가능한 후속 이슈가 남지 않았음을 명시함
  - default-on, model/runtime bundle, OC-SORT runtime 승격, raw evidence 보존을 완료로 과장하지 않음
  - roadmap, README/docs index, stream verification, server.sh, script inventory가 closure verifier를 연결함
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const closure = readText("docs/v1.5.0-follow-up-closure.md");
const backlog = readText("docs/development-backlog.md");
const stream = readText("docs/stream-verification.md");
const readme = readText("README.md");
const readmeEn = readText("README.en.md");
const docsIndex = readText("docs/en/README.md");
const server = readText("server.sh");
const inventory = readText("scripts/internal/verify_script_inventory.mjs");

const verifierCommands = [
  "verify-v150-opt-in-tracking-policy",
  "verify-v150-tracker-reid-stability-matrix",
  "verify-v150-reid-provenance-fallback-approval",
  "verify-v150-ops-tracker-warning-next-action",
  "verify-v150-audit-export-review-hardening",
  "verify-v150-field-smoke-summary-evidence-boundary",
  "verify-v150-oc-sort-experimental-sandbox",
];

const verifierScripts = [
  "verify_v150_opt_in_tracking_policy_guard.mjs",
  "verify_v150_tracker_reid_stability_matrix.mjs",
  "verify_v150_reid_provenance_fallback_approval.mjs",
  "verify_v150_ops_tracker_warning_next_action.mjs",
  "verify_v150_audit_export_review_hardening.mjs",
  "verify_v150_field_smoke_summary_evidence_boundary.mjs",
  "verify_v150_oc_sort_experimental_sandbox.mjs",
];

const checks = [];

check("closure doc classifies all v1.5.0 roadmap follow-up items", () => {
  for (const snippet of [
    "# v1.5.0 Follow-up Closure",
    "Explicit opt-in tracker/Re-ID policy guard",
    "Tracker/Re-ID stability matrix",
    "Re-ID opt-in model provenance and fallback approval",
    "Ops Dashboard tracker warning next-action refinement",
    "Audit export review hardening",
    "Field smoke summary evidence boundary",
    "OC-SORT experimental sandbox",
    "v1.5.0 로드맵 안의 개발 가능한 후속 이슈: 없음",
  ]) {
    assertIncludes(closure, snippet, "v1.5 closure doc");
  }
});

check("closure doc does not overclaim deferred gates", () => {
  for (const snippet of [
    "제품 default tracker/Re-ID 변경",
    "global/default-on",
    "실제 Re-ID model/runtime bundle",
    "OC-SORT runtime tracker 승격",
    "별도 Phase gate",
    "장시간 soak, `verify-predev`, push, tag, GitHub Release는 명시 요청 없이는",
    "미확인 항목을 통과로 쓰지 않습니다",
  ]) {
    assertIncludes(closure, snippet, "v1.5 closure boundary");
  }
  for (const forbidden of [
    "default-on 완료",
    "Re-ID model bundle 완료",
    "OC-SORT runtime tracker 완료",
    "고객 영상 보존 완료",
    "실장비 ONVIF field smoke 성공",
    "verify-predev: 통과",
    "푸시 완료",
    "GitHub Release 생성 완료",
  ]) {
    assert(!closure.includes(forbidden), `closure doc must not overclaim: ${forbidden}`);
  }
});

check("all v1.5.0 verifier commands remain linked", () => {
  for (const command of verifierCommands) {
    assertIncludes(closure, command, "v1.5 closure verification block");
    assertIncludes(stream, command, "stream verification");
    assertIncludes(server, command, "server.sh");
  }
  for (const script of verifierScripts) {
    assertIncludes(server, script, "server.sh");
    assertIncludes(inventory, script, "script inventory");
    assert(fs.existsSync(path.join(rootDir, "scripts/internal", script)), `missing verifier script: ${script}`);
  }
});

check("roadmap and docs index link v1.5 follow-up closure", () => {
  for (const [label, text] of [
    ["development backlog", backlog],
    ["stream verification", stream],
    ["README.md", readme],
    ["README.en.md", readmeEn],
    ["docs/en README", docsIndex],
  ]) {
    assertIncludes(text, "v1.5.0-follow-up-closure.md", label);
  }
  assertIncludes(server, "verify-v150-follow-up-closure", "server.sh");
  assertIncludes(server, "verify_v150_follow_up_closure.mjs", "server.sh");
  assertIncludes(inventory, "verify_v150_follow_up_closure.mjs", "script inventory");
});

check("roadmap keeps later phase candidates outside v1.5 closure", () => {
  for (const snippet of [
    "field sample history review workflow",
    "tracker experimental benchmark harness",
    "actual OC-SORT algorithm adapter and dataset benchmark report",
    "runtime/model bundle RC policy",
    "release evidence dashboard cleanup",
  ]) {
    assertIncludes(backlog, snippet, "development backlog phase candidates");
    assertIncludes(closure, snippet, "v1.5 closure phase candidates");
  }
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
console.log("== v1.5.0 follow-up closure summary ==");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
console.log("- in-scope development follow-ups: 0");
if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assertIncludes(text, snippet, label) {
  assert(text.includes(snippet), `${label} missing required wording: ${snippet}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
