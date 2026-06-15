#!/usr/bin/env node
// 파일 용도: 실행 중인 서버가 ONVIF probe fixture를 기존 source/view draft로 변환하는지 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`ONVIF probe draft API smoke

Usage:
  ./server.sh verify-onvif-probe-draft-api [options]

Options:
  --http-base <url>       실행 중인 서버 HTTP base입니다. 기본 http://127.0.0.1:8081.
  --fixture <path>        ONVIF probe fixture입니다. 기본 test/fixtures/onvif_probe_result_stub.json.
  --profile-variant <id>  test/fixtures/onvif_probe_profile_variants.json의 success variant를 API smoke payload로 사용합니다.
  -h, --help              도움말 출력

Checks:
  - POST /ops/api/onvif/import-draft가 probe fixture의 draftDecision을 sourceDraft/publishedViewDraft로 변환
  - draft API가 SourceRegistry/PublishedView를 저장하지 않음
  - 응답이 credentialRef, ONVIF endpoint, raw SOAP, raw diagnostic JSON을 노출하지 않음
`);
}
assertKnownOptions(rawArgs, ["http-base", "fixture", "profile-variant", "h", "help"]);

const args = parseArgs(rawArgs);
const httpBase = String(args.httpBase || "http://127.0.0.1:8081").replace(/\/+$/, "");
const profileVariantId = String(args.profileVariant || "").trim();
assert(!(profileVariantId && args.fixture), "--fixture and --profile-variant cannot be used together");
const fixtureBundle = profileVariantId
  ? fixtureFromProfileVariant(profileVariantId)
  : fixtureFromPath(args.fixture || "test/fixtures/onvif_probe_result_stub.json");
const fixtureText = fixtureBundle.text;
const fixture = fixtureBundle.fixture;

const before = await requestJson("/ops/api/sources");
const responseText = await requestText("/ops/api/onvif/import-draft", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: fixtureText,
});
const payload = JSON.parse(responseText);
assert(payload.ok === true, "response ok must be true");
console.log("[pass] onvif-probe-draft response ok is true");
assert(payload.status === "onvifImportDraft", "unexpected response status");
console.log("[pass] onvif-probe-draft response status is onvifImportDraft");
assert(payload.notSaved === true, "draft API must declare notSaved=true");
console.log("[pass] onvif-probe-draft response declares notSaved");

const expectedSource = fixture.draftDecision.expectedSourceDraft;
const expectedView = fixture.draftDecision.expectedPublishedViewDraft;
assertDraftSource(payload.sourceDraft, expectedSource);
console.log("[pass] onvif-probe-draft sourceDraft matches fixture decision");
assertDraftView(payload.publishedViewDraft, expectedView, expectedSource);
console.log("[pass] onvif-probe-draft publishedViewDraft matches fixture decision");
assertPreviewContract(payload.previewContract, fixture.previewContract);
console.log("[pass] onvif-probe-draft previewContract matches fixture decision");
assertSelectedProfile(payload.selectedProfile, fixture);
console.log("[pass] onvif-probe-draft selectedProfile matches fixture decision");
assertAuth(payload.auth);
console.log("[pass] onvif-probe-draft auth summary exposes credential reference state only");
for (const forbidden of assertNoForbiddenResponseText(responseText)) {
  console.log(`[pass] onvif-probe-draft response omits forbidden text ${JSON.stringify(forbidden)}`);
}

const after = await requestJson("/ops/api/sources");
assert(JSON.stringify(before.sources || []) === JSON.stringify(after.sources || []), "probe draft API must not mutate sources");
console.log("[pass] onvif-probe-draft has no SourceRegistry side effect");

const badSource = JSON.parse(fixtureText);
badSource.draftDecision.expectedSourceDraft.sourceId = "probe-not-numeric";
const bad = await requestText("/ops/api/onvif/import-draft", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(badSource),
  expectedStatus: 400,
});
assert(bad.includes("sourceId must be numeric"), "bad sourceId should be rejected");
console.log("[pass] onvif-probe-draft rejects nonnumeric sourceId");

await expectBadDraft("malformed body", "not-json", "request body must be a JSON object");
await expectBadDraft("missing draftDecision", mutateFixture((next) => {
  delete next.draftDecision;
}), "importDecision or draftDecision object is required");
await expectBadDraft("selected profile not found", mutateFixture((next) => {
  next.draftDecision.selectedProfileToken = "missing-profile-token";
}), "selected profile not found");
await expectBadDraft("non-RTSP selected profile", mutateFixture((next) => {
  const selected = next.mediaProfiles.find((profile) => profile.token === next.draftDecision.selectedProfileToken);
  selected.transport = "HTTP";
  selected.streamUri = "https://192.0.2.30/live/main.m3u8";
}), "selected profile must provide an RTSP/RTSPS streamUri");
await expectBadDraft("URL credential rejected", mutateFixture((next) => {
  const selected = next.mediaProfiles.find((profile) => profile.token === next.draftDecision.selectedProfileToken);
  selected.streamUri = "rtsp://operator:secret@192.0.2.30/live/main";
  next.draftDecision.expectedSourceDraft.rtspUrl = selected.streamUri;
}), "streamUri must not include credentials");
await expectBadDraft("plaintext credential rejected", mutateFixture((next) => {
  next.auth.plaintextSecretIncluded = true;
}), "plaintext credentials are not allowed");

const final = await requestJson("/ops/api/sources");
assert(JSON.stringify(before.sources || []) === JSON.stringify(final.sources || []), "negative probe draft API cases must not mutate sources");
console.log("[pass] onvif-probe-draft negative cases have no SourceRegistry side effect");

console.log("");
console.log("== ONVIF probe draft API summary ==");
console.log(`- http base: ${httpBase}`);
console.log(`- fixture: ${fixtureBundle.label}`);
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
  console.log(`[pass] onvif-probe-draft rejects ${label}`);
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
  const selectedToken = sourceFixture.draftDecision.selectedProfileToken;
  const selected = sourceFixture.mediaProfiles.find((profile) => profile.token === selectedToken);
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
  const forbiddenItems = [
    "\"credentialRef\"",
    "operator-entered-secret",
    "/onvif/device_service",
    "raw SOAP",
    "raw diagnostic JSON",
    "\"password\"",
  ];
  for (const forbidden of forbiddenItems) {
    assert(!text.includes(forbidden), `response leaked forbidden text: ${forbidden}`);
  }
  return forbiddenItems;
}

function fixtureFromPath(relativeOrAbsolutePath) {
  const fixturePath = path.resolve(rootDir, relativeOrAbsolutePath);
  const text = fs.readFileSync(fixturePath, "utf8");
  return {
    fixture: JSON.parse(text),
    label: path.relative(rootDir, fixturePath),
    text,
  };
}

function fixtureFromProfileVariant(id) {
  const variantsPath = path.join(rootDir, "test/fixtures/onvif_probe_profile_variants.json");
  const variantsFixture = JSON.parse(fs.readFileSync(variantsPath, "utf8"));
  const variants = arrayAt(variantsFixture, "variants");
  const variantIndex = variants.findIndex((item) => item.id === id);
  assert(variantIndex >= 0, `profile variant not found: ${id}`);
  const variant = variants[variantIndex];
  const selected = selectedProfile(variant);
  const sourceId = String(80 + variantIndex);
  const displayName = selected.name || selected.token || id;
  const fixture = {
    schema: "media-server.onvif-probe-result-stub.v1",
    description: `Synthetic ONVIF profile variant route smoke payload for ${id}. This is not a product API contract.`,
    probe: {
      mode: "profile-variant-fixture",
      endpoint: "http://192.0.2.250/onvif/device_service",
      timeoutMs: 3000,
      rawSoapIncluded: false,
      capturedAt: "fixture-time",
    },
    auth: {
      required: true,
      credentialRef: "operator-entered-secret",
      plaintextSecretIncluded: false,
    },
    previewContract: {
      schema: "media-server.onvif-draft-preview.v1",
      scope: "ops-sources-before-save",
      requiresExplicitSave: true,
      storageAction: "none",
      sourceRegistryMutation: false,
      publishedViewMutation: false,
      rawSoapIncluded: false,
      credentialMaterialIncluded: false,
      endpointIncluded: false,
      diagnosticJsonIncluded: false,
    },
    device: {
      manufacturer: "ProfileVariantFixture",
      model: id,
      firmwareVersion: "fixture",
      serialNumber: "FIELD-ONVIF-PROFILE-VARIANT-0001",
      profilesSupported: ["T", "S"],
    },
    services: arrayAt(variant, "services"),
    mediaProfiles: arrayAt(variant, "mediaProfiles"),
    draftDecision: {
      selectedProfileToken: selected.token,
      expectedSourceDraft: {
        sourceId,
        displayName,
        kind: "rtsp",
        rtspUrl: selected.streamUri,
        enabled: true,
        tags: ["onvif", "live", "probe-variant"],
        ownerGroup: "ops",
      },
      expectedPublishedViewDraft: {
        viewId: sourceId,
        displayName,
        sourceId,
        allowedOverlayModes: ["raw", "va-overlay", "va-rule"],
        showDashboard: true,
        showEvents: true,
        showMetadataSummary: true,
        clientGroups: ["default"],
        maxTiles: 1,
        enabled: true,
      },
      proposedOriginMetadata: {
        type: "onvif",
        endpoint: "http://192.0.2.250/onvif/device_service",
        mediaProfileToken: selected.token,
        mediaApi: selected.mediaApi,
        streamUriImportedAt: "fixture-time",
        credentialRef: "operator-entered-secret",
        credentialInline: false,
      },
    },
    nonGoals: arrayAt(variantsFixture, "nonGoals"),
  };
  return {
    fixture,
    label: `test/fixtures/onvif_probe_profile_variants.json#${id}`,
    text: `${JSON.stringify(fixture, null, 2)}\n`,
  };
}

function arrayAt(parent, field) {
  const value = parent?.[field];
  assert(Array.isArray(value), `${field} must be an array`);
  return value;
}

function selectedProfile(variant) {
  const token = String(variant.expectedSelectedProfileToken || "");
  const selected = arrayAt(variant, "mediaProfiles").filter((profile) => profile.token === token);
  assert(selected.length === 1, `${variant.id}: expected selected profile must exist once`);
  assert(selected[0].selected === true, `${variant.id}: expected selected profile must be marked selected`);
  assert(selected[0].transport === "RTSP", `${variant.id}: selected transport must be RTSP`);
  assert(/^rtsps?:\/\//i.test(String(selected[0].streamUri || "")), `${variant.id}: selected streamUri must be rtsp:// or rtsps://`);
  return selected[0];
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
  return value.replace(/-([a-z])/g, (_match, ch) => ch.toUpperCase());
}
