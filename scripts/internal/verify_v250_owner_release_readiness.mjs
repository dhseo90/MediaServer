#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v2.5.0 S09 owner decomposition/release readiness gate의 코드/문서 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v2.5.0 S09 owner decomposition/release readiness verification

Usage:
  ./server.sh verify-v250-owner-release-readiness

Checks:
  - event memory/search route owner catalog와 release-safe bundle route matcher가 분리됐는지 확인
  - S09 feature inventory, manual UI 기준, release policy/evidence가 같은 gate를 가리키는지 확인
  - server.sh가 S09 verifier를 노출하는지 확인
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];
const readinessCommands = [
  "verify-v250-owner-release-readiness",
  "verify-release-metadata",
  "verify-docs-links",
  "verify-docs-ui-assets",
  "verify-feature-inventory-coverage",
  "verify-manual-ui-evidence",
  "verify-release-evidence-index",
  "verify-release-closeout-helper --dry-run",
  "git diff --check",
];

check("event memory/search owner catalog is split from server routing", () => {
  const header = readText("include/ingress/ops_event_route_owner.h");
  const source = readText("src/ingress/ops_event_route_owner.cpp");
  const cmake = readText("CMakeLists.txt");
  const server = readWebRtcHttpServerBundle(readText);
  for (const snippet of [
    "enum class OpsIncidentMemoryRouteOwner",
    "struct OpsIncidentMemoryRouteReadiness",
    "IncidentMemoryRouteReadinessCatalog",
    "IsOpsIncidentMemoryReviewRoute",
    "IsLabEventEvidenceBundleTokenRoute",
    "IsLabEventEvidenceBundleDownloadRoute",
  ]) {
    assert(header.includes(snippet), `route owner header missing S09 symbol: ${snippet}`);
  }
  for (const snippet of [
    "V250-S09",
    "event memory/search route owner",
    "media-server.ops.incident-memory-search.v1",
    "media-server.ops.incident-timeline-graph.v1",
    "media-server.ops.explainable-incident-brief.v1",
    "media-server.ops.similar-incident-lookup.v1",
    "media-server.client.incident-digest.v1",
    "media-server.v250.redacted-incident-evidence-bundle.v1",
    "verify-v250-ops-events-semantic-search-ui",
    "verify-v250-incident-timeline-graph",
    "verify-v250-explainable-incident-brief",
    "verify-v250-similar-incident-lookup",
    "verify-v250-client-safe-incident-digest",
    "verify-v250-redacted-incident-evidence-bundle",
    "Event POST payload unchanged",
    "WebRTC DataChannel schema unchanged",
    "SSE/WS metadata schema unchanged",
    "RTSP/WebRTC media path unchanged",
  ]) {
    assert(source.includes(snippet), `route owner source missing S09 snippet: ${snippet}`);
  }
  assert(cmake.includes("src/ingress/ops_event_route_owner.cpp"), "CMake must compile ops_event_route_owner.cpp");
  for (const snippet of [
    "IsLabEventEvidenceBundleTokenRoute(request.method, request.path)",
    "IsLabEventEvidenceBundleDownloadRoute(request.method, request.path)",
  ]) {
    assert(server.includes(snippet), `server missing S09 route delegation: ${snippet}`);
  }
  for (const snippet of [
    'request.path == "/lab/analysis/events/evidence/bundle-token"',
    'request.path == "/lab/analysis/events/evidence/bundle"',
  ]) {
    assert(!server.includes(snippet), `server still owns release-safe bundle route comparison: ${snippet}`);
  }
});

