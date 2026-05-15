#!/usr/bin/env node
// 파일 용도: ONVIF Media/Media2 profile selection fixture variant가 no-device 정책을 지키는지 검증한다.
// 동작 요약: synthetic profile matrix에서 선택 profile, draft 매핑 가능성, 비범위 항목 제외를 정적으로 확인한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`ONVIF probe profile variant verification

Usage:
  ./server.sh verify-onvif-probe-profile-variants

Checks:
  - test/fixtures/onvif_probe_profile_variants.json profile selection matrix를 검증
  - Media2 우선, Media fallback, Media-only, H265 RTSP, RTSPS selection variant를 포함
  - 선택 profile은 기존 SourceRegistry kind=rtsp draft로만 축약 가능
  - 실장비 endpoint 성공, raw SOAP, credential 원문, recording/replay scope를 포함하지 않음
`);
}

assertKnownOptions(rawArgs, ["h", "help"]);

const fixturePath = path.join(rootDir, "test/fixtures/onvif_probe_profile_variants.json");
const supportDocPath = path.join(rootDir, "docs/onvif-live-source-support.md");
const fixtureText = fs.readFileSync(fixturePath, "utf8");
const fixture = JSON.parse(fixtureText);
const supportDoc = fs.readFileSync(supportDocPath, "utf8");
const checks = [];

check("variant fixture schema and required ids are pinned", () => {
  assert(fixture.schema === "media-server.onvif-probe-profile-variants.v1", "unexpected fixture schema");
  assert(String(fixture.description || "").includes("not a product API contract"), "description must avoid product API contract wording");
  const ids = new Set(arrayAt(fixture, "variants").map(variant => variant.id));
  for (const id of [
    "media2-preferred-live-rtsp",
    "media-fallback-when-media2-non-rtsp",
    "media-only-live-rtsp",
    "media2-h265-live-rtsp",
    "media2-rtsps-live-rtsp",
  ]) {
    assert(ids.has(id), `missing variant: ${id}`);
  }
});

check("each variant has exactly one selected live RTSP profile", () => {
  for (const variant of arrayAt(fixture, "variants")) {
    const profiles = arrayAt(variant, "mediaProfiles");
    const selected = profiles.filter(profile => profile.selected === true);
    assert(selected.length === 1, `${variant.id}: exactly one profile must be selected`);
    assert(variant.expectedSelectedProfileToken === selected[0].token, `${variant.id}: expectedSelectedProfileToken mismatch`);
    assert(selected[0].transport === "RTSP", `${variant.id}: selected profile must use RTSP transport`);
    assert(isRtspOrRtspsUrl(selected[0].streamUri), `${variant.id}: selected streamUri must be rtsp:// or rtsps://`);
    assert(isDocumentationEndpoint(selected[0].streamUri), `${variant.id}: selected streamUri must use documentation address space`);
    assert(["Media", "Media2"].includes(selected[0].mediaApi), `${variant.id}: mediaApi must be Media or Media2`);
    assert(["H264", "H265"].includes(selected[0].encoding), `${variant.id}: selected encoding must be H264 or H265`);
  }
});

check("service availability matches expected profile fallback paths", () => {
  const byId = variantsById();
  assert(serviceAvailable(byId["media2-preferred-live-rtsp"], "Media2"), "Media2 preferred variant must have Media2");
  assert(serviceAvailable(byId["media2-preferred-live-rtsp"], "Media"), "Media2 preferred variant must also have Media");
  assert(selectedProfile(byId["media2-preferred-live-rtsp"]).mediaApi === "Media2", "Media2 preferred variant must select Media2");

  const fallback = byId["media-fallback-when-media2-non-rtsp"];
  assert(serviceAvailable(fallback, "Media2"), "fallback variant must include Media2");
  assert(serviceAvailable(fallback, "Media"), "fallback variant must include Media");
  assert(fallback.mediaProfiles.some(profile => profile.mediaApi === "Media2" && profile.transport !== "RTSP"), "fallback variant must include a non-RTSP Media2 profile");
  assert(selectedProfile(fallback).mediaApi === "Media", "fallback variant must select Media");

  const mediaOnly = byId["media-only-live-rtsp"];
  assert(serviceAvailable(mediaOnly, "Media2") === false, "media-only variant must mark Media2 unavailable");
  assert(serviceAvailable(mediaOnly, "Media"), "media-only variant must have Media");
  assert(selectedProfile(mediaOnly).mediaApi === "Media", "media-only variant must select Media");

  const h265 = byId["media2-h265-live-rtsp"];
  assert(selectedProfile(h265).encoding === "H265", "H265 variant must select H265");

  const rtsps = byId["media2-rtsps-live-rtsp"];
  assert(selectedProfile(rtsps).streamUri.startsWith("rtsps://"), "RTSPS variant must select an rtsps stream URI");
});

