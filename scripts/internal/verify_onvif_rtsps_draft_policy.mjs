#!/usr/bin/env node
// 파일 용도: ONVIF rtsps:// probe candidate와 automatic draft 저장 계약 기준을 검증한다.
// 동작 요약: parser, draft API, 수동 Ops 등록이 rtsps를 기존 rtsp source draft로 축약하는지 확인한다.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const rawArgs = process.argv.slice(2);

if (hasHelpFlag(rawArgs)) {
  printUsageAndExit(`ONVIF RTSPS draft policy verification

Usage:
  ./server.sh verify-onvif-rtsps-draft-policy [options]

Options:
  --build-dir <path>    임시 C++ smoke build directory입니다. 기본 /tmp/media_server_onvif_rtsps_draft-<pid>.
  --cxx <path>          C++ compiler입니다. 기본 CXX env 또는 c++.
  -h, --help            도움말 출력

Checks:
  - docs/onvif-rtsps-draft-policy.md가 parser candidate, automatic draft, manual URI 등록 기준을 고정함
  - ONVIF parser는 rtsps:// GetStreamUri 후보를 live RTSP candidate로 인식함
  - automatic import draft API는 rtsps://를 기존 kind=rtsp source draft로 축약함
  - Ops 수동 ONVIF stream URI 입력은 rtsps://를 기존 rtsp source로 저장함
`);
}

assertKnownOptions(rawArgs, ["build-dir", "cxx", "h", "help"]);

const args = parseArgs(rawArgs);
const buildDir = path.resolve(args.buildDir || path.join(os.tmpdir(), `media_server_onvif_rtsps_draft-${process.pid}`));
const cxxBin = args.cxx || process.env.CXX || "c++";
const binaryPath = path.join(buildDir, "onvif_rtsps_import_draft_smoke");
const policyDoc = readText("docs/onvif-rtsps-draft-policy.md");
const matrixDoc = readText("docs/onvif-protocol-support-matrix.md");
const liveSupportDoc = readText("docs/onvif-live-source-support.md");
const onvifCode = readText("src/ingress/onvif_live_import.cpp");
const uiCode = readText("src/ingress/product_ui_page_scripts.cpp");
const rtspsProbeFixture = JSON.parse(readText("test/fixtures/onvif_probe_result_rtsps_stub.json"));
const profileVariants = JSON.parse(readText("test/fixtures/onvif_probe_profile_variants.json"));
const checks = [];

check("RTSPS policy document separates candidate, draft, and manual registration", () => {
  for (const term of [
    "automatic probe candidate",
    "automatic import draft",
    "manual source registration",
    "parser/probe candidate",
    "Automatic import draft API fixture contract",
    "허용",
    "`/ops/sources` manual ONVIF stream URI registration",
    "`rtsps://` source draft를 기존 `kind=rtsp` draft로 생성할 수 있습니다",
    "실제 camera 재생 성공은 미확인",
  ]) {
    assertContains(policyDoc, term, `policy doc missing term: ${term}`);
  }
});

check("protocol and live support docs link RTSPS policy", () => {
  assertContains(matrixDoc, "./onvif-rtsps-draft-policy.md", "protocol matrix missing RTSPS policy link");
  assertContains(liveSupportDoc, "./onvif-rtsps-draft-policy.md", "live support doc missing RTSPS policy link");
  assertContains(liveSupportDoc, "verify-onvif-rtsps-draft-policy", "live support verification missing RTSPS policy command");
  assertContains(liveSupportDoc, "test/fixtures/onvif_probe_result_rtsps_stub.json", "live support doc missing RTSPS probe fixture");
  assertContains(liveSupportDoc, "verify-onvif-probe-draft-api --fixture test/fixtures/onvif_probe_result_rtsps_stub.json", "live support doc missing RTSPS API smoke command");
});

check("RTSPS probe fixture maps to existing API draft contract", () => {
  assert(rtspsProbeFixture.schema === "media-server.onvif-probe-result-stub.v1", "unexpected RTSPS fixture schema");
  assert(String(rtspsProbeFixture.description || "").includes("not a product API contract"), "RTSPS fixture must avoid product API contract wording");
  const selectedToken = rtspsProbeFixture.draftDecision?.selectedProfileToken;
  const selected = arrayAt(rtspsProbeFixture, "mediaProfiles").find(profile => profile.token === selectedToken);
  assert(selected, "RTSPS fixture selected profile missing");
  assert(selected.transport === "RTSP", "RTSPS selected profile transport must remain RTSP");
  assert(String(selected.streamUri || "").startsWith("rtsps://"), "RTSPS selected profile streamUri must be rtsps://");
  const source = rtspsProbeFixture.draftDecision?.expectedSourceDraft || {};
  const view = rtspsProbeFixture.draftDecision?.expectedPublishedViewDraft || {};
  assert(source.kind === "rtsp", "RTSPS source draft kind must remain rtsp");
  assert(source.rtspUrl === selected.streamUri, "RTSPS source draft rtspUrl must match selected streamUri");
  assert(view.sourceId === source.sourceId && view.viewId === source.sourceId, "RTSPS view draft must use same numeric sourceId/viewId");
  assert(arrayAt(source, "tags").includes("rtsps"), "RTSPS source draft tags must include rtsps marker");
  assert(rtspsProbeFixture.auth?.plaintextSecretIncluded === false, "RTSPS fixture must exclude plaintext credentials");
});

