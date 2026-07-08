#!/usr/bin/env node
// 파일 용도: v3.9.0 Step 19 구조 안정화 이관 계획과 오버클레임 방지 경계를 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v3.9.0 Step 19 structure stabilization handoff verification

Usage:
  ./server.sh verify-v390-structure-stabilization-handoff

Checks:
  - V390-STRUCT-001..005 are handed off to a behavior-preserving stabilization plan
  - roadmap, stream verification, project inventory, release evidence, and release records all point to the same handoff gate
  - the handoff does not claim route/API/UI/schema/media behavior has been refactored yet
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const command = "verify-v390-structure-stabilization-handoff";
const targetScript = "verify_v390_structure_stabilization_handoff.mjs";
const schema = "media-server.v390-structure-stabilization-handoff.v1";
const planPath = "docs/superpowers/plans/2026-07-08-v390-structure-stabilization-handoff.md";

const files = {
  plan: readText(planPath),
  backlog: readText("docs/development-backlog.md"),
  v390Inventory: readText("docs/v390-feature-completion-inventory.md"),
  streamVerification: readText("docs/stream-verification.md"),
  projectInventory: readText("docs/project-feature-test-inventory.md"),
  releaseRecords: readText("docs/release-test-records.md"),
  releaseEvidence: readText("docs/release-evidence-index.md"),
  scriptInventory: readText("scripts/internal/verify_script_inventory.mjs"),
  coverageVerifier: readText("scripts/internal/verify_feature_inventory_coverage.mjs"),
  projectInventoryVerifier: readText("scripts/internal/verify_project_feature_test_inventory.mjs"),
  serverSh: readText("server.sh"),
};

const checks = [];
const normalizedRecords = normalizeWhitespace(files.releaseRecords);

check("handoff plan covers each structure target and keeps behavior unchanged", () => {
  for (const snippet of [
    "# v3.9.0 Structure Stabilization Handoff Implementation Plan",
    "Goal:",
    "Architecture:",
    "Tech Stack:",
    "V390-STRUCT-001",
    "V390-STRUCT-002",
    "V390-STRUCT-003",
    "V390-STRUCT-004",
    "V390-STRUCT-005",
    "behavior-preserving",
    "do not change Event POST payload, WebRTC DataChannel, SSE/WS metadata, RTSP/WebRTC media path, Auth/Role/Scope, SourceRegistry/PublishedView, or Rule/Profile payload contracts",
    "UI 풀테스트 직접 조작, 30분/120분 longrun, published metadata, PR/main/tag/GitHub Release evidence가 아닙니다",
    "Task 1: Route/API Ownership Extraction Map",
    "Task 2: Product UI Workspace Split Map",
    "Task 3: Source Registry Read-model Boundary Map",
    "Task 4: Manual UI Result Template Archive Plan",
    "Task 5: VLM Contract Index Consolidation Plan",
  ]) {
    assertIncludes(files.plan, snippet, "structure handoff plan");
  }
});

check("v390 inventory records handoff-ready status without claiming refactor completion", () => {
  for (const snippet of [
    "## Structure Stabilization Handoff Output",
    "Structure handoff status: `handoff-planned-with-evidence`",
    "Handoff plan: `docs/superpowers/plans/2026-07-08-v390-structure-stabilization-handoff.md`",
    "Verifier: `./server.sh verify-v390-structure-stabilization-handoff`",
    "Structure implementation status: `not-run-by-this-step`",
    "Do not treat this handoff as route/API/UI extraction completion",
  ]) {
    assertIncludes(files.v390Inventory, snippet, "v390 structure handoff output");
  }
  for (const id of ["V390-STRUCT-001", "V390-STRUCT-002", "V390-STRUCT-003", "V390-STRUCT-004", "V390-STRUCT-005"]) {
    assertIncludes(files.v390Inventory, id, `v390 inventory ${id}`);
  }
});

