#!/usr/bin/env node
// 파일 용도: ONVIF vendor-style 합성 fixture pack이 no-device 검증 경계를 지키는지 확인한다.
// 동작 요약: 실제 제조사/장비 없이 흔한 Media/Media2/Profile S/T 응답 차이를 draft 계약으로 축약 가능한지 점검한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`ONVIF synthetic vendor fixture pack verification

Usage:
  ./server.sh verify-onvif-synthetic-vendor-fixtures

Checks:
  - test/fixtures/onvif_synthetic_vendor_fixture_pack.json의 synthetic vendor-style pack을 검증
  - Profile S/T, Media2 우선, Media-only, RTSPS H265, Media fallback, low-fps substream, empty Media2 fallback case를 포함
  - 선택 profile은 기존 SourceRegistry kind=rtsp / PublishedView draft로만 축약 가능
  - 실장비 endpoint 성공, raw SOAP, credential 원문, Profile G/Recording/Replay scope를 포함하지 않음
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const fixturePath = path.join(rootDir, "test/fixtures/onvif_synthetic_vendor_fixture_pack.json");
const liveSupportDocPath = path.join(rootDir, "docs/onvif-live-source-support.md");
const noDeviceDocPath = path.join(rootDir, "docs/onvif-no-device-verification.md");
const provenanceDocPath = path.join(rootDir, "docs/sample-fixture-provenance.md");
const fixtureText = fs.readFileSync(fixturePath, "utf8");
const fixture = JSON.parse(fixtureText);
const liveSupportDoc = fs.readFileSync(liveSupportDocPath, "utf8");
const noDeviceDoc = fs.readFileSync(noDeviceDocPath, "utf8");
const provenanceDoc = fs.readFileSync(provenanceDocPath, "utf8");
const checks = [];

check("fixture pack schema and no-device scope are pinned", () => {
  assert(fixture.schema === "media-server.onvif-synthetic-vendor-fixture-pack.v1", "unexpected fixture schema");
  assert(String(fixture.description || "").includes("not a product API contract"), "description must avoid product API contract wording");
  const scope = objectAt(fixture, "packScope");
  assert(scope.mode === "synthetic-vendor-style", "packScope.mode mismatch");
  assert(scope.realDeviceEndpointSuccess === "미확인", "real device endpoint success must remain unverified");
  assert(scope.rawSoapIncluded === false, "raw SOAP must not be included");
  assert(scope.credentialPlaintextIncluded === false, "plaintext credential must not be included");
  assert(scope.profileGSupported === false, "Profile G must remain unsupported");
});

check("required vendor-style cases are present", () => {
  const ids = new Set(fixtures().map(item => item.id));
  for (const id of [
    "vendor-a-media2-main-sub-profile-t",
    "vendor-b-media-only-profile-s",
    "vendor-c-media2-h265-rtsps-profile-t",
    "vendor-d-media2-http-preview-media-fallback",
    "vendor-e-low-fps-substream-profile-s",
    "vendor-f-empty-media2-fallback-alt-xaddr",
  ]) {
    assert(ids.has(id), `missing fixture: ${id}`);
  }
  const quirks = new Set(fixtures().flatMap(item => arrayAt(item, "quirks")));
  for (const quirk of [
    "media2-main-substreams",
    "media-only-profile-s",
    "rtsps-h265",
    "kind-rtsp-for-rtsps",
    "media-fallback-after-http-preview",
    "low-fps-secondary",
    "non-default-device-service-path",
    "media2-empty-profile-list",
    "media-fallback-after-empty-media2",
  ]) {
    assert(quirks.has(quirk), `missing vendor-style quirk: ${quirk}`);
  }
});

