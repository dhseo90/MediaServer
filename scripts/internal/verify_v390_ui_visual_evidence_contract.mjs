#!/usr/bin/env node
// 파일 용도: 대표 route 10개×viewport/theme 8개와 /client/live 영상 증거의 positive/negative 계약을 검증한다.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

import {
  browserMeasurementSchema,
  evaluateVisualArtifact,
  evaluateVisualMatrix,
  expandVisualMatrixPlan,
  validateVisualMatrixPlan,
  visualMatrixSchema,
} from "./v390_ui_visual_evidence.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const tempRoot = path.join(rootDir, ".tmp-v390-visual-contract");
const plan = readJson("test/fixtures/v390_ui_visual_matrix_plan.json");
const canonical = readJson("test/fixtures/ui_fulltest_case_manifest_policy_v4.json");
const native = readJson("test/fixtures/v390_ui_native_exact_cases.json");
const checks = [];
cleanup();
fs.mkdirSync(tempRoot, { recursive: true });
process.on("exit", cleanup);

check("대표 route plan은 canonical/native 10개 화면과 80개 조합에 결속된다", () => {
  const result = validateVisualMatrixPlan({ plan, canonical, native });
  assert(result.screenCount === 10, "representative screen count drift");
  assert(result.variantCount === 80, "visual variant count drift");
  assert(result.liveVariantCount === 8, "client/live variant count drift");
  assert(result.planSha256.length === 64, "plan digest missing");
});

check("malformed explicit regex는 browser 실행 전 digest-bound context로 거부된다", () => {
  const malformed = structuredClone(plan);
  malformed.liveVideoProbe.session.pathPattern = "[fixture-secret";
  let error = "";
  try { validateVisualMatrixPlan({ plan: malformed, canonical, native }); }
  catch (caught) { error = String(caught?.message || caught); }
  assert(error.includes("EXPLICIT_REGEX_COMPILE_INVALID") &&
    error.includes("case=CLIENT-019") &&
    error.includes("action=live-session-request") &&
    error.includes("phase=visual-plan-preflight") &&
    error.includes("callsite=v390_ui_visual_evidence:live-session-path") &&
    /patternDigest=[0-9a-f]{64}/.test(error) &&
    !error.includes("[fixture-secret"),
  `malformed explicit regex did not fail closed with safe context: ${error}`);
});

check("10 route×4 viewport×2 theme matrix만 exact PASS한다", () => {
  const probes = expandVisualMatrixPlan(plan).map((variant, index) => makeProbe(variant, index));
  const matrix = evaluateVisualMatrix(probes, { plan, canonical, native });
  assert(matrix.schema === visualMatrixSchema && matrix.status === "PASS", JSON.stringify(matrix));
  assert(matrix.requiredVariants.length === 80 && matrix.observedVariants.length === 80, "80-case matrix incomplete");
  assert(matrix.routeCount === 10 && matrix.liveVideoVariantCount === 8, "route/live counts drift");

  const missing = evaluateVisualMatrix(probes.slice(1), { plan, canonical, native });
  assert(missing.status === "FAIL" && missing.missingVariants.length === 1, "missing route variant passed");
  const duplicate = evaluateVisualMatrix([...probes, probes[0]], { plan, canonical, native });
  assert(duplicate.status === "FAIL" && duplicate.duplicateVariants.length === 1, "duplicate route variant passed");
});

check("case/route/role/target와 실제 적용 theme drift는 거부된다", () => {
  const variant = expandVisualMatrixPlan(plan)[0];
  const routeDrift = makeProbe(variant, 101, value => { value.route = "/ops/dashboard"; });
  assert(routeDrift.payload.failures.includes("screen-route-observation-mismatch"), "route drift passed");
  const themeDrift = makeProbe(variant, 102, value => { value.appliedTheme = variant.theme === "light" ? "dark" : "light"; });
  assert(themeDrift.payload.failures.includes("applied-theme-observation-mismatch"), "applied theme drift passed");
  const targetDrift = makeProbe(variant, 103, value => { value.target.selector = "body"; });
  assert(targetDrift.payload.failures.includes("target-selector-observation-mismatch"), "target selector drift passed");
  const roleDrift = makeProbe(variant, 104, value => { value.accountRole = "viewer"; });
  assert(roleDrift.payload.failures.includes("account-role-observation-mismatch"), "role drift passed");
});

