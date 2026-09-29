#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v2.5.0 S09 owner decomposition/release readiness gate의 코드/문서 연결을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";
import {validateReleasePolicyDocumentation,validateReleaseCommandDispatch} from "./release_documentation_contract.mjs";
import {validateVerificationDocumentation, validateUiPolicyDocumentation} from "./documentation_contract_lib.mjs";
import {validatePolicy} from "./ui_fulltest_evidence_policy_v4_lib.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v2.5.0 S09 owner decomposition/release readiness verification

Usage:
  ./server.sh verify-v250-owner-release-readiness

Checks:
  - event memory/search route owner catalog와 release-safe bundle route matcher가 분리됐는지 확인
  - S09 feature inventory, manual UI 기준, 현행 release policy가 같은 gate를 가리키는지 확인
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
  const inventory=readText("docs/project-feature-test-inventory.md");
  const implementation=JSON.parse(readText("test/fixtures/project_feature_implementation_evidence.json"));
  for(const id of ["UI-044","OPS-036","SAFE-051"]){
    const rows=inventory.split(/\r?\n/).filter(row=>row.split("|")[1]?.trim()===id);
    const entries=implementation.items.filter(item=>item.id===id);
    const command=id==="UI-044"?"verify-v250-ops-events-semantic-search-ui":"verify-v250-owner-release-readiness";
    assert(rows.length===1 && entries.length===1 && entries[0].verifierEvidence?.command===command,
      "현행 기능 정의/명령 결속 누락·중복·불일치: "+id);
    const errors=validateReleaseCommandDispatch(readText("server.sh"),[command]);
    assert(errors.length===0,id+": "+errors.join("; "));
  }
  assert(readText("scripts/internal/verify_feature_inventory_coverage.mjs").includes("verifierEvidenceRows === rows.length"),
    "feature coverage must validate verifier evidence for every inventory row");
});

check("manual UI criteria records v2.5.0 incident memory controls without claiming execution", () => {
  const fulltest = readText("docs/manual-ui-fulltest.md");
  const checklist = readText("docs/manual-ui-checklist.md");
  for (const text of [fulltest, checklist]) {
    for (const snippet of [
      "UI-039",
      "UI-040",
      "UI-041",
      "UI-042",
      "UI-043",
      "UI-044",
      "release-safe bundle",
    ]) {
      assert(text.includes(snippet), `manual UI criteria missing S09 snippet: ${snippet}`);
    }
  }
});

check("현행 릴리즈 정책과 제품 경계가 독립적으로 유지됨", () => {
  const WebRTCBoundaryObserved = [
    "WebRTC DataChannel schema unchanged",
    "SSE/WS metadata schema unchanged",
    "RTSP/WebRTC media path unchanged",
  ].every(snippet=>sourceBoundaryText().includes(snippet));
  const errors=validateReleasePolicyDocumentation({policy:readText("docs/release-policy.md"),
    versioning:readText("docs/versioning-policy.md"),version:readText("VERSION").trim()});
  const agents=readText("AGENTS.md"), verification=readText("docs/stream-verification.md");
  const policy=JSON.parse(readText("test/fixtures/ui_fulltest_evidence_policy_v4.json"));
  errors.push(...validateVerificationDocumentation({agents,verification}),...validatePolicy(policy),
    ...validateUiPolicyDocumentation({agents,fulltest:readText("docs/manual-ui-fulltest.md"),policy}));
  assert(errors.length===0,errors.join("; "));
  const dispatchErrors=validateReleaseCommandDispatch(readText("server.sh"),readinessCommands);
  assert(dispatchErrors.length===0,dispatchErrors.join("; "));
  for(const command of readinessCommands){
    assert(verification.includes(command),"검증 정의 명령 누락: "+command);
  }
  const releaseActionsRemainNotRun = errors.length===0;
  const releaseBoundaryObserved = WebRTCBoundaryObserved && releaseActionsRemainNotRun;
  assert(releaseBoundaryObserved,"WebRTC/SSE/RTSP and manual release gates must remain independently bounded");
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

console.log("- 범위: 현재 정의·정책 연결 검사이며 실제 릴리즈·UI·장시간 실행은 미수행입니다.");
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