check("roadmap and stream verification expose Step 19 as completed handoff planning", () => {
  for (const snippet of [
    "| 19 | v3.9.0 (19) structure stabilization handoff 상세계획 | P0 | 완료 |",
    "V390-STRUCT-001`~`V390-STRUCT-005`를 `docs/superpowers/plans/2026-07-08-v390-structure-stabilization-handoff.md`로 이관",
    "## v3.9.0 Structure & Release 개발 기록",
    "Step 19 `structure stabilization handoff 상세계획`",
    "`./server.sh verify-v390-structure-stabilization-handoff`",
  ]) {
    assertIncludes(files.backlog, snippet, "backlog Step 19");
  }
  for (const snippet of [
    "| v3.9.0 (19) | `./server.sh verify-v390-structure-stabilization-handoff` |",
    "v3.9.0 structure stabilization handoff",
    "behavior-preserving extraction plan",
    "route/API/UI extraction implementation, UI 풀테스트, 30분/120분, published metadata evidence를 대체하지 않음",
  ]) {
    assertIncludes(files.streamVerification, snippet, "stream verification Step 19");
  }
});

check("project inventory maps Step 19 to SAFE-211 and OPS-178", () => {
  for (const snippet of [
    "v3.9.0 (19) structure stabilization handoff 상세계획 | `SAFE-211`, `OPS-178` | `verify-v390-structure-stabilization-handoff`",
    "| SAFE-211 | V390 Step 19 structure handoff no-behavior-change boundary |",
    "| OPS-178 | V390 Step 19 Structure Stabilization Handoff 게이트 |",
  ]) {
    assertIncludes(files.projectInventory, snippet, "project inventory Step 19");
  }
  assertIncludes(files.coverageVerifier, command, "feature coverage verifier Step 19");
  assertIncludes(files.projectInventoryVerifier, '"SAFE-211"', "project inventory verifier SAFE-211");
  assertIncludes(files.projectInventoryVerifier, '"OPS-178"', "project inventory verifier OPS-178");
});

check("release records and evidence index track Step 19 handoff and not-run boundaries", () => {
  for (const snippet of [
    "V390 Structure Stabilization Handoff",
    "v390 Step 19 RED structure stabilization handoff gate",
    "v390 Step 19 structure stabilization handoff final",
    "v3.9.0 Structure Stabilization Handoff",
    command,
    "SAFE-211",
    "OPS-178",
  ]) {
    assertIncludes(files.releaseRecords + "\n" + files.releaseEvidence, snippet, "release records/evidence Step 19");
  }
  for (const snippet of [
    "v390 구조 안정화 구현",
    "Step 19 계획 완료는 실제 route/API/UI extraction 구현 PASS가 아님",
    "UI 풀테스트 직접 조작, 30분/120분 longrun, published metadata, release action evidence로 사용할 수 없음",
  ]) {
    assert(normalizedRecords.includes(normalizeWhitespace(snippet)), `release records missing Step 19 boundary: ${snippet}`);
  }
});

check("server dispatch and script inventory expose Step 19 command", () => {
  assertIncludes(files.serverSh, command, "server.sh Step 19 dispatch");
  assertIncludes(files.serverSh, targetScript, "server.sh Step 19 dispatch");
  assertIncludes(files.scriptInventory, targetScript, "script inventory Step 19");
});

const results = runChecks();
console.log("");
console.log("== v3.9.0 structure stabilization handoff summary ==");
console.log(`- schema: ${schema}`);
console.log(`- command: ${command}`);
console.log(`- plan: ${planPath}`);
console.log("- structureImplementation: not-run-by-this-command");
console.log("- uiFulltest: not-run-by-this-command");
console.log("- longrun30m120m: not-run-by-this-command");
console.log("- publishedMetadata: not-run-by-this-command");
console.log("- releaseActions: not-run-by-this-command");
console.log(`- pass: ${results.pass}`);
console.log(`- fail: ${results.fail}`);
if (results.fail > 0) process.exit(1);

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

function assertIncludes(text, snippet, context) {
  assert(text.includes(snippet), `${context} missing snippet: ${snippet}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, " ");
}
