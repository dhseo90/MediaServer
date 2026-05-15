#!/usr/bin/env node
// 파일 용도: ONVIF 비지원 protocol이 제품 API/UI route로 열리지 않았는지 정적으로 검증한다.
// 동작 요약: import-draft만 허용하고 PTZ/Events/Profile G/Recording/Replay route가 없는지 확인한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`ONVIF unsupported API guard verification

Usage:
  ./server.sh verify-onvif-unsupported-api-guard [options]

Options:
  --http-base <url>      실행 중인 서버 HTTP base입니다. 기본 http://127.0.0.1:8081.
  --exercise-routes      negative route matrix를 실제 HTTP request로 확인합니다.

Checks:
  - docs/onvif-unsupported-api-guard.md가 허용/비허용 ONVIF API 경계를 명시함
  - test/fixtures/onvif_unsupported_api_negative_routes.json이 404/405 matrix를 고정함
  - protocol matrix/live support 문서가 unsupported guard를 참조함
  - 제품 서버 코드에는 PTZ/Events/PullPoint/Recording/Replay ONVIF API route가 없음
`);
}

assertKnownOptions(rawArgs, ["http-base", "exercise-routes", "h", "help"]);

const args = parseArgs(rawArgs);
const httpBase = String(args.httpBase || "http://127.0.0.1:8081").replace(/\/+$/, "");
const exerciseRoutes = Boolean(args.exerciseRoutes);

const guardDoc = readText("docs/onvif-unsupported-api-guard.md");
const matrixDoc = readText("docs/onvif-protocol-support-matrix.md");
const liveSupportDoc = readText("docs/onvif-live-source-support.md");
const serverCode = readText("src/ingress/webrtc_http_server.cpp");
const negativeRouteFixture = JSON.parse(readText("test/fixtures/onvif_unsupported_api_negative_routes.json"));
const checks = [];

check("unsupported API guard document pins allowed and blocked ONVIF routes", () => {
  assertContains(guardDoc, "POST /ops/api/onvif/import-draft", "guard doc missing allowed import draft route");
  assertContains(guardDoc, "test/fixtures/onvif_unsupported_api_negative_routes.json", "guard doc missing negative route fixture path");
  assertContains(guardDoc, "405", "guard doc missing method-not-allowed status");
  assertContains(guardDoc, "404", "guard doc missing not-found status");
  for (const term of [
    "/ops/api/onvif/discover",
    "/ops/api/onvif/ptz",
    "/ops/api/onvif/events",
    "/ops/api/onvif/pullpoint",
    "/ops/api/onvif/recording",
    "/ops/api/onvif/replay",
    "/ops/api/onvif/analytics",
    "/ops/api/onvif/imaging",
    "/ops/api/onvif/device-management",
  ]) {
    assertContains(guardDoc, term, `guard doc missing blocked route: ${term}`);
  }
});

check("unsupported API guard document lists non-supported ONVIF protocols", () => {
  for (const term of [
    "WS-Discovery 자동 검색",
    "PTZ pan/tilt/zoom",
    "ONVIF Events subscription",
    "PullPoint",
    "Profile G",
    "Recording",
    "Replay",
    "camera-side Analytics service",
    "Imaging service",
    "Device management",
  ]) {
    assertContains(guardDoc, term, `guard doc missing unsupported protocol: ${term}`);
  }
});

check("related docs link unsupported API guard", () => {
  assertContains(matrixDoc, "./onvif-unsupported-api-guard.md", "protocol matrix missing unsupported API guard link");
  assertContains(liveSupportDoc, "./onvif-unsupported-api-guard.md", "live support doc missing unsupported API guard link");
  assertContains(liveSupportDoc, "verify-onvif-unsupported-api-guard", "live support verification missing unsupported API guard command");
});

check("negative route matrix pins 404/405 expectations", () => {
  assert(negativeRouteFixture.schema === "media-server.onvif-unsupported-api-negative-routes.v1", "unexpected negative route fixture schema");
  assert(String(negativeRouteFixture.description || "").includes("not a product API contract"), "negative route fixture must avoid product API contract wording");
  assert(negativeRouteFixture.allowedRoute?.method === "POST", "allowed route method must be POST");
  assert(negativeRouteFixture.allowedRoute?.path === "/ops/api/onvif/import-draft", "allowed route path mismatch");
  const routes = arrayAt(negativeRouteFixture, "negativeRoutes");
  assert(routes.length >= 11, "negative route matrix must include import method guards and unsupported routes");
  const byPath = new Map();
  for (const route of routes) {
    assert(nonEmptyString(route.id), "negative route id is required");
    assert(["GET", "POST", "PUT"].includes(route.method), `${route.id}: unexpected method`);
    assert(nonEmptyString(route.path) && route.path.startsWith("/ops/api/onvif/"), `${route.id}: path must stay under ONVIF ops API`);
    assert(route.expectedStatus === 404 || route.expectedStatus === 405, `${route.id}: expectedStatus must be 404 or 405`);
    assert(nonEmptyString(route.expectedBodyTerm), `${route.id}: expectedBodyTerm is required`);
    byPath.set(`${route.method} ${route.path}`, route);
  }
  assert(byPath.get("GET /ops/api/onvif/import-draft")?.expectedStatus === 405, "GET import-draft must be 405");
  assert(byPath.get("PUT /ops/api/onvif/import-draft")?.expectedStatus === 405, "PUT import-draft must be 405");
  for (const path of unsupportedRoutePaths()) {
    assert(byPath.get(`POST ${path}`)?.expectedStatus === 404, `POST ${path} must be 404`);
  }
  const forbidden = arrayAt(negativeRouteFixture, "forbiddenResponseTerms");
  for (const required of ["credentialRef", "raw SOAP", "rtsp://", "rtsps://"]) {
    assert(forbidden.includes(required), `forbiddenResponseTerms missing ${required}`);
  }
});

check("product server only exposes ONVIF import draft route", () => {
  assertContains(serverCode, "/ops/api/onvif/import-draft", "server must keep existing import draft route");
  assertContains(serverCode, "method not allowed", "server must keep method guard response for import-draft");
  for (const forbidden of unsupportedRoutePaths()) {
    assert(!serverCode.includes(forbidden), `server unexpectedly exposes unsupported ONVIF route: ${forbidden}`);
  }
});

let failures = 0;
for (const item of checks) {
  try {
    item.fn();
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    failures += 1;
    console.log(`[fail] ${item.name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failures === 0 && exerciseRoutes) {
  try {
    await verifyHttpNegativeRoutes();
    console.log("[pass] negative route matrix HTTP status smoke");
  } catch (error) {
    failures += 1;
    console.log(`[fail] negative route matrix HTTP status smoke: ${error instanceof Error ? error.message : String(error)}`);
  }
}

