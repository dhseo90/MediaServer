#!/usr/bin/env node
// 파일 용도: v2.9.0 S08 final stabilization run 문서/기록/게이트 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v2.9.0 S08 final stabilization run verification

Usage:
  ./server.sh verify-v290-final-stabilization-run

Checks:
  - roadmap, stream verification, feature inventory가 V290-S08 final stabilization run을 같은 command로 가리키는지 확인
  - release test records가 build/auth/Ops-Client UI/rule/event/metadata/media/schema/docs/inventory gate 실행 결과를 기록했는지 확인
  - UI 풀테스트, 30분/120분 longrun, published metadata, external field smoke가 S08 local gate PASS로 승격되지 않았는지 확인
  - server.sh와 feature inventory coverage가 S08 verifier를 노출하는지 확인
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];
const backlog = readText("docs/development-backlog.md");
const streamVerification = readText("docs/stream-verification.md");
const featureInventory = readText("docs/project-feature-test-inventory.md");
const releaseRecords = readText("docs/release-test-records.md");
const releaseEvidenceIndex = readText("docs/release-evidence-index.md");
const coverageVerifier = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
const projectInventoryVerifier = readText("scripts/internal/verify_project_feature_test_inventory.mjs");
const serverSh = readText("server.sh");
const normalizedRecords = normalizeWhitespace(releaseRecords);

const stabilizationCommands = [
  "./server.sh build",
  "./server.sh verify-auth-bootstrap",
  "./server.sh verify-auth-users",
  "./server.sh verify-auth-routes",
  "./server.sh verify-ops-client-ui",
  "./server.sh verify-rule-ui",
  "./server.sh verify-event-post",
  "./server.sh verify-va-metadata-sidechannel",
  "./server.sh verify-ws-metadata",
  "./server.sh verify-codecs",
  "./server.sh verify-webrtc-ice",
  "./server.sh verify-rtsp-va-overlay-policy",
  "./server.sh verify-integrator-contract-artifact",
  "./server.sh verify-release-metadata",
  "./server.sh verify-docs-links",
  "./server.sh verify-docs-ui-assets",
  "./server.sh verify-project-inventory",
  "./server.sh verify-feature-inventory-coverage",
  "./server.sh verify-script-inventory",
  "./server.sh verify-v290-final-stabilization-run",
];

check("roadmap and stream verification expose V290-S08 final stabilization run", () => {
  for (const snippet of [
    "| 8 | V290-S08 | P0 | 완료 | final stabilization |",
    "build, auth, Ops/Client UI, rule, event, metadata, media/schema, docs/inventory gate를 release 순서대로 실행",
    "`./server.sh verify-v290-final-stabilization-run`",
    "## v2.9.0 S08 개발 기록",
  ]) {
    assert(backlog.includes(snippet), `backlog missing S08 snippet: ${snippet}`);
  }
  for (const snippet of [
    "| V290-S08 | `./server.sh verify-v290-final-stabilization-run` |",
    "build/auth/Ops-Client UI/rule/event/metadata/media-schema/docs-inventory final stabilization run",
    "30분/120분/UI 풀테스트/published metadata 실행 evidence를 대체하지 않음",
  ]) {
    assert(streamVerification.includes(snippet), `stream verification missing S08 snippet: ${snippet}`);
  }
});

check("feature inventory maps V290-S08 to OPS-049 and SAFE-079", () => {
  assertSummaryCountAtLeast("전체 기능 항목", 515);
  assertSummaryCountAtLeast("기능 ID 목록", 515);
  assertRangeCovers("SAFE", 79);
  assertRangeCovers("OPS", 49);
  for (const snippet of [
    "V290-S08 final stabilization run | `OPS-049`, `SAFE-079` | `verify-v290-final-stabilization-run`",
    "SAFE-079 | V290-S08 final stabilization run boundary",
    "OPS-049 | V290-S08 final stabilization run 게이트",
  ]) {
    assert(featureInventory.includes(snippet), `feature inventory missing S08 snippet: ${snippet}`);
  }
  assert(coverageVerifier.includes("verify-v290-final-stabilization-run"), "feature coverage missing V290-S08 verifier");
  assert(projectInventoryVerifier.includes('"OPS-049"'), "project inventory verifier missing OPS-049");
  assert(projectInventoryVerifier.includes('"SAFE-079"'), "project inventory verifier missing SAFE-079");
  assert(projectInventoryVerifierRangeCovers("SAFE", 79), "project inventory verifier SAFE range below 079");
  assert(projectInventoryVerifierRangeCovers("OPS", 49), "project inventory verifier OPS range below 049");
});