check("profile variant fixture includes direct and fallback RTSPS draft cases", () => {
  const byId = Object.fromEntries(arrayAt(profileVariants, "variants").map(variant => [variant.id, variant]));
  for (const id of [
    "media2-rtsps-live-rtsp",
    "media-rtsps-fallback-when-media2-non-rtsp",
  ]) {
    const variant = byId[id];
    assert(variant, `missing RTSPS profile variant: ${id}`);
    const selected = selectedProfile(variant);
    assert(String(selected.streamUri || "").startsWith("rtsps://"), `${id}: selected streamUri must be rtsps://`);
    assert(selected.transport === "RTSP", `${id}: selected transport must remain RTSP`);
    assert(String(variant.expectedSelectionReason || "").includes("kind=rtsp"), `${id}: expected reason must pin kind=rtsp mapping`);
  }
  const fallback = byId["media-rtsps-fallback-when-media2-non-rtsp"];
  assert(selectedProfile(fallback).mediaApi === "Media", "RTSPS fallback variant must select Media");
  assert(arrayAt(fallback, "mediaProfiles").some(profile => profile.mediaApi === "Media2" && !/^rtsps?:\/\//i.test(String(profile.streamUri || ""))), "RTSPS fallback variant must keep a non-RTSP/RTSPS Media2 profile");
});

check("implementation keeps rtsps parser candidate and automatic draft support", () => {
  assertContains(onvifCode, "bool IsRtspOrRtspsUri", "implementation must centralize rtsp/rtsps URL checks");
  assertContains(onvifCode, "value.rfind(\"rtsp://\", 0) == 0 || value.rfind(\"rtsps://\", 0) == 0", "URL helper must accept rtsps");
  assertContains(onvifCode, "profile->transport = IsRtspOrRtspsUri(uri) ? \"RTSP\" : \"\"", "parser must keep rtsps candidate recognition");
  assertContains(onvifCode, "transport != \"RTSP\" || !IsRtspOrRtspsUri(stream_uri)", "automatic draft must accept rtsp and rtsps");
});

check("manual Ops ONVIF URI registration still accepts rtsps as rtsp source", () => {
  assertContains(uiCode, "lower.startsWith('rtsp://') || lower.startsWith('rtsps://')", "Ops manual URI parser must accept rtsps");
  assertContains(uiCode, "return { kind: 'rtsp', rtspUrl: uri }", "Ops manual rtsps registration must map to rtsp source");
  assertContains(uiCode, "ONVIF 스트림 URI는 rtsp://, rtsps://, http://, https://", "Ops validation must mention rtsps");
});

check("C++ smoke accepts rtsps automatic import draft as rtsp source", () => {
  fs.mkdirSync(buildDir, { recursive: true });
  const build = spawnSync(cxxBin, [
    "-std=c++17",
    `-I${path.join(rootDir, "include")}`,
    path.join(scriptDir, "onvif_rtsps_import_draft_smoke.cpp"),
    path.join(rootDir, "src/ingress/onvif_live_import.cpp"),
    "-o",
    binaryPath,
  ], {
    cwd: rootDir,
    encoding: "utf8",
  });
  if (build.status !== 0) {
    process.stdout.write(build.stdout || "");
    process.stderr.write(build.stderr || "");
    throw new Error(`C++ smoke build failed with exit ${build.status}`);
  }
  const run = spawnSync(binaryPath, [], {
    cwd: rootDir,
    encoding: "utf8",
  });
  if (run.status !== 0) {
    process.stdout.write(run.stdout || "");
    process.stderr.write(run.stderr || "");
    throw new Error(`C++ smoke failed with exit ${run.status}`);
  }
  process.stdout.write(run.stdout || "");
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
console.log("== ONVIF RTSPS draft policy summary ==");
console.log("- doc: docs/onvif-rtsps-draft-policy.md");
console.log(`- failures: ${failures}`);
if (failures > 0) process.exit(1);

function check(name, fn) {
  checks.push({ name, fn });
}

function readText(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assertContains(text, needle, message) {
  const normalizedText = text.replace(/\s+/g, " ");
  const normalizedNeedle = needle.replace(/\s+/g, " ");
  assert(normalizedText.includes(normalizedNeedle), message);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function arrayAt(parent, field) {
  const value = parent?.[field];
  assert(Array.isArray(value), `${field} must be an array`);
  return value;
}

function selectedProfile(variant) {
  const selected = arrayAt(variant, "mediaProfiles").filter(profile => profile.token === variant.expectedSelectedProfileToken);
  assert(selected.length === 1, `${variant.id}: expected selected profile must exist once`);
  assert(selected[0].selected === true, `${variant.id}: expected selected profile must be marked selected`);
  return selected[0];
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