check("selected variants can map to existing SourceRegistry/PublishedView draft shape", () => {
  for (const variant of arrayAt(fixture, "variants")) {
    const selected = selectedProfile(variant);
    const sourceDraft = {
      sourceId: String(variantIndex(variant) + 60),
      displayName: selected.name,
      kind: "rtsp",
      rtspUrl: selected.streamUri,
      enabled: true,
      tags: ["onvif", "live", "probe-variant"],
      ownerGroup: "ops",
    };
    const publishedViewDraft = {
      viewId: sourceDraft.sourceId,
      displayName: selected.name,
      sourceId: sourceDraft.sourceId,
      allowedOverlayModes: ["raw", "va-overlay", "va-rule"],
      showDashboard: true,
      showEvents: true,
      showMetadataSummary: true,
      clientGroups: ["default"],
      maxTiles: 1,
      enabled: true,
    };
    assert(sourceDraft.kind === "rtsp", `${variant.id}: source kind must remain rtsp`);
    assert(sourceDraft.rtspUrl === selected.streamUri, `${variant.id}: source rtspUrl must match selected streamUri`);
    assert(!Object.hasOwn(publishedViewDraft, "rtspUrl"), `${variant.id}: view draft must not expose rtspUrl`);
    assert(!Object.hasOwn(publishedViewDraft, "endpoint"), `${variant.id}: view draft must not expose endpoint`);
    assert(!Object.hasOwn(publishedViewDraft, "credentialRef"), `${variant.id}: view draft must not expose credentialRef`);
  }
});

check("fixture remains synthetic and excludes non-goals", () => {
  for (const term of [
    "<s:Envelope",
    "<SOAP-ENV",
    "operator-entered-secret",
    "password",
    "Authorization:",
    "Cookie:",
  ]) {
    assert(!fixtureText.includes(term), `variant fixture leaked forbidden term: ${term}`);
  }
  const nonGoals = arrayAt(fixture, "nonGoals");
  for (const required of [
    "ONVIF Profile G recording/replay",
    "camera recording configuration",
    "playback/search",
    "raw SOAP persistence",
    "plain text credential persistence",
    "real device endpoint success",
  ]) {
    assert(nonGoals.includes(required), `nonGoals missing ${required}`);
  }
});

check("ONVIF live support doc references profile variant verification", () => {
  assert(supportDoc.includes("test/fixtures/onvif_probe_profile_variants.json"), "support doc missing profile variant fixture path");
  assert(supportDoc.includes("verify-onvif-probe-profile-variants"), "support doc missing profile variant command");
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
console.log("== ONVIF probe profile variant summary ==");
console.log(`- fixture: ${path.relative(rootDir, fixturePath)}`);
console.log(`- variants: ${arrayAt(fixture, "variants").length}`);
console.log(`- failures: ${failures}`);
if (failures > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function arrayAt(parent, field) {
  const value = parent?.[field];
  assert(Array.isArray(value), `${field} must be an array`);
  return value;
}

function variantsById() {
  return Object.fromEntries(arrayAt(fixture, "variants").map(variant => [variant.id, variant]));
}

function variantIndex(variant) {
  return arrayAt(fixture, "variants").findIndex(item => item.id === variant.id);
}

function selectedProfile(variant) {
  const selected = arrayAt(variant, "mediaProfiles").filter(profile => profile.token === variant.expectedSelectedProfileToken);
  assert(selected.length === 1, `${variant.id}: expected selected profile must exist once`);
  assert(selected[0].selected === true, `${variant.id}: expected selected profile must be marked selected`);
  return selected[0];
}

function serviceAvailable(variant, name) {
  const service = arrayAt(variant, "services").find(item => item?.name === name);
  return service?.available === true;
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
