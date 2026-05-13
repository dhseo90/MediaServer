#!/usr/bin/env node
// 파일 용도: ONVIF import draft에서 나온 공개 RTSP URL이 기존 source/view downstream 계약으로 저장되고 client에는 redaction되는지 검증한다.

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
  printUsageAndExit(`ONVIF public RTSP downstream smoke

Usage:
  ./server.sh verify-onvif-rtsp-downstream [options]

Options:
  --http-base <url>       실행 중인 서버 HTTP base입니다. 기본 http://127.0.0.1:8081.
  --fixture <path>        ONVIF import fixture입니다. 기본 test/fixtures/onvif_live_import_stub.json.
  --source-id <id>        임시 source/view id입니다. 기본 51.
  --rtsp-url <url>        공개 RTSP URL입니다. 기본 Wowza public RTSP test stream.
  --allow-non-temp-registry
                           /tmp 외 registry에서도 실행합니다. 기본은 안전상 거부.
  -h, --help              도움말 출력

Checks:
  - 공개 RTSP URL을 ONVIF selected streamUri처럼 넣어 import draft를 생성
  - draft source/view를 기존 /ops/api/sources, /ops/api/views 경로로 저장
  - ops API에는 source locator가 보이지만 client API에는 RTSP URL, ONVIF endpoint, credential reference가 보이지 않음
  - smoke 종료 시 만든 source/view를 비활성화
`);
}
assertKnownOptions(rawArgs, [
  "http-base",
  "fixture",
  "source-id",
  "rtsp-url",
  "allow-non-temp-registry",
  "h",
  "help",
]);

const args = parseArgs(rawArgs);
const httpBase = String(args.httpBase || "http://127.0.0.1:8081").replace(/\/+$/, "");
const fixturePath = path.resolve(rootDir, args.fixture || "test/fixtures/onvif_live_import_stub.json");
const sourceId = String(args.sourceId || "51");
const publicRtspUrl = String(
  args.rtspUrl ||
    "rtsp://9627b0bf2a7b.entrypoint.cloud.wowza.com:1935/app-p5260J38/66abe4b9_stream1",
);
const allowNonTempRegistry = Boolean(args.allowNonTempRegistry);

assert(/^[0-9]+$/.test(sourceId), "--source-id must be numeric for current /ops/sources contract");
assert(/^rtsp:\/\//i.test(publicRtspUrl), "--rtsp-url must be an RTSP URL");

const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const draftRequest = buildPublicRtspDraft(fixture);
const registryBefore = await requestJson("/ops/api/sources");
const viewsBefore = await requestJson("/ops/api/views");
assertTempRegistry(registryBefore.storagePath, "source registry");
assertTempRegistry(viewsBefore.storagePath, "published view registry");
assert(!hasRecord(registryBefore.sources, "sourceId", sourceId), `sourceId ${sourceId} already exists`);
assert(!hasRecord(viewsBefore.views, "viewId", sourceId), `viewId ${sourceId} already exists`);

let wroteSource = false;
let wroteView = false;
try {
  const draftResponseText = await requestText("/ops/api/onvif/import-draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draftRequest),
  });
  const draft = JSON.parse(draftResponseText);
  assert(draft.ok === true, "import draft response must be ok");
  assert(draft.notSaved === true, "import draft API must not save by itself");
  assert(draft.sourceDraft?.kind === "rtsp", "sourceDraft.kind must be rtsp");
  assert(draft.sourceDraft?.rtspUrl === publicRtspUrl, "sourceDraft.rtspUrl must use public RTSP URL");
  assertNoCredentialOrEndpointText("import-draft", draftResponseText);
  console.log("[pass] public RTSP import draft created");

  const sourcePayload = { ...draft.sourceDraft, allowDuplicateSource: true };
  const sourceSaved = await requestJson(`/ops/api/sources/${encodeURIComponent(sourceId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sourcePayload),
    expectedStatus: 201,
  });
  assert(sourceSaved.ok === true, "source save must return ok");
  wroteSource = true;
  console.log("[pass] public RTSP source draft saved through SourceRegistry API");

  const viewSaved = await requestJson(`/ops/api/views/${encodeURIComponent(sourceId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft.publishedViewDraft),
    expectedStatus: 201,
  });
  assert(viewSaved.ok === true, "PublishedView save must return ok");
  wroteView = true;
  console.log("[pass] public RTSP PublishedView draft saved through PublishedView API");

  const sources = await requestJson("/ops/api/sources");
  const savedSource = findRecord(sources.sources, "sourceId", sourceId);
  assert(savedSource, "saved source missing from ops API");
  assert(savedSource.kind === "rtsp", "saved source kind must be rtsp");
  assert(savedSource.rtspUrl === publicRtspUrl, "saved source rtspUrl mismatch");
  assert(savedSource.tags?.includes("onvif") && savedSource.tags?.includes("live"), "saved source tags missing onvif/live");
  console.log("[pass] ops API shows imported RTSP source locator");

  const clientListText = await requestText("/client/api/views");
  assertNoClientForbiddenText("client-api-views", clientListText);
  const clientList = JSON.parse(clientListText);
  assert(hasRecord(clientList.views, "viewId", sourceId), "client views list missing imported view");
  console.log("[pass] client views list includes sanitized imported view");

  const clientViewText = await requestText(`/client/api/views/${encodeURIComponent(sourceId)}`);
  assertNoClientForbiddenText(`client-api-view-${sourceId}`, clientViewText);
  const clientView = JSON.parse(clientViewText).view;
  assert(clientView?.viewId === sourceId, "client view detail missing imported view");
  assert(clientView.sourceKind === "rtsp", "client view sourceKind should remain downstream rtsp");
  assert(Array.isArray(clientView.sourceTags) && clientView.sourceTags.includes("onvif"), "client view should expose sanitized ONVIF tag");
  assert(!("rtspUrl" in clientView), "client view must not include rtspUrl");
  console.log("[pass] client view detail redacts RTSP locator and ONVIF details");
} finally {
  if (wroteView) {
    await requestText(`/ops/api/views/${encodeURIComponent(sourceId)}`, {
      method: "DELETE",
      expectedStatus: 200,
    }).catch((error) => console.log(`[warn] PublishedView cleanup failed: ${error.message}`));
  }
  if (wroteSource) {
    await requestText(`/ops/api/sources/${encodeURIComponent(sourceId)}`, {
      method: "DELETE",
      expectedStatus: 200,
    }).catch((error) => console.log(`[warn] source cleanup failed: ${error.message}`));
  }
}

