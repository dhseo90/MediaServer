#!/usr/bin/env node
import { readWebRtcHttpServerBundle } from "./webrtc_http_server_source_bundle.mjs";
// 파일 용도: v2.4.0 S06 Ops 이벤트 route owner decomposition wiring을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`v2.4.0 S06 Ops event route owner decomposition verification

Usage:
  ./server.sh verify-v240-ops-event-route-owner-decomposition

Checks:
  - V240-S06 roadmap row references this gate
  - dedicated Ops event route owner module exists and is compiled
  - webrtc_http_server.cpp delegates Ops Events/action, alert dry-run, and client summary route matching
  - route owner module keeps event payload/schema/media/auth boundaries unchanged
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const checks = [];

check("backlog S06 points to the route owner decomposition gate", () => {
  const backlog = readText("docs/development-backlog.md").replace(/\s+/g, " ");
  assert(/\| V240-S06 \| 완료 \| UI\/API decomposition \|/.test(backlog),
    "backlog V240-S06 historical archive row is missing or invalid");
  for (const snippet of [
    "verify-v240-ops-event-route-owner-decomposition",
    "Ops Events, event review/action API, client summary route, alert dry-run route owner",
    "Event POST/WebRTC DataChannel/SSE/WS metadata schema",
    "RTSP/WebRTC media path",
  ]) {
    assert(backlog.includes(snippet), `backlog missing S06 snippet: ${snippet}`);
  }
});

check("route owner module exists", () => {
  for (const file of [
    "include/ingress/ops_event_route_owner.h",
    "src/ingress/ops_event_route_owner.cpp",
  ]) {
    assert(fs.existsSync(path.join(rootDir, file)), `missing route owner file: ${file}`);
  }
});

check("route owner module exposes the expected owner symbols", () => {
  const header = readText("include/ingress/ops_event_route_owner.h");
  for (const snippet of [
    "enum class OpsEventRouteOwner",
    "struct OpsEventRouteMatch",
    "MatchOpsEventRouteOwner",
    "IsOpsEventsPageRoute",
    "IsOpsEventStatusRoute",
    "IsOpsEventReviewCollectionRoute",
    "IsOpsEventReviewItemRoute",
    "IsOpsAlertDeliveryCollectionRoute",
    "IsOpsAlertDeliveryDryRunRoute",
    "IsOpsAlertDeliveryFixtureRoute",
    "IsClientViewSummaryRoute",
  ]) {
    assert(header.includes(snippet), `route owner header missing symbol: ${snippet}`);
  }
});

check("CMake builds the route owner module", () => {
  const cmake = readText("CMakeLists.txt");
  assert(cmake.includes("src/ingress/ops_event_route_owner.cpp"),
    "CMakeLists.txt missing src/ingress/ops_event_route_owner.cpp");
});

check("server delegates matching to the route owner module", () => {
  const server = readWebRtcHttpServerBundle(readText);
  assert(server.includes('#include "ingress/ops_event_route_owner.h"'),
    "webrtc_http_server.cpp must include ops_event_route_owner.h");
  for (const snippet of [
    "IsOpsEventsPageRoute(request.path)",
    "IsOpsEventStatusRoute(request.method, request.path)",
    "IsOpsAlertDeliveryCollectionRoute(request.path)",
    "IsOpsAlertDeliveryDryRunRoute(request.method, request.path)",
    "IsOpsAlertDeliveryFixtureRoute(request.method, request.path)",
    "IsOpsEventReviewCollectionRoute(request.method, request.path)",
    "IsOpsEventReviewItemRoute(request.path)",
    "OpsEventReviewItemIdFromPath(request.path)",
    "IsClientViewSummaryRoute(subresource)",
  ]) {
    assert(server.includes(snippet), `webrtc_http_server.cpp missing delegation snippet: ${snippet}`);
  }
});

check("server no longer owns hard-coded target route comparisons", () => {
  const server = readWebRtcHttpServerBundle(readText);
  for (const snippet of [
    'request.path == "/ops/events"',
    'request.path == "/ops/api/events/status"',
    'request.path == "/ops/api/alerts/deliveries"',
    'request.path == "/ops/api/alerts/deliveries/dry-run"',
    'request.path == "/ops/api/alerts/deliveries/test"',
    'request.path == "/ops/api/events/reviews"',
    'request.path.rfind("/ops/api/events/reviews/", 0)',
    'subresource == "dashboard"',
    'subresource == "events"',
    'subresource == "metadata"',
  ]) {
    assert(!server.includes(snippet), `webrtc_http_server.cpp still owns route comparison: ${snippet}`);
  }
});

check("route owner module documents unchanged contract boundaries", () => {
  const source = readText("src/ingress/ops_event_route_owner.cpp");
  for (const snippet of [
    "V240-S06",
    "owner-only route matching",
    "Event POST payload unchanged",
    "WebRTC DataChannel schema unchanged",
    "SSE/WS metadata schema unchanged",
    "RTSP/WebRTC media path unchanged",
    "/ops/api/alerts/deliveries/dry-run",
    "/client/api/views/{id}/dashboard",
    "/client/api/views/{id}/events",
    "/client/api/views/{id}/metadata",
  ]) {
    assert(source.includes(snippet), `route owner source missing boundary snippet: ${snippet}`);
  }
});

check("server entrypoint exposes the S06 verifier", () => {
  const serverSh = readText("server.sh");
  assert(serverSh.includes("verify-v240-ops-event-route-owner-decomposition"),
    "server.sh missing verify-v240-ops-event-route-owner-decomposition");
  assert(serverSh.includes("verify_v240_ops_event_route_owner_decomposition.mjs"),
    "server.sh missing S06 verifier script dispatch");
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
console.log("== v2.4.0 S06 Ops event route owner decomposition summary ==");
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