check("빈 단색 PNG, clipping, 저대비, focus 누락은 계산된 FAIL이다", () => {
  const variant = expandVisualMatrixPlan(plan).find(item => item.screenId === "ops-home" && item.width === 390 && item.theme === "light");
  const blank = makeProbe(variant, 201, null, { blank: true });
  assert(blank.payload.failures.includes("blank-or-low-information-screenshot"), "blank screenshot passed");
  const clipping = makeProbe(variant, 202, value => { value.document.scrollWidth = 500; });
  assert(clipping.payload.failures.includes("horizontal-overflow"), "horizontal clipping passed");
  const contrast = makeProbe(variant, 203, value => {
    value.textSamples[0] = { foreground: "rgb(120, 120, 120)", background: "rgb(130, 130, 130)", fontSizePx: 14, fontWeight: "400" };
  });
  assert(contrast.payload.failures.includes("contrast-threshold-failed"), "low contrast passed");
  const focus = makeProbe(variant, 204, value => { value.focusSamples = []; });
  assert(focus.payload.failures.includes("focus-visible-missing"), "missing focus passed");
});

check("client/live는 동일 tile의 VA session·live frame·contain·control 증거를 모든 8개 조합에서 요구한다", () => {
  const liveVariant = expandVisualMatrixPlan(plan).find(item => item.screenId === "client-live" && item.width === 390 && item.theme === "dark");
  const valid = makeProbe(liveVariant, 301);
  assert(valid.payload.status === "PASS", valid.payload.failures.join(","));
  const genericOverlay = makeProbe(liveVariant, 302, value => {
    value.liveVideo.mode.active = false;
    value.liveVideo.genericDomOverlays = [{ selector: "[data-testid=client-live-tile-info-overlay]", visible: true }];
  });
  assert(genericOverlay.payload.failures.includes("va-overlay-mode-not-active"), "generic overlay masquerade passed");
  const rawSession = makeProbe(liveVariant, 303, value => { value.liveVideo.session.requestBody.overlayMode = "raw"; });
  assert(rawSession.payload.failures.includes("va-overlay-session-request-mismatch"), "raw session passed");
  const stalled = makeProbe(liveVariant, 304, value => {
    value.liveVideo.playback.currentTimeAfter = value.liveVideo.playback.currentTimeBefore;
    value.liveVideo.playback.presentedFramesAfter = value.liveVideo.playback.presentedFramesBefore;
  });
  assert(stalled.payload.failures.includes("video-frame-progress-missing"), "stalled video passed");
  const cropped = makeProbe(liveVariant, 305, value => { value.liveVideo.rendering.objectFit = "cover"; });
  assert(cropped.payload.failures.includes("video-object-fit-mismatch"), "cropped video passed");
  const wrongTile = makeProbe(liveVariant, 306, value => { value.liveVideo.mode.tileIdentity = "tile-1:view-a"; });
  assert(wrongTile.payload.failures.includes("live-video-tile-identity-mismatch"), "mixed tile evidence passed");
  const clippedControl = makeProbe(liveVariant, 307, value => { value.liveVideo.controls[0].rect.right = liveVariant.width + 40; });
  assert(clippedControl.payload.failures.includes("live-video-controls-clipped"), "clipped controls passed");
  const wrongViewSession = makeProbe(liveVariant, 308, value => {
    value.liveVideo.session.requestPath = "/client/api/views/view-b/webrtc/session";
    value.liveVideo.session.answerPath = "/client/api/views/view-b/webrtc/session/session-a/answer";
  });
  assert(wrongViewSession.payload.failures.includes("va-overlay-session-view-mismatch"), "different-view session disguised as current tile passed");
  const wrongAnswerSession = makeProbe(liveVariant, 309, value => {
    value.liveVideo.session.answerPath = "/client/api/views/view-a/webrtc/session/session-b/answer";
  });
  assert(wrongAnswerSession.payload.failures.includes("va-overlay-session-id-mismatch"), "different answer session passed");
});

