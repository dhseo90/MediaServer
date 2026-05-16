#!/usr/bin/env node
// 파일 용도: 실행 중인 서버의 ONVIF import draft API가 fixture를 저장 가능한 source/view draft로 변환하는지 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`ONVIF import draft API smoke

Usage:
  ./server.sh verify-onvif-import-draft-api [options]

Options:
  --http-base <url>       실행 중인 서버 HTTP base입니다. 기본 http://127.0.0.1:8081.
  --fixture <path>        ONVIF import fixture입니다. 기본 test/fixtures/onvif_live_import_stub.json.
  -h, --help              도움말 출력

Checks:
  - POST /ops/api/onvif/import-draft가 fixture를 sourceDraft/publishedViewDraft로 변환
  - draft API가 SourceRegistry/PublishedView를 저장하지 않음
  - 응답이 credentialRef, ONVIF endpoint, raw diagnostic JSON을 노출하지 않음
`);
}
assertKnownOptions(rawArgs, ["http-base", "fixture", "h", "help"]);

const args = parseArgs(rawArgs);
const httpBase = String(args.httpBase || "http://127.0.0.1:8081").replace(/\/+$/, "");
const fixturePath = path.resolve(rootDir, args.fixture || "test/fixtures/onvif_live_import_stub.json");
const fixtureText = fs.readFileSync(fixturePath, "utf8");
const fixture = JSON.parse(fixtureText);

const before = await requestJson("/ops/api/sources");
const responseText = await requestText("/ops/api/onvif/import-draft", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: fixtureText,
});
const payload = JSON.parse(responseText);
assert(payload.ok === true, "response ok must be true");
assert(payload.status === "onvifImportDraft", "unexpected response status");
assert(payload.notSaved === true, "draft API must declare notSaved=true");

const expectedSource = fixture.importDecision.expectedSourceDraft;
const expectedView = fixture.importDecision.expectedPublishedViewDraft;
assertDraftSource(payload.sourceDraft, expectedSource);
assertDraftView(payload.publishedViewDraft, expectedView, expectedSource);
assertPreviewContract(payload.previewContract, fixture.previewContract);
assertSelectedProfile(payload.selectedProfile, fixture);
assertAuth(payload.auth);
assertNoForbiddenResponseText(responseText);
console.log("[pass] onvif-import-draft response contract");

const after = await requestJson("/ops/api/sources");
assert(JSON.stringify(before.sources || []) === JSON.stringify(after.sources || []), "draft API must not mutate sources");
console.log("[pass] onvif-import-draft has no SourceRegistry side effect");

const badSource = JSON.parse(fixtureText);
badSource.importDecision.expectedSourceDraft.sourceId = "not-numeric";
const bad = await requestText("/ops/api/onvif/import-draft", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(badSource),
  expectedStatus: 400,
});
assert(bad.includes("sourceId must be numeric"), "bad sourceId should be rejected");
console.log("[pass] onvif-import-draft rejects nonnumeric sourceId");

await expectBadDraft("malformed body", "not-json", "request body must be a JSON object");
await expectBadDraft("missing importDecision", mutateFixture((next) => {
  delete next.importDecision;
}), "importDecision or draftDecision object is required");
await expectBadDraft("selected profile not found", mutateFixture((next) => {
  next.importDecision.selectedProfileToken = "missing-profile-token";
}), "selected profile not found");
await expectBadDraft("non-RTSP selected profile", mutateFixture((next) => {
  const selected = next.profiles.find((profile) => profile.token === next.importDecision.selectedProfileToken);
  selected.transport = "HTTP";
  selected.streamUri = "https://192.0.2.10/live/main.m3u8";
}), "selected profile must provide an RTSP/RTSPS streamUri");
await expectBadDraft("plaintext credential rejected", mutateFixture((next) => {
  next.auth.plaintextSecretIncluded = true;
}), "plaintext credentials are not allowed");
console.log("[pass] onvif-import-draft rejects malformed and unsafe route payloads");

const final = await requestJson("/ops/api/sources");
assert(JSON.stringify(before.sources || []) === JSON.stringify(final.sources || []), "negative draft API cases must not mutate sources");
console.log("[pass] onvif-import-draft negative cases have no SourceRegistry side effect");

console.log("");
console.log("== ONVIF import draft API summary ==");
console.log(`- http base: ${httpBase}`);
console.log(`- fixture: ${path.relative(rootDir, fixturePath)}`);
console.log("- failures: 0");

async function requestJson(urlPath, options = {}) {
  const text = await requestText(urlPath, options);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${urlPath} returned non-JSON: ${text.slice(0, 180)}`);
  }
}

async function requestText(urlPath, options = {}) {
  const expectedStatus = Number(options.expectedStatus || 200);
  const response = await fetch(`${httpBase}${urlPath}`, options);
  const text = await response.text();
  if (response.status !== expectedStatus) {
    throw new Error(`${urlPath} expected HTTP ${expectedStatus}, got ${response.status}: ${text.slice(0, 220)}`);
  }
  return text;
}