console.log("");
console.log("== ONVIF unsupported API guard summary ==");
console.log("- doc: docs/onvif-unsupported-api-guard.md");
console.log(`- routeMatrix: test/fixtures/onvif_unsupported_api_negative_routes.json`);
if (exerciseRoutes) console.log(`- http base: ${httpBase}`);
console.log(`- failures: ${failures}`);
if (failures > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function arrayAt(parent, field) {
  const value = parent?.[field];
  assert(Array.isArray(value), `${field} must be an array`);
  return value;
}

function assertContains(text, needle, message) {
  const normalizedText = text.replace(/\s+/g, " ");
  const normalizedNeedle = needle.replace(/\s+/g, " ");
  assert(normalizedText.includes(normalizedNeedle), message);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function unsupportedRoutePaths() {
  return [
    "/ops/api/onvif/discover",
    "/ops/api/onvif/ptz",
    "/ops/api/onvif/events",
    "/ops/api/onvif/pullpoint",
    "/ops/api/onvif/recording",
    "/ops/api/onvif/replay",
    "/ops/api/onvif/analytics",
    "/ops/api/onvif/imaging",
    "/ops/api/onvif/device-management",
  ];
}

async function verifyHttpNegativeRoutes() {
  const forbiddenTerms = arrayAt(negativeRouteFixture, "forbiddenResponseTerms");
  for (const route of arrayAt(negativeRouteFixture, "negativeRoutes")) {
    const response = await fetch(`${httpBase}${route.path}`, {
      method: route.method,
      headers: route.method === "GET" ? undefined : { "Content-Type": "application/json" },
      body: route.method === "GET" ? undefined : "{}",
    });
    const text = await response.text();
    assert(response.status === route.expectedStatus, `${route.id}: expected HTTP ${route.expectedStatus}, got ${response.status}: ${text.slice(0, 160)}`);
    assert(text.toLowerCase().includes(String(route.expectedBodyTerm).toLowerCase()), `${route.id}: response missing ${route.expectedBodyTerm}`);
    for (const forbidden of forbiddenTerms) {
      assert(!text.includes(forbidden), `${route.id}: response leaked forbidden term ${forbidden}`);
    }
  }
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const raw = token.slice(2);
    const eq = raw.indexOf("=");
    if (eq >= 0) {
      parsed[toCamel(raw.slice(0, eq))] = raw.slice(eq + 1);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      parsed[toCamel(raw)] = next;
      index += 1;
    } else {
      parsed[toCamel(raw)] = "1";
    }
  }
  return parsed;
}

function toCamel(value) {
  return value.replace(/-([a-z])/g, (_match, ch) => ch.toUpperCase());
}