check("each fixture uses documentation endpoints and synthetic device identity", () => {
  const seenSourceIds = new Set();
  for (const item of fixtures()) {
    const probe = objectAt(item, "probe");
    assert(probe.mode === "manual-endpoint", `${item.id}: probe.mode must be manual-endpoint`);
    assert(isHttpUrl(probe.endpoint), `${item.id}: probe endpoint must be HTTP(S)`);
    assert(isDocumentationEndpoint(probe.endpoint), `${item.id}: probe endpoint must use documentation address space`);
    assert(!String(probe.endpoint).includes("?"), `${item.id}: probe endpoint must not include query credentials`);
    assert(probe.rawSoapIncluded === false, `${item.id}: rawSoapIncluded must be false`);
    assert(Number.isInteger(probe.timeoutMs) && probe.timeoutMs > 0, `${item.id}: timeoutMs must be positive`);

    const auth = objectAt(item, "auth");
    assert(auth.required === true, `${item.id}: auth.required should model credential-required field devices`);
    assert(nonEmptyString(auth.credentialRef), `${item.id}: credentialRef is required`);
    assert(auth.plaintextSecretIncluded === false, `${item.id}: plaintextSecretIncluded must be false`);

    const device = objectAt(item, "device");
    assert(String(device.manufacturer || "").startsWith("SyntheticVendor"), `${item.id}: device manufacturer must be synthetic`);
    assert(String(device.serialNumber || "").startsWith("SYNTH-ONVIF-"), `${item.id}: device serial must be synthetic`);
    const supported = arrayAt(device, "profilesSupported");
    assert(supported.length > 0, `${item.id}: profilesSupported must not be empty`);
    for (const profile of supported) {
      assert(["S", "T"].includes(profile), `${item.id}: only Profile S/T are in v1.8.0 synthetic vendor scope`);
    }
    assert(!supported.includes("G"), `${item.id}: Profile G must not be listed`);

    const source = objectAt(objectAt(item, "expectedDraft"), "expectedSourceDraft");
    assert(!seenSourceIds.has(source.sourceId), `${item.id}: duplicate sourceId ${source.sourceId}`);
    seenSourceIds.add(source.sourceId);
  }
});

check("service matrix stays live-source only", () => {
  for (const item of fixtures()) {
    const services = arrayAt(item, "services");
    assert(serviceAvailable(item, "Device"), `${item.id}: Device service must be available`);
    assert(serviceAvailable(item, "Media") || serviceAvailable(item, "Media2"), `${item.id}: Media or Media2 must be available`);
    assert(serviceAvailable(item, "Recording") === false, `${item.id}: Recording must remain unavailable`);
    assert(serviceAvailable(item, "Replay") === false, `${item.id}: Replay must remain unavailable`);
    assert(services.every(service => nonEmptyString(service.name)), `${item.id}: every service needs a name`);
  }
});

check("optional service quirks stay descriptive and inside live fallback scope", () => {
  for (const item of fixtures()) {
    const serviceQuirks = Array.isArray(item.serviceQuirks) ? item.serviceQuirks : [];
    for (const quirk of serviceQuirks) {
      assert(["Device", "Media", "Media2"].includes(quirk.service), `${item.id}: serviceQuirk service must stay live-source related`);
      assert(nonEmptyString(quirk.issue), `${item.id}: serviceQuirk issue is required`);
      assert(!Object.hasOwn(quirk, "credential"), `${item.id}: serviceQuirk must not include credentials`);
      assert(!Object.hasOwn(quirk, "rawSoap"), `${item.id}: serviceQuirk must not include raw SOAP`);
      if (quirk.service === "Media2" && quirk.issue === "empty-profile-list") {
        assert(quirk.fallbackService === "Media", `${item.id}: empty Media2 quirk must fall back to Media`);
        assert(serviceAvailable(item, "Media"), `${item.id}: Media fallback service must be available`);
        assert(selectedProfile(item).mediaApi === "Media", `${item.id}: empty Media2 fallback must select a Media profile`);
      }
      if (quirk.service === "Device" && quirk.issue === "non-default-service-path") {
        assert(nonEmptyString(quirk.path) && quirk.path.startsWith("/onvif/"), `${item.id}: non-default service path must stay under /onvif/`);
        assert(String(objectAt(item, "probe").endpoint).endsWith(quirk.path), `${item.id}: probe endpoint must reflect service path quirk`);
      }
    }
  }
});

