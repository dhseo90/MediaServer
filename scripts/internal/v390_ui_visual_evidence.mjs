// 파일 용도: actual screenshot과 browser geometry/computed-style 측정값에서 visual PASS/FAIL을 계산한다.

import crypto from "node:crypto";
import fs from "node:fs";

export const visualEvidenceSchema = "media-server.ui-visual-baseline-diff.v2";
export const browserMeasurementSchema = "media-server.ui-browser-visual-measurement.v1";
export const requiredResponsiveWidths = [320, 390, 760, 1180];
export const requiredThemes = ["light", "dark"];

export function evaluateVisualArtifact({
  screenshotPath,
  measurement,
  caseId,
  correlationId,
  expectedViewport,
  expectedTheme,
  requireVideoOverlay = false,
}) {
  const failures = [];
  assert(measurement?.schema === browserMeasurementSchema, "browser visual measurement schema mismatch");
  const png = readPngDimensions(screenshotPath);
  const screenshotSha256 = sha256File(screenshotPath);
  const measurementSha256 = sha256Text(stableStringify(measurement));
  const viewport = measurement.viewport || {};
  if (viewport.width !== expectedViewport?.width || viewport.height !== expectedViewport?.height) failures.push("viewport-observation-mismatch");
  if (measurement.theme !== expectedTheme) failures.push("theme-observation-mismatch");
  const dpr = Number(viewport.devicePixelRatio || 1);
  if (png.width !== Math.round(viewport.width * dpr) || png.height !== Math.round(viewport.height * dpr)) {
    failures.push("screenshot-viewport-dimension-mismatch");
  }
  if (png.width <= 1 || png.height <= 1) failures.push("placeholder-or-empty-screenshot");

  const documentGeometry = measurement.document || {};
  const targetRect = measurement.target?.rect;
  const horizontalOverflowPx = Math.max(0, Number(documentGeometry.scrollWidth || 0) - Number(documentGeometry.clientWidth || 0));
  const verticalOverflowPx = Math.max(0, Number(documentGeometry.scrollHeight || 0) - Number(documentGeometry.clientHeight || 0));
  const targetClipped = !measurement.target?.visible || !targetRect || targetRect.left < -1 || targetRect.top < -1 ||
    targetRect.right > Number(viewport.width || 0) + 1 || targetRect.bottom > Number(viewport.height || 0) + 1;
  if (horizontalOverflowPx > 1) failures.push("horizontal-overflow");
  if (targetClipped) failures.push("target-clipped");

  const contrastSamples = (measurement.textSamples || []).map(item => ({
    ratio: contrastRatio(parseColor(item.foreground), parseColor(item.background)),
    fontSizePx: Number(item.fontSizePx || 0),
    fontWeight: String(item.fontWeight || ""),
  })).filter(item => Number.isFinite(item.ratio));
  if (contrastSamples.length === 0) failures.push("contrast-samples-missing");
  const failingContrast = contrastSamples.filter(item => item.ratio + 1e-6 < contrastThreshold(item));
  if (failingContrast.length > 0) failures.push("contrast-threshold-failed");

  const focusSamples = measurement.focusSamples || [];
  const visibleFocus = focusSamples.filter(item => item.visible === true && hasVisibleFocusIndicator(item));
  const uniqueFocusOrder = new Set(focusSamples.filter(item => item.visible === true).map(item => `${item.tag}:${item.id}:${item.testId}`));
  if (focusSamples.length === 0 || visibleFocus.length === 0) failures.push("focus-visible-missing");
  if (uniqueFocusOrder.size !== focusSamples.filter(item => item.visible === true).length) failures.push("focus-order-repeated");

  const videos = measurement.videos || [];
  const overlays = measurement.overlays || [];
  const readyVideos = videos.filter(item => item.readyState >= 2 && item.videoWidth > 0 && item.videoHeight > 0 && rectInsideViewport(item.rect, viewport));
  const containedOverlays = overlays.filter(overlay => readyVideos.some(video => rectContained(overlay.rect, video.rect)));
  if (requireVideoOverlay && readyVideos.length === 0) failures.push("video-not-ready-or-clipped");
  if (requireVideoOverlay && containedOverlays.length === 0) failures.push("overlay-missing-or-outside-video");

  const status = failures.length === 0 ? "PASS" : "FAIL";
  return {
    schema: visualEvidenceSchema,
    status,
    reviewRequired: status !== "PASS",
    caseId,
    correlationId,
    screenshotSha256,
    screenshot: { path: screenshotPath, sha256: screenshotSha256, width: png.width, height: png.height },
    measurement: { schema: measurement.schema, sha256: measurementSha256 },
    observed: { route: measurement.route, viewport, theme: measurement.theme },
    metrics: {
      geometry: { horizontalOverflowPx, verticalOverflowPx, targetClipped },
      contrast: { sampleCount: contrastSamples.length, failingCount: failingContrast.length, minimumRatio: minimum(contrastSamples.map(item => item.ratio)) },
      focus: { sampleCount: focusSamples.length, visibleIndicatorCount: visibleFocus.length, uniqueOrderCount: uniqueFocusOrder.size },
      videoOverlay: { required: requireVideoOverlay, videoCount: videos.length, readyVideoCount: readyVideos.length, overlayCount: overlays.length, containedOverlayCount: containedOverlays.length },
    },
    failures,
  };
}