console.log("");
console.log("== ONVIF public RTSP downstream summary ==");
console.log(`- http base: ${httpBase}`);
console.log(`- fixture: ${path.relative(rootDir, fixturePath)}`);
console.log(`- public RTSP URL: ${publicRtspUrl}`);
console.log(`- source/view id: ${sourceId}`);
console.log("- failures: 0");

function buildPublicRtspDraft(baseFixture) {
  const next = JSON.parse(JSON.stringify(baseFixture));
  const selectedToken = next.importDecision.selectedProfileToken;
  const selected = next.profiles.find((profile) => profile.token === selectedToken);
  assert(selected, "fixture selected profile is missing");
  selected.streamUri = publicRtspUrl;
  selected.transport = "RTSP";
  next.importDecision.expectedSourceDraft = {
    ...next.importDecision.expectedSourceDraft,
    sourceId,
    displayName: "ONVIF Public RTSP Downstream",
    kind: "rtsp",
    rtspUrl: publicRtspUrl,
    enabled: true,
    tags: ["onvif", "live", "profile-t", "public-rtsp", "downstream"],
    ownerGroup: "ops",
  };
  next.importDecision.expectedPublishedViewDraft = {
    ...next.importDecision.expectedPublishedViewDraft,
    viewId: sourceId,
    displayName: "ONVIF Public RTSP Downstream",
    sourceId,
    allowedOverlayModes: ["raw", "va-overlay", "va-rule"],
    showDashboard: true,
    showEvents: true,
    showMetadataSummary: true,
    clientGroups: ["default"],
    maxTiles: 1,
    enabled: true,
  };
  return next;
}

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

function assertNoClientForbiddenText(label, text) {
  for (const forbidden of [
    publicRtspUrl,
    "\"rtspUrl\"",
    "\"canonicalSourceKey\"",
    "\"credentialRef\"",
    "operator-entered-secret",
    "/onvif/device_service",
    "raw diagnostic JSON",
    "\"password\"",
  ]) {
    assert(!text.includes(forbidden), `${label} leaked forbidden text: ${forbidden}`);
  }
}

function assertNoCredentialOrEndpointText(label, text) {
  for (const forbidden of [
    "\"credentialRef\"",
    "operator-entered-secret",
    "/onvif/device_service",
    "raw diagnostic JSON",
    "\"password\"",
  ]) {
    assert(!text.includes(forbidden), `${label} leaked forbidden text: ${forbidden}`);
  }
}

function assertTempRegistry(storagePath, label) {
  if (allowNonTempRegistry) return;
  assert(storagePath, `${label} storagePath missing`);
  const resolved = path.resolve(rootDir, storagePath);
  const realParent = fs.realpathSync(path.dirname(resolved));
  const tempRoots = [os.tmpdir(), "/tmp", "/private/tmp"]
    .map((item) => fs.realpathSync(item))
    .filter((item, index, items) => items.indexOf(item) === index);
  const underTempRoot = tempRoots.some((tempRoot) => (
    realParent === tempRoot || realParent.startsWith(`${tempRoot}${path.sep}`)
  ));
  assert(
    underTempRoot,
    `${label} must be under one of ${tempRoots.join(", ")}; got ${resolved}. Use --allow-non-temp-registry only for disposable environments.`,
  );
}

function hasRecord(records, idField, id) {
  return Boolean(findRecord(records, idField, id));
}

function findRecord(records, idField, id) {
  return Array.isArray(records) ? records.find((record) => String(record?.[idField] || "") === id) : null;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
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