check("release records include S08 item, RED precheck, and executed stabilization commands", () => {
  for (const snippet of [
    "V290 final stabilization run",
    "최초 `./server.sh verify-v290-final-stabilization-run`는 command 미구현으로 fail",
    "v290 S08 final stabilization run",
    "v290 S08 auth bootstrap",
    "v290 S08 auth users",
    "v290 S08 auth routes",
    "v290 S08 ops/client UI",
    "v290 S08 rule UI",
    "v290 S08 event POST",
    "v290 S08 SSE metadata",
    "v290 S08 WS metadata",
    "v290 S08 codec/media matrix",
    "v290 S08 WebRTC ICE",
    "v290 S08 RTSP VA overlay policy",
    "v290 S08 integrator contract artifact",
    "v290 S08 docs/inventory gates",
  ]) {
    assert(normalizedRecords.includes(normalizeWhitespace(snippet)), `release records missing S08 snippet: ${snippet}`);
  }
  for (const command of stabilizationCommands) {
    assert(releaseRecords.includes(command), `release records missing S08 command: ${command}`);
  }
});

check("S08 not-run boundaries remain separate from PASS rows", () => {
  for (const snippet of [
    "v290 S08 UI 풀테스트",
    "v290 S08 30분/120분 longrun",
    "v290 S08 published metadata",
    "v290 S08 field smoke",
    "S08 final stabilization PASS로 대체하지 않음",
  ]) {
    assert(normalizedRecords.includes(normalizeWhitespace(snippet)), `release records missing S08 not-run boundary: ${snippet}`);
  }
  for (const snippet of [
    "S08 final stabilization run",
    "local script stability gate",
    "UI 풀테스트/30분/120분/published metadata 실행 evidence가 아닙니다.",
  ]) {
    assert(releaseEvidenceIndex.includes(snippet), `release evidence index missing S08 boundary: ${snippet}`);
  }
});

check("server exposes S08 final stabilization command", () => {
  for (const snippet of [
    "verify-v290-final-stabilization-run",
    "verify_v290_final_stabilization_run.mjs",
  ]) {
    assert(serverSh.includes(snippet), `server.sh missing S08 command snippet: ${snippet}`);
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
console.log("== v2.9.0 final stabilization run summary ==");
console.log("- schema: media-server.v290-final-stabilization-run.v1");
console.log("- scope: build, auth, Ops/Client UI, rule, event, metadata, media/schema, docs/inventory");
console.log("- uiFulltest: not-run-by-this-command");
console.log("- longrun30m120m: not-run-by-this-command");
console.log("- publishedMetadata: not-run-by-this-command");
console.log(`- pass: ${pass}`);
console.log(`- fail: ${fail}`);
if (fail > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, " ");
}

function assertSummaryCountAtLeast(label, minimum) {
  const pattern = new RegExp(`\\| ${escapeRegExp(label)} \\| ([0-9]+)`);
  const match = featureInventory.match(pattern);
  assert(match, `feature inventory missing summary count: ${label}`);
  const count = Number.parseInt(match[1], 10);
  assert(count >= minimum, `feature inventory ${label} ${count} below ${minimum}`);
}

function assertRangeCovers(prefix, minimum) {
  const pattern = new RegExp(`\`${prefix}-[0-9]{3}\`~\`${prefix}-([0-9]{3})\``, "g");
  const matches = [...featureInventory.matchAll(pattern)];
  assert(matches.length > 0, `feature inventory missing ${prefix} range`);
  const max = Math.max(...matches.map((match) => Number.parseInt(match[1], 10)));
  assert(max >= minimum, `feature inventory ${prefix} range ${max} below ${minimum}`);
}

function projectInventoryVerifierRangeCovers(prefix, minimum) {
  const pattern = new RegExp(`\`${prefix}-[0-9]{3}\`~\`${prefix}-([0-9]{3})\``, "g");
  const matches = [...projectInventoryVerifier.matchAll(pattern)];
  if (matches.length === 0) return false;
  const max = Math.max(...matches.map((match) => Number.parseInt(match[1], 10)));
  return max >= minimum;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
