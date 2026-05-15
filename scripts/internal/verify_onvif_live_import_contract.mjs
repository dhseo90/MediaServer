#!/usr/bin/env node
// 파일 용도: 카메라 없이 ONVIF live import draft fixture가 내부 contract를 지키는지 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`ONVIF live import contract verification

Usage:
  ./server.sh verify-onvif-live-import-contract

Checks:
  - test/fixtures/onvif_live_import_stub.json이 내부 import draft contract를 만족함
  - 선택된 ONVIF profile의 RTSP/RTSPS streamUri가 기존 kind=rtsp SourceRegistry draft로 변환됨
  - PublishedView draft가 source locator, ONVIF endpoint, credential reference를 포함하지 않음
  - credential plaintext, recording/replay/Profile G scope가 fixture contract에 들어오지 않음
`);
}
assertKnownOptions(rawArgs, ["h", "help"]);

const fixturePath = path.join(rootDir, "test/fixtures/onvif_live_import_stub.json");
const checks = [];

const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));

check("fixture schema is pinned for alpha.2 import contract", () => {
  assert(fixture.schema === "media-server.onvif-live-import-stub.v1", "unexpected fixture schema");
  assert(String(fixture.description || "").includes("not a product API contract"), "description must avoid product API contract wording");
});

check("device candidate contains synthetic ONVIF identity only", () => {
  const device = objectAt(fixture, "device");
  assert(hasHttpUrl(device.endpoint), "device.endpoint must be an http(s) ONVIF endpoint");
  assert(isDocumentationEndpoint(device.endpoint), "device.endpoint must use documentation-only address space");
  for (const field of ["manufacturer", "model", "firmwareVersion", "serialNumber"]) {
    assert(nonEmptyString(device[field]), `device.${field} is required`);
  }
});

check("credential policy keeps plaintext secrets out of the fixture", () => {
  const auth = objectAt(fixture, "auth");
  assert(auth.required === true, "auth.required should model a credential-required camera");
  assert(nonEmptyString(auth.credentialRef), "auth.credentialRef is required instead of plaintext secret");
  assert(auth.plaintextSecretIncluded === false, "plaintextSecretIncluded must be false");
  const secretFields = [];
  collectDisallowedSecretFields(fixture, "", secretFields);
  assert(secretFields.length === 0, `disallowed secret fields found: ${secretFields.join(", ")}`);
});

check("recording, replay, and Profile G remain outside the import contract", () => {
  const capabilities = objectAt(fixture, "capabilities");
  assert(capabilities.recording === false, "capabilities.recording must remain false");
  assert(capabilities.replay === false, "capabilities.replay must remain false");
  const nonGoals = arrayAt(fixture, "nonGoals");
  for (const required of [
    "ONVIF Profile G recording/replay",
    "camera recording configuration",
    "playback/search",
    "plain text credential persistence",
  ]) {
    assert(nonGoals.includes(required), `nonGoals missing ${required}`);
  }
  const profilesSupported = arrayAt(objectAt(fixture, "device"), "profilesSupported");
  assert(!profilesSupported.includes("G"), "Profile G must not be listed as supported import target");
});

check("selected media profile is a live RTSP profile", () => {
  const profiles = arrayAt(fixture, "profiles");
  assert(profiles.length > 0, "profiles must not be empty");
  const selectedToken = stringAt(objectAt(fixture, "importDecision"), "selectedProfileToken");
  const selected = profiles.filter((profile) => profile.token === selectedToken);
  assert(selected.length === 1, "selectedProfileToken must match exactly one profile");
  assert(profiles.filter((profile) => profile.selected === true).length === 1, "exactly one profile should be marked selected");
  const profile = selected[0];
  assert(profile.selected === true, "selectedProfileToken profile must be marked selected");
  assert(["Media", "Media2"].includes(profile.mediaApi), "selected profile mediaApi must be Media or Media2");
  assert(["H264", "H265"].includes(profile.encoding), "selected profile must use H264 or H265");
  assert(profile.transport === "RTSP", "selected profile transport must be RTSP");
  assert(isRtspOrRtspsUrl(profile.streamUri), "selected profile streamUri must be RTSP/RTSPS");
});

check("SourceRegistry draft uses only existing RTSP source payload fields", () => {
  const decision = objectAt(fixture, "importDecision");
  const source = objectAt(decision, "expectedSourceDraft");
  const selected = selectedProfile();
  assert(nonEmptyString(source.sourceId), "sourceId is required");
  assert(/^[0-9]+$/.test(source.sourceId), "sourceId must match current numeric channel contract");
  assert(nonEmptyString(source.displayName), "displayName is required");
  assert(source.kind === "rtsp", "expectedSourceDraft.kind must be rtsp");
  assert(source.rtspUrl === selected.streamUri, "expectedSourceDraft.rtspUrl must match selected streamUri");
  assert(source.enabled === true, "expectedSourceDraft.enabled must default true");
  const tags = arrayAt(source, "tags");
  assert(tags.includes("onvif"), "source tags must include onvif");
  assert(tags.includes("live"), "source tags must include live");
  assert(tags.some((tag) => /^profile-[tsm]/i.test(tag)), "source tags should include profile direction");
  assertOnlyKeys(source, [
    "sourceId",
    "displayName",
    "kind",
    "rtspUrl",
    "enabled",
    "tags",
    "ownerGroup",
  ], "expectedSourceDraft");
});

check("PublishedView draft keeps source locators and ONVIF details out", () => {
  const decision = objectAt(fixture, "importDecision");
  const source = objectAt(decision, "expectedSourceDraft");
  const view = objectAt(decision, "expectedPublishedViewDraft");
  assert(view.viewId === source.sourceId, "viewId should match sourceId in the stub contract");
  assert(/^[0-9]+$/.test(view.viewId), "viewId must match current numeric channel contract");
  assert(view.sourceId === source.sourceId, "PublishedView sourceId must reference source draft");
  const modes = arrayAt(view, "allowedOverlayModes");
  for (const mode of modes) {
    assert(["raw", "va-overlay", "va-rule"].includes(mode), `unexpected overlay mode: ${mode}`);
  }
  assert(view.maxTiles === 1, "maxTiles must be 1 in the stub contract");
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

check("origin metadata draft is diagnostic-only and not embedded in source/view payloads", () => {
  const decision = objectAt(fixture, "importDecision");
  const origin = objectAt(decision, "proposedOriginMetadata");
  const selected = selectedProfile();
  assert(origin.type === "onvif", "origin.type must be onvif");
  assert(origin.endpoint === objectAt(fixture, "device").endpoint, "origin endpoint should track device endpoint");
  assert(origin.mediaProfileToken === selected.token, "origin mediaProfileToken must match selected profile");
  assert(origin.mediaApi === selected.mediaApi, "origin mediaApi must match selected profile");
  assert(origin.credentialInline === false, "origin credentialInline must be false");
  assert(!Object.hasOwn(decision.expectedSourceDraft, "origin"), "source draft must not include origin metadata yet");
  assert(!Object.hasOwn(decision.expectedPublishedViewDraft, "origin"), "view draft must not include origin metadata");
});

let failures = 0;
for (const item of checks) {
  try {
    item.fn();
    console.log(`[pass] ${item.name}`);
  } catch (error) {
    failures += 1;
    console.log(`[fail] ${item.name}: ${error.message}`);
  }
}

console.log("");
console.log("== ONVIF live import contract summary ==");
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

function stringAt(parent, field) {
  const value = parent?.[field];
  assert(nonEmptyString(value), `${field} must be a non-empty string`);
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

function selectedProfile() {
  const selectedToken = stringAt(objectAt(fixture, "importDecision"), "selectedProfileToken");
  return arrayAt(fixture, "profiles").find((profile) => profile.token === selectedToken);
}

function assertOnlyKeys(value, allowedKeys, label) {
  const allowed = new Set(allowedKeys);
  const unexpected = Object.keys(value).filter((key) => !allowed.has(key));
  assert(unexpected.length === 0, `${label} has unexpected fields: ${unexpected.join(", ")}`);
}

function collectDisallowedSecretFields(value, currentPath, out) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectDisallowedSecretFields(item, `${currentPath}[${index}]`, out));
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    const nextPath = currentPath ? `${currentPath}.${key}` : key;
    if (/password/i.test(key) || /plain(text)?Secret/i.test(key) || /digestSecret/i.test(key)) {
      if (key !== "plaintextSecretIncluded") out.push(nextPath);
    }
    if (key === "credentialInline" && child !== false) {
      out.push(nextPath);
    }
    collectDisallowedSecretFields(child, nextPath, out);
  }
}