async function expectBadDraft(label, body, expectedText) {
  const text = await requestText("/ops/api/onvif/import-draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    expectedStatus: 400,
  });
  assert(text.includes(expectedText), `${label} should include: ${expectedText}`);
}

function mutateFixture(mutator) {
  const next = JSON.parse(fixtureText);
  mutator(next);
  return JSON.stringify(next);
}

function assertDraftSource(actual, expected) {
  assert(actual && typeof actual === "object", "sourceDraft is required");
  assert(actual.sourceId === expected.sourceId, "sourceDraft.sourceId mismatch");
  assert(/^[0-9]+$/.test(actual.sourceId), "sourceDraft.sourceId must be numeric");
  assert(actual.displayName === expected.displayName, "sourceDraft.displayName mismatch");
  assert(actual.kind === "rtsp", "sourceDraft.kind must be rtsp");
  assert(actual.rtspUrl === expected.rtspUrl, "sourceDraft.rtspUrl mismatch");
  assert(actual.enabled === true, "sourceDraft.enabled must be true");
  assert(Array.isArray(actual.tags), "sourceDraft.tags must be array");
  assert(actual.tags.includes("onvif"), "sourceDraft.tags missing onvif");
  assert(actual.tags.includes("live"), "sourceDraft.tags missing live");
  assert(actual.ownerGroup === expected.ownerGroup, "sourceDraft.ownerGroup mismatch");
}

function assertDraftView(actual, expected, source) {
  assert(actual && typeof actual === "object", "publishedViewDraft is required");
  assert(actual.viewId === expected.viewId, "publishedViewDraft.viewId mismatch");
  assert(actual.sourceId === source.sourceId, "publishedViewDraft.sourceId mismatch");
  assert(/^[0-9]+$/.test(actual.viewId), "publishedViewDraft.viewId must be numeric");
  assert(actual.displayName === expected.displayName, "publishedViewDraft.displayName mismatch");
  assert(Array.isArray(actual.allowedOverlayModes), "allowedOverlayModes must be array");
  assert(!("rtspUrl" in actual), "publishedViewDraft must not include rtspUrl");
  assert(!("endpoint" in actual), "publishedViewDraft must not include endpoint");
  assert(!("credentialRef" in actual), "publishedViewDraft must not include credentialRef");
}

function assertSelectedProfile(actual, sourceFixture) {
  assert(actual && typeof actual === "object", "selectedProfile is required");
  const selectedToken = sourceFixture.importDecision.selectedProfileToken;
  const selected = sourceFixture.profiles.find((profile) => profile.token === selectedToken);
  assert(selected, "fixture selected profile missing");
  assert(actual.token === selected.token, "selectedProfile.token mismatch");
  assert(actual.transport === "RTSP", "selectedProfile.transport must be RTSP");
  assert(!("streamUri" in actual), "selectedProfile must not duplicate streamUri");
}

function assertAuth(actual) {
  assert(actual && typeof actual === "object", "auth summary is required");
  assert(actual.required === true, "auth.required mismatch");
  assert(actual.credentialRefPresent === true, "auth.credentialRefPresent mismatch");
  assert(actual.plaintextSecretIncluded === false, "plaintextSecretIncluded must be false");
}

function assertNoForbiddenResponseText(text) {
  for (const forbidden of [
    "\"credentialRef\"",
    "operator-entered-secret",
    "/onvif/device_service",
    "raw diagnostic JSON",
    "\"password\"",
  ]) {
    assert(!text.includes(forbidden), `response leaked forbidden text: ${forbidden}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertPreviewContract(actual, expected) {
  assert(actual && typeof actual === "object", "previewContract is required");
  assert(expected && typeof expected === "object", "fixture previewContract is required");
  for (const [key, value] of Object.entries(expected)) {
    assert(actual[key] === value, `previewContract.${key} mismatch`);
  }
  assert(actual.schema === "media-server.onvif-draft-preview.v1", "previewContract.schema mismatch");
  assert(actual.scope === "ops-sources-before-save", "previewContract.scope mismatch");
  assert(actual.requiresExplicitSave === true, "previewContract.requiresExplicitSave must be true");
  assert(actual.storageAction === "none", "previewContract.storageAction must be none");
  assert(actual.sourceRegistryMutation === false, "previewContract.sourceRegistryMutation must be false");
  assert(actual.publishedViewMutation === false, "previewContract.publishedViewMutation must be false");
  assert(actual.rawSoapIncluded === false, "previewContract.rawSoapIncluded must be false");
  assert(actual.credentialMaterialIncluded === false, "previewContract credential material must be excluded");
  assert(actual.endpointIncluded === false, "previewContract endpoint must be excluded");
  assert(actual.diagnosticJsonIncluded === false, "previewContract diagnostic JSON must be excluded");
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
  return value.replace(/-([a-z])/g, (_match, chr) => chr.toUpperCase());
}
