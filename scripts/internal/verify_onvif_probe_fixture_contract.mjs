#!/usr/bin/env node
// 파일 용도: ONVIF field probe fixture가 live source 등록 draft 계약으로 안전하게 축약되는지 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`ONVIF probe fixture contract verification

Usage:
  ./server.sh verify-onvif-probe-fixture-contract

Checks:
  - test/fixtures/onvif_probe_result_stub.json이 내부 probe-to-draft contract를 만족함
  - Device/Media/Media2 service와 live RTSP/RTSPS Media/Media2 profile을 포함함
  - credential 원문, raw SOAP, recording/replay/Profile G scope가 fixture contract에 들어오지 않음
  - 선택 profile이 기존 SourceRegistry/PublishedView draft로만 축약됨
`);
}
assertKnownOptions(rawArgs, ["h", "help"]);

const fixturePath = path.join(rootDir, "test/fixtures/onvif_probe_result_stub.json");
const onvifSupportDocPath = path.join(rootDir, "docs/onvif-live-source-support.md");
const fixtureText = fs.readFileSync(fixturePath, "utf8");
const fixture = JSON.parse(fixtureText);
const onvifSupportDoc = fs.readFileSync(onvifSupportDocPath, "utf8");
const checks = [];

check("fixture schema is pinned for v1.8.0 probe contract", () => {
  assert(fixture.schema === "media-server.onvif-probe-result-stub.v1", "unexpected fixture schema");
  assert(String(fixture.description || "").includes("not a product API contract"), "description must avoid product API contract wording");
});

check("probe summary endpoint policy is documented", () => {
  const probe = objectAt(fixture, "probe");
  assert(probe.mode === "manual-endpoint", "probe.mode must be manual-endpoint");
  assert(hasHttpUrl(probe.endpoint), "probe.endpoint must be http(s)");
  assert(isDocumentationEndpoint(probe.endpoint), "probe.endpoint must use documentation-only address space");
  assert(Number.isInteger(probe.timeoutMs) && probe.timeoutMs > 0, "probe.timeoutMs must be positive");
  assert(probe.rawSoapIncluded === false, "rawSoapIncluded must remain false");
  assert(nonEmptyString(probe.capturedAt), "probe.capturedAt is required");
});

check("credential policy keeps plaintext secrets out of the probe fixture", () => {
  const auth = objectAt(fixture, "auth");
  assert(auth.required === true, "auth.required should model a credential-required camera");
  assert(nonEmptyString(auth.credentialRef), "auth.credentialRef is required instead of plaintext secret");
  assert(auth.plaintextSecretIncluded === false, "plaintextSecretIncluded must be false");
  const secretFields = [];
  collectDisallowedSecretFields(fixture, "", secretFields);
  assert(secretFields.length === 0, `disallowed secret fields found: ${secretFields.join(", ")}`);
});

check("preview contract is explicit before source view storage", () => {
  assertPreviewContract(objectAt(fixture, "previewContract"));
});

check("required live ONVIF services are present", () => {
  const services = arrayAt(fixture, "services");
  assert(serviceAvailable(services, "Device"), "Device service must be available");
  assert(serviceAvailable(services, "Media"), "Media service must be available");
  assert(serviceAvailable(services, "Media2"), "Media2 service must be available");
  assert(serviceAvailable(services, "Recording") === false, "Recording service must remain unavailable");
  assert(serviceAvailable(services, "Replay") === false, "Replay service must remain unavailable");
});

check("device identity remains synthetic", () => {
  const device = objectAt(fixture, "device");
  for (const field of ["manufacturer", "model", "firmwareVersion", "serialNumber"]) {
    assert(nonEmptyString(device[field]), `device.${field} is required`);
  }
  const profilesSupported = arrayAt(device, "profilesSupported");
  assert(profilesSupported.includes("T"), "profilesSupported should include T");
  assert(profilesSupported.includes("S"), "profilesSupported should include S");
  assert(!profilesSupported.includes("G"), "Profile G must not be listed as supported import target");
});

check("selected ONVIF profile is live documentation stream", () => {
  const profiles = arrayAt(fixture, "mediaProfiles");
  assert(profiles.length > 0, "mediaProfiles must not be empty");
  assert(profiles.filter(profile => profile.selected === true).length === 1, "exactly one profile should be selected");
  for (const profile of profiles) {
    assert(["Media", "Media2"].includes(profile.mediaApi), `profile ${profile.token} mediaApi must be Media or Media2`);
    assert(["H264", "H265"].includes(profile.encoding), `profile ${profile.token} encoding must be H264 or H265`);
    assert(profile.transport === "RTSP", `profile ${profile.token} transport must be RTSP`);
    assert(isRtspOrRtspsUrl(profile.streamUri), `profile ${profile.token} streamUri must be RTSP/RTSPS`);
    assert(isDocumentationEndpoint(profile.streamUri), `profile ${profile.token} streamUri must use documentation address space`);
  }
});

check("draft decision maps selected profile to existing payloads only", () => {
  const decision = objectAt(fixture, "draftDecision");
  const selected = selectedProfile();
  assert(decision.selectedProfileToken === selected.token, "selectedProfileToken mismatch");
  const source = objectAt(decision, "expectedSourceDraft");
  assert(/^[0-9]+$/.test(source.sourceId), "sourceId must match current numeric channel contract");
  assert(source.kind === "rtsp", "expectedSourceDraft.kind must be rtsp");
  assert(source.rtspUrl === selected.streamUri, "expectedSourceDraft.rtspUrl must match selected streamUri");
  const tags = arrayAt(source, "tags");
  assert(tags.includes("onvif"), "source tags must include onvif");
  assert(tags.includes("live"), "source tags must include live");
  assertOnlyKeys(source, [
    "sourceId",
    "displayName",
    "kind",
    "rtspUrl",
    "enabled",
    "tags",
    "ownerGroup",
  ], "expectedSourceDraft");

  const view = objectAt(decision, "expectedPublishedViewDraft");
  assert(view.viewId === source.sourceId, "viewId should match sourceId");
  assert(view.sourceId === source.sourceId, "PublishedView sourceId must reference source draft");
  assert(!Object.hasOwn(view, "rtspUrl"), "PublishedView draft must not include rtspUrl");
  assert(!Object.hasOwn(view, "endpoint"), "PublishedView draft must not include endpoint");
  assert(!Object.hasOwn(view, "credentialRef"), "PublishedView draft must not include credentialRef");
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
  ], "expectedPublishedViewDraft");
});

check("origin metadata remains diagnostic context only", () => {
  const decision = objectAt(fixture, "draftDecision");
  const origin = objectAt(decision, "proposedOriginMetadata");
  const selected = selectedProfile();
  assert(origin.type === "onvif", "origin.type must be onvif");
  assert(origin.endpoint === objectAt(fixture, "probe").endpoint, "origin endpoint should track probe endpoint");
  assert(origin.mediaProfileToken === selected.token, "origin mediaProfileToken must match selected profile");
  assert(origin.mediaApi === selected.mediaApi, "origin mediaApi must match selected profile");
  assert(origin.credentialInline === false, "origin credentialInline must be false");
  assert(!Object.hasOwn(decision.expectedSourceDraft, "origin"), "source draft must not include origin metadata");
  assert(!Object.hasOwn(decision.expectedPublishedViewDraft, "origin"), "view draft must not include origin metadata");
});

check("probe contract excludes non live ONVIF scope", () => {
  const nonGoals = arrayAt(fixture, "nonGoals");
  for (const required of [
    "ONVIF Profile G recording/replay",
    "camera recording configuration",
    "playback/search",
    "raw SOAP persistence",
    "plain text credential persistence",
  ]) {
    assert(nonGoals.includes(required), `nonGoals missing ${required}`);
  }
  for (const forbidden of ["<s:Envelope", "<SOAP-ENV", "GetProfilesResponse", "GetStreamUriResponse"]) {
    assert(!fixtureText.includes(forbidden), `fixture must not embed raw SOAP text: ${forbidden}`);
  }
});

check("ONVIF media profile selection policy is documented", () => {
  for (const term of [
    "## Media/Media2 Profile Selection Policy",
    "Media2.GetProfiles",
    "Media",
    "GetStreamUri",
    "rtsp://",
    "rtsps://",
    "selected=true",
    "sourceDraft.rtspUrl",
    "ONVIF probe failed at GetStreamUri: no live RTSP profile discovered",
    "ONVIF Profile G recording/replay",
  ]) {
    assert(onvifSupportDoc.includes(term), `ONVIF support doc missing profile policy term: ${term}`);
  }
});

check("probe preview contract is documented", () => {
  for (const term of [
    "previewContract",
    "media-server.onvif-draft-preview.v1",
    "scope=ops-sources-before-save",
    "requiresExplicitSave=true",
    "storageAction=none",
    "sourceRegistryMutation=false",
    "publishedViewMutation=false",
    "endpoint, credential material, raw SOAP",
    "raw diagnostic JSON",
  ]) {
    assert(onvifSupportDoc.includes(term), `ONVIF support doc missing preview contract term: ${term}`);
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

console.log("");
console.log("== ONVIF probe fixture contract summary ==");
console.log(`- fixture: ${path.relative(rootDir, fixturePath)}`);
console.log(`- checks: ${checks.length}`);
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

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasHttpUrl(value) {
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

function serviceAvailable(services, name) {
  const service = services.find(item => item?.name === name);
  return service?.available === true;
}

function selectedProfile() {
  const decision = objectAt(fixture, "draftDecision");
  const selectedToken = decision.selectedProfileToken;
  const selected = arrayAt(fixture, "mediaProfiles").filter(profile => profile.token === selectedToken);
  assert(selected.length === 1, "selectedProfileToken must match exactly one media profile");
  assert(selected[0].selected === true, "selected profile must be marked selected");
  return selected[0];
}

function collectDisallowedSecretFields(value, pathPrefix, out) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectDisallowedSecretFields(item, `${pathPrefix}[${index}]`, out));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value)) {
    const fullPath = pathPrefix ? `${pathPrefix}.${key}` : key;
    if (["password", "username", "secret", "tokenHash", "passwordHash"].includes(key)) {
      out.push(fullPath);
    }
    collectDisallowedSecretFields(item, fullPath, out);
  }
}

function assertOnlyKeys(object, allowed, label) {
  const allowedSet = new Set(allowed);
  const extra = Object.keys(object).filter(key => !allowedSet.has(key));
  assert(extra.length === 0, `${label} has unexpected keys: ${extra.join(", ")}`);
}

function assertPreviewContract(actual) {
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
  assertOnlyKeys(actual, [
    "schema",
    "scope",
    "requiresExplicitSave",
    "storageAction",
    "sourceRegistryMutation",
    "publishedViewMutation",
    "rawSoapIncluded",
    "credentialMaterialIncluded",
    "endpointIncluded",
    "diagnosticJsonIncluded",
  ], "previewContract");
}