check("feature inventory maps S09 readiness IDs and coverage", () => {
  const inventory = readText("docs/project-feature-test-inventory.md");
  const coverage = readText("scripts/internal/verify_feature_inventory_coverage.mjs");
  for (const snippet of [
    "| UI-044 | `/ops/events` Semantic Incident Memory UI 풀테스트 준비 기준 |",
    "| OPS-036 | V250-S09 incident memory route owner 분리 게이트 |",
    "| SAFE-051 | V250-S09 릴리즈 준비 경계 |",
    "verify-v250-owner-release-readiness",
    "close-out gate와 UI 풀테스트 기준 정리",
  ]) {
    assert(inventory.includes(snippet), `inventory missing S09 snippet: ${snippet}`);
  }
  assert(coverage.includes("verifierEvidenceRows === rows.length"),
    "feature coverage must validate verifier evidence for every inventory row");
});

check("manual UI criteria records v2.5.0 incident memory controls without claiming execution", () => {
  const fulltest = readText("docs/manual-ui-fulltest.md");
  const checklist = readText("docs/manual-ui-checklist.md");
  for (const text of [fulltest, checklist]) {
    for (const snippet of [
      "v2.5.0 Semantic Incident Memory UI 풀테스트 기준",
      "UI-039",
      "UI-040",
      "UI-041",
      "UI-042",
      "UI-043",
      "UI-044",
      "release-safe bundle",
      "UI 풀테스트 PASS로 쓰지 않습니다",
    ]) {
      assert(text.includes(snippet), `manual UI criteria missing S09 snippet: ${snippet}`);
    }
  }
});

check("release policy and evidence index record S09 readiness without promoting not-run gates", () => {
  const backlog = readText("docs/development-backlog.md");
  const policy = readText("docs/release-policy.md");
  const evidence = readText("docs/release-evidence-index.md");
  const WebRTCBoundaryObserved = [
    "WebRTC DataChannel schema unchanged",
    "SSE/WS metadata schema unchanged",
    "RTSP/WebRTC media path unchanged",
  ].every((snippet) => sourceBoundaryText().includes(snippet));
  const releaseActionsRemainNotRun = policy.includes("`verify-release-metadata --published` 미실행") &&
    policy.includes("UI 풀테스트 직접 조작 미실행") && policy.includes("30분 테스트 미실행") &&
    policy.includes("120분 테스트 미실행");
  const releaseBoundaryObserved = WebRTCBoundaryObserved && releaseActionsRemainNotRun;
  assert(releaseBoundaryObserved,
    "WebRTC/SSE/RTSP and manual release gates must remain independently bounded");
  assert(/\| V250-S09 \| 완료 \| Owner decomposition\/release readiness \|/.test(backlog),
    "backlog V250-S09 historical completion row missing");
  for (const snippet of readinessCommands) {
    assert(evidence.includes(snippet), `release evidence missing S09 command: ${snippet}`);
  }
  for (const snippet of [
    "UI 풀테스트 직접 조작 미실행",
    "30분 테스트 미실행",
    "120분 테스트 미실행",
    "`verify-release-metadata --published` 미실행",
  ]) {
    assert(policy.includes(snippet), `release policy missing S09 readiness snippet: ${snippet}`);
  }
  for (const snippet of [
    "v250-s09-owner-release-readiness-20260611",
    "media-server.v250-owner-release-readiness.v1",
    "v2.5.0 S09 소유권 분리 / 릴리즈 준비",
    "UI 풀테스트 직접 조작 미실행",
    "30분 테스트 미실행",
    "120분 테스트 미실행",
    "Not run for `v250-s09-owner-release-readiness-20260611`",
  ]) {
    assert(evidence.includes(snippet), `release evidence missing S09 readiness snippet: ${snippet}`);
  }
});

function sourceBoundaryText() {
  return readText("src/ingress/ops_event_route_owner.cpp");
}

check("server entrypoint exposes the S09 verifier", () => {
  const serverSh = readText("server.sh");
  assert(serverSh.includes("verify-v250-owner-release-readiness"),
    "server.sh missing verify-v250-owner-release-readiness");
  assert(serverSh.includes("verify_v250_owner_release_readiness.mjs"),
    "server.sh missing S09 verifier script dispatch");
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
console.log("== v2.5.0 S09 owner decomposition/release readiness summary ==");
console.log("- schema: media-server.v250-owner-release-readiness.v1");
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