export function evaluateVisualMatrix(probes) {
  assert(Array.isArray(probes), "visual matrix probes are required");
  const observedVariants = probes.map(item => `${item.payload?.observed?.viewport?.width}:${item.payload?.observed?.theme}`);
  const requiredVariants = requiredResponsiveWidths.flatMap(width => requiredThemes.map(theme => `${width}:${theme}`));
  const missingVariants = requiredVariants.filter(value => !observedVariants.includes(value));
  const duplicateVariants = observedVariants.filter((value, index, all) => all.indexOf(value) !== index);
  const failedProbes = probes.filter(item => item.payload?.status !== "PASS").map(item => item.id);
  const roles = new Set(probes.map(item => item.role).filter(Boolean));
  const hasVideoOverlay = probes.some(item => item.payload?.metrics?.videoOverlay?.required === true &&
    item.payload.metrics.videoOverlay.readyVideoCount > 0 && item.payload.metrics.videoOverlay.containedOverlayCount > 0);
  const status = missingVariants.length === 0 && duplicateVariants.length === 0 && failedProbes.length === 0 ? "PASS" : "FAIL";
  return {
    schema: "media-server.ui-visual-cross-cutting-matrix.v1",
    status,
    reviewRequired: status !== "PASS",
    requiredVariants,
    observedVariants,
    missingVariants,
    duplicateVariants: [...new Set(duplicateVariants)],
    failedProbes,
    roles: [...roles].sort(),
    hasVideoOverlay,
    inputEvidenceSha256: sha256Text(stableStringify(probes.map(item => ({
      id: item.id,
      role: item.role,
      screenshotSha256: item.payload?.screenshotSha256,
      measurementSha256: item.payload?.measurement?.sha256,
      status: item.payload?.status,
    })))),
  };
}

function readPngDimensions(filePath) {
  const bytes = fs.readFileSync(filePath);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  assert(bytes.length >= 24 && bytes.subarray(0, 8).equals(signature), "screenshot is not a PNG");
  assert(bytes.subarray(12, 16).toString("ascii") === "IHDR", "PNG IHDR is missing");
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  assert(width > 0 && height > 0, "PNG dimensions are invalid");
  return { width, height };
}

function parseColor(value) {
  const match = String(value || "").match(/^rgba?\(\s*([0-9.]+)[, ]+([0-9.]+)[, ]+([0-9.]+)(?:\s*[,/]\s*([0-9.]+))?\s*\)$/i);
  if (!match) return null;
  const alpha = match[4] === undefined ? 1 : Number(match[4]);
  if (alpha < 0.99) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function contrastRatio(foreground, background) {
  if (!foreground || !background) return Number.NaN;
  const lhs = luminance(foreground);
  const rhs = luminance(background);
  return (Math.max(lhs, rhs) + 0.05) / (Math.min(lhs, rhs) + 0.05);
}

function luminance(rgb) {
  const values = rgb.map(value => {
    const normalized = Math.max(0, Math.min(255, value)) / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });
  return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
}

function contrastThreshold(sample) {
  const weight = Number.parseInt(sample.fontWeight, 10) || 400;
  const large = sample.fontSizePx >= 24 || (sample.fontSizePx >= 18.66 && weight >= 700);
  return large ? 3 : 4.5;
}

function hasVisibleFocusIndicator(item) {
  const outlineWidth = Number.parseFloat(item.outlineWidth || "0");
  const outline = item.outlineStyle && item.outlineStyle !== "none" && outlineWidth > 0;
  const shadow = item.boxShadow && item.boxShadow !== "none";
  return Boolean(outline || shadow);
}

function rectInsideViewport(rect, viewport) {
  return Boolean(rect && rect.left >= -1 && rect.top >= -1 && rect.right <= viewport.width + 1 && rect.bottom <= viewport.height + 1);
}

function rectContained(inner, outer) {
  return Boolean(inner && outer && inner.left >= outer.left - 1 && inner.top >= outer.top - 1 && inner.right <= outer.right + 1 && inner.bottom <= outer.bottom + 1);
}

function minimum(values) {
  return values.length > 0 ? Math.min(...values) : null;
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function sha256Text(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