check("selected profiles are live RTSP/RTSPS and map to existing source/view drafts", () => {
  for (const item of fixtures()) {
    const selected = selectedProfile(item);
    const expectedDraft = objectAt(item, "expectedDraft");
    assert(expectedDraft.selectedProfileToken === selected.token, `${item.id}: selectedProfileToken mismatch`);
    assert(["Media", "Media2"].includes(selected.mediaApi), `${item.id}: selected mediaApi must be Media or Media2`);
    assert(["H264", "H265"].includes(selected.encoding), `${item.id}: selected encoding must be H264 or H265`);
    assert(selected.transport === "RTSP", `${item.id}: selected transport must remain RTSP`);
    assert(isRtspOrRtspsUrl(selected.streamUri), `${item.id}: selected streamUri must be rtsp:// or rtsps://`);
    assert(isDocumentationEndpoint(selected.streamUri), `${item.id}: selected streamUri must use documentation address space`);

    const source = objectAt(expectedDraft, "expectedSourceDraft");
    assert(/^[0-9]+$/.test(source.sourceId), `${item.id}: sourceId must be numeric`);
    assert(source.kind === "rtsp", `${item.id}: source kind must stay rtsp`);
    assert(source.rtspUrl === selected.streamUri, `${item.id}: source rtspUrl must match selected streamUri`);
    const tags = arrayAt(source, "tags");
    for (const tag of ["onvif", "live", "synthetic-vendor"]) {
      assert(tags.includes(tag), `${item.id}: source tags missing ${tag}`);
    }
    assertOnlyKeys(source, [
      "sourceId",
      "displayName",
      "kind",
      "rtspUrl",
      "enabled",
      "tags",
      "ownerGroup",
    ], `${item.id}.expectedSourceDraft`);

    const view = objectAt(expectedDraft, "expectedPublishedViewDraft");
    assert(view.viewId === source.sourceId, `${item.id}: viewId should match sourceId`);
    assert(view.sourceId === source.sourceId, `${item.id}: view sourceId should match sourceId`);
    assert(!Object.hasOwn(view, "rtspUrl"), `${item.id}: PublishedView must not expose rtspUrl`);
    assert(!Object.hasOwn(view, "endpoint"), `${item.id}: PublishedView must not expose ONVIF endpoint`);
    assert(!Object.hasOwn(view, "credentialRef"), `${item.id}: PublishedView must not expose credentialRef`);
    assertOnlyKeys(view, [
      "viewId",
      "displayName",
      "sourceId",
      "allowedOverlayModes",
      "showDashboard",
      "showEvents",
      "showMetadataSummary",
      "clientGroups",
      "maxTiles",
      "enabled",
    ], `${item.id}.expectedPublishedViewDraft`);
  }
});

check("origin metadata remains proposed diagnostic context outside source/view payloads", () => {
  for (const item of fixtures()) {
    const expectedDraft = objectAt(item, "expectedDraft");
    const origin = objectAt(expectedDraft, "proposedOriginMetadata");
    const selected = selectedProfile(item);
    assert(origin.type === "onvif", `${item.id}: origin type must be onvif`);
    assert(origin.endpoint === objectAt(item, "probe").endpoint, `${item.id}: origin endpoint mismatch`);
    assert(origin.vendorStyle === item.vendorStyle, `${item.id}: origin vendorStyle mismatch`);
    assert(["S", "T"].includes(origin.profile), `${item.id}: origin profile must be S or T`);
    assert(origin.mediaProfileToken === selected.token, `${item.id}: origin media profile token mismatch`);
    assert(origin.mediaApi === selected.mediaApi, `${item.id}: origin mediaApi mismatch`);
    assert(origin.credentialInline === false, `${item.id}: origin credentialInline must be false`);
    assert(!Object.hasOwn(expectedDraft.expectedSourceDraft, "origin"), `${item.id}: source draft must not include origin`);
    assert(!Object.hasOwn(expectedDraft.expectedPublishedViewDraft, "origin"), `${item.id}: view draft must not include origin`);
  }
});