check("legacy 8-probe width/theme-only matrix는 80-probe current matrix를 대체하지 못한다", () => {
  const legacy = [320, 390, 760, 1180].flatMap((width, index) => ["light", "dark"].map((theme, themeIndex) => {
    const variant = { ...expandVisualMatrixPlan(plan)[0], width, theme };
    return makeProbe(variant, 400 + index * 2 + themeIndex);
  }));
  const result = evaluateVisualMatrix(legacy, { plan, canonical, native });
  assert(result.status === "FAIL" && result.missingVariants.length === 72, "legacy 8-probe matrix passed");
});

const failed = checks.filter(item => !item.ok);
for (const item of checks) console.log(`[${item.ok ? "pass" : "fail"}] ${item.name}${item.error ? `: ${item.error}` : ""}`);
console.log("\n== v3.9.0 representative visual matrix contract ==");
console.log(`- pass: ${checks.length - failed.length}`);
console.log(`- fail: ${failed.length}`);
console.log("- representativeScreens: 10");
console.log("- responsiveThemeVariants: 80");
console.log("- clientLiveVideoVariants: 8");
console.log("- actualBrowserUiFulltest: not-run-by-this-contract");
cleanup();
process.exit(failed.length === 0 ? 0 : 1);

function makeProbe(variant, seed, mutate = null, { blank = false } = {}) {
  const id = `visual-${variant.canonicalCaseId}-${variant.width}-${variant.theme}-${seed}`;
  const screenshotPath = path.join(tempRoot, `${id}.png`);
  fs.writeFileSync(screenshotPath, createPng(variant.width, variant.height, seed, blank));
  const measurement = makeMeasurement(variant);
  if (mutate) mutate(measurement);
  const payload = evaluateVisualArtifact({
    screenshotPath,
    measurement,
    caseId: id,
    correlationId: `corr-${id}`,
    expectedCase: variant,
    liveVideoSpec: variant.liveVideoRequired ? plan.liveVideoProbe : null,
  });
  return {
    id,
    canonicalCaseId: variant.canonicalCaseId,
    featureId: variant.featureId,
    screenId: variant.screenId,
    screenRoute: variant.screenRoute,
    role: variant.accountRole,
    width: variant.width,
    height: variant.height,
    theme: variant.theme,
    payload,
  };
}

function makeMeasurement(variant) {
  const targetRect = { left: 8, top: 8, right: variant.width - 8, bottom: 120, width: variant.width - 16, height: 112 };
  const measurement = {
    schema: browserMeasurementSchema,
    caseBinding: {
      canonicalCaseId: variant.canonicalCaseId,
      featureId: variant.featureId,
      screenId: variant.screenId,
      screenRoute: variant.screenRoute,
      accountRole: variant.accountRole,
      targetSelector: variant.targetSelector,
    },
    route: variant.screenRoute,
    accountRole: variant.accountRole,
    requestedTheme: variant.theme,
    appliedTheme: variant.theme,
    mediaTheme: variant.theme,
    viewport: { width: variant.width, height: variant.height, devicePixelRatio: 1 },
    document: { scrollWidth: variant.width, scrollHeight: variant.height, clientWidth: variant.width, clientHeight: variant.height },
    target: { selector: variant.targetSelector, visible: true, rect: targetRect },
    textSamples: [{ foreground: variant.theme === "dark" ? "rgb(255, 255, 255)" : "rgb(0, 0, 0)", background: variant.theme === "dark" ? "rgb(0, 0, 0)" : "rgb(255, 255, 255)", fontSizePx: 14, fontWeight: "400" }],
    focusSamples: [
      { index: 0, tag: "button", id: "a", testId: "", visible: true, outlineStyle: "solid", outlineWidth: "2px", boxShadow: "none" },
      { index: 1, tag: "a", id: "b", testId: "", visible: true, outlineStyle: "solid", outlineWidth: "2px", boxShadow: "none" }
    ],
    liveVideo: null,
  };
  if (variant.liveVideoRequired) measurement.liveVideo = makeLiveVideo(variant);
  return measurement;
}