check("fixture pack excludes raw SOAP, credentials, and non-scope features", () => {
  const forbiddenTerms = [
    "<s:Envelope",
    "<SOAP-ENV",
    "GetProfilesResponse",
    "GetStreamUriResponse",
    "Authorization:",
    "Cookie:",
    "password",
    "tokenHash",
  ];
  for (const term of forbiddenTerms) {
    assert(!fixtureText.includes(term), `fixture pack leaked forbidden term: ${term}`);
  }
  const secretFields = [];
  collectDisallowedSecretFields(fixture, "", secretFields);
  assert(secretFields.length === 0, `disallowed secret fields found: ${secretFields.join(", ")}`);
  const nonGoals = arrayAt(fixture, "nonGoals");
  for (const required of [
    "real vendor compatibility certification",
    "real device endpoint success",
    "ONVIF Profile G recording/replay",
    "camera recording configuration",
    "playback/search",
    "raw SOAP persistence",
    "plain text credential persistence",
  ]) {
    assert(nonGoals.includes(required), `nonGoals missing ${required}`);
  }
});

check("docs reference synthetic vendor fixture verification without claiming field success", () => {
  for (const doc of [liveSupportDoc, noDeviceDoc]) {
    assertContains(doc, "test/fixtures/onvif_synthetic_vendor_fixture_pack.json", "doc missing vendor fixture path");
    assertContains(doc, "verify-onvif-synthetic-vendor-fixtures", "doc missing vendor fixture command");
    assertContains(doc, "vendor-style synthetic fixture", "doc missing vendor-style wording");
  }
  assertContains(liveSupportDoc, "실장비 endpoint 성공은 미확인", "live support doc must keep field success unverified");
  assertContains(noDeviceDoc, "실장비 endpoint 성공", "no-device doc must keep real endpoint caveat");
  assertContains(provenanceDoc, "test/fixtures/onvif_synthetic_vendor_fixture_pack.json", "provenance doc missing vendor fixture path");
  assertContains(provenanceDoc, "실제 장비/credential 없는 합성 JSON fixture", "provenance doc missing synthetic source wording");
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

console.log("");
console.log("== ONVIF synthetic vendor fixture pack summary ==");
console.log(`- fixture: ${path.relative(rootDir, fixturePath)}`);
console.log(`- cases: ${fixtures().length}`);
console.log("- realDeviceEndpointSuccess: 미확인");
console.log(`- failures: ${failures}`);

if (failures > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function objectAt(parent, field) {
  const value = parent?.[field];
  assert(value && typeof value === "object" && !Array.isArray(value), `${field} must be an object`);
  return value;
}

function arrayAt(parent, field) {
  const value = parent?.[field];
  assert(Array.isArray(value), `${field} must be an array`);
  return value;
}

function fixtures() {
  return arrayAt(fixture, "fixtures");
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || ""));
}

function isRtspOrRtspsUrl(value) {
  return /^rtsps?:\/\//i.test(String(value || ""));
}

function isDocumentationEndpoint(value) {
  try {
    const parsed = new URL(value);
    return parsed.hostname.startsWith("192.0.2.") ||
      parsed.hostname.startsWith("198.51.100.") ||
      parsed.hostname.startsWith("203.0.113.");
  } catch {
    return false;
  }
}

function serviceAvailable(item, name) {
  const service = arrayAt(item, "services").find(entry => entry?.name === name);
  return service?.available === true;
}

function selectedProfile(item) {
  const selected = arrayAt(item, "mediaProfiles").filter(profile => profile.selected === true);
  assert(selected.length === 1, `${item.id}: exactly one profile must be selected`);
  return selected[0];
}

function assertOnlyKeys(value, allowed, label) {
  const allowedSet = new Set(allowed);
  const unknown = Object.keys(value).filter(key => !allowedSet.has(key));
  assert(unknown.length === 0, `${label} has unexpected keys: ${unknown.join(", ")}`);
}

function collectDisallowedSecretFields(value, pathPrefix, out) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectDisallowedSecretFields(item, `${pathPrefix}[${index}]`, out));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    const currentPath = pathPrefix ? `${pathPrefix}.${key}` : key;
    const lower = key.toLowerCase();
    if (["password", "passwordhash", "tokenhash", "authorization", "cookie", "secret"].includes(lower)) {
      out.push(currentPath);
    }
    collectDisallowedSecretFields(child, currentPath, out);
  }
}

function assertContains(text, needle, message) {
  const normalizedText = text.replace(/\s+/g, " ");
  const normalizedNeedle = needle.replace(/\s+/g, " ");
  assert(normalizedText.includes(normalizedNeedle), message);
}