function makeLiveVideo(variant) {
  const tileRect = { left: 8, top: 130, right: variant.width - 8, bottom: 730, width: variant.width - 16, height: 600 };
  const stageRect = { left: 8, top: 200, right: variant.width - 8, bottom: 650, width: variant.width - 16, height: 450 };
  const stageRatio = stageRect.width / stageRect.height;
  const contentWidth = stageRatio > 16 / 9 ? stageRect.height * 16 / 9 : stageRect.width;
  const contentHeight = stageRatio > 16 / 9 ? stageRect.height : stageRect.width * 9 / 16;
  const contentLeft = stageRect.left + (stageRect.width - contentWidth) / 2;
  const contentTop = stageRect.top + (stageRect.height - contentHeight) / 2;
  const contentRect = { left: contentLeft, top: contentTop, right: contentLeft + contentWidth, bottom: contentTop + contentHeight, width: contentWidth, height: contentHeight };
  const identity = "tile-0:view-a";
  return {
    tile: { selector: plan.liveVideoProbe.tileSelector, identity, viewId: "view-a", visible: true, rect: tileRect },
    stage: { selector: plan.liveVideoProbe.stageSelector, tileIdentity: identity, visible: true, rect: stageRect },
    video: { selector: plan.liveVideoProbe.videoSelector, tileIdentity: identity, visible: true, rect: stageRect },
    placeholder: { selector: plan.liveVideoProbe.placeholderSelector, tileIdentity: identity, hidden: true },
    modeControls: { selector: plan.liveVideoProbe.modeControlsSelector, tileIdentity: identity, visible: true },
    mode: { selector: plan.liveVideoProbe.modeSelector, tileIdentity: identity, active: true, value: "va-overlay" },
    session: {
      tileIdentity: identity,
      tileViewId: "view-a",
      requestViewId: "view-a",
      answerViewId: "view-a",
      correlationId: `visual-${variant.canonicalCaseId}-${variant.width}-${variant.theme}:live-session`,
      requestMethod: "POST",
      requestPath: "/client/api/views/view-a/webrtc/session",
      requestBody: { overlayMode: "va-overlay" },
      responseStatus: 200,
      sessionId: "session-a",
      responseSessionId: "session-a",
      answerSessionId: "session-a",
      offerReceived: true,
      answerMethod: "POST",
      answerPath: "/client/api/views/view-a/webrtc/session/session-a/answer",
      answerStatus: 200,
    },
    playback: {
      tileIdentity: identity,
      srcObject: true,
      liveVideoTracks: 1,
      readyState: 4,
      videoWidth: 1920,
      videoHeight: 1080,
      currentTimeBefore: 1,
      currentTimeAfter: 1.25,
      presentedFramesBefore: 10,
      presentedFramesAfter: 12,
    },
    rendering: { tileIdentity: identity, objectFit: "contain", stageRect, contentRect },
    controls: plan.liveVideoProbe.controlSelectors.map((selector, index) => ({
      selector,
      tileIdentity: identity,
      visible: true,
      rect: { left: 10 + index, top: 140, right: variant.width - 10, bottom: 190, width: variant.width - 20 - index, height: 50 },
    })),
    genericDomOverlays: [],
  };
}

function createPng(width, height, seed, blank) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const rowBytes = width * 4 + 1;
  const rows = Buffer.alloc(height * rowBytes);
  for (let y = 0; y < height; y += 1) {
    rows[y * rowBytes] = 0;
    for (let x = 0; x < width; x += 1) {
      const offset = y * rowBytes + 1 + x * 4;
      const band = blank ? 0 : ((x >> 4) + (y >> 4) + seed) % 5;
      rows[offset] = blank ? 32 : 30 + band * 35;
      rows[offset + 1] = blank ? 32 : 20 + ((band + seed) % 5) * 40;
      rows[offset + 2] = blank ? 32 : 40 + ((band + y) % 5) * 30;
      rows[offset + 3] = 255;
    }
  }
  return Buffer.concat([signature, chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(rows)), chunk("IEND", Buffer.alloc(0))]);
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const value = Buffer.alloc(data.length + 12);
  value.writeUInt32BE(data.length, 0);
  typeBytes.copy(value, 4);
  data.copy(value, 8);
  value.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), data.length + 8);
  return value;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const value of bytes) {
    crc ^= value;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), "utf8"));
}

function check(name, fn) {
  try { fn(); checks.push({ name, ok: true }); }
  catch (error) { checks.push({ name, ok: false, error: error instanceof Error ? error.message : String(error) }); }
}

function cleanup() {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
