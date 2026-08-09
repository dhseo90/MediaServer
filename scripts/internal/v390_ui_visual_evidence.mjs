// 파일 용도: actual screenshot과 route-aware browser 측정값에서 대표 visual matrix PASS/FAIL을 계산한다.

import crypto from "node:crypto";
import fs from "node:fs";
import zlib from "node:zlib";

export const visualEvidenceSchema = "media-server.ui-visual-baseline-diff.v3";
export const browserMeasurementSchema = "media-server.ui-browser-visual-measurement.v2";
export const visualMatrixPlanSchema = "media-server.v390-ui-visual-matrix-plan.v2";
export const visualMatrixSchema = "media-server.ui-visual-cross-cutting-matrix.v2";
export const requiredResponsiveWidths = Object.freeze([320, 390, 760, 1180]);
export const requiredThemes = Object.freeze(["light", "dark"]);
export const explicitRegexPatternSchema = "media-server.v390-explicit-regex-pattern.v1";

const liveSessionRegexContexts = Object.freeze({
  request: Object.freeze({
    caseId: "CLIENT-019",
    actionId: "live-session-request",
    phase: "visual-plan-preflight",
    callsite: "v390_ui_visual_evidence:live-session-path",
    flags: "u",
  }),
  answer: Object.freeze({
    caseId: "CLIENT-020",
    actionId: "live-session-answer",
    phase: "visual-plan-preflight",
    callsite: "v390_ui_visual_evidence:live-session-answer-path",
    flags: "u",
  }),
});

const requiredRepresentativeScreens = Object.freeze([
  ["ops-home", "UI-009", "/ops/home", "operator"],
  ["ops-dashboard", "UI-010", "/ops/dashboard", "operator"],
  ["ops-sources", "UI-011", "/ops/sources", "operator"],
  ["ops-rules", "UI-012", "/ops/rules", "operator"],
  ["ops-users", "UI-013", "/ops/users", "admin"],
  ["ops-events", "UI-014", "/ops/events", "operator"],
  ["ops-vlm", "UI-022", "/ops/vlm", "operator"],
  ["client-live", "UI-015", "/client/live", "viewer"],
  ["client-dashboard", "UI-016", "/client/dashboard", "viewer"],
  ["client-events", "UI-017", "/client/events", "viewer"],
]);
const requiredLiveObligations = Object.freeze([
  "MEDIA-016", "MEDIA-017", "CLIENT-019", "CLIENT-020", "CLIENT-021",
]);

export function validateVisualMatrixPlan({ plan, canonical, native }) {
  assert(plan?.schema === visualMatrixPlanSchema, "visual matrix plan schema mismatch");
  assert(plan.version === "3.9.0", "visual matrix plan version mismatch");
  assert(canonical?.schema === "media-server.ui-fulltest-canonical-case-manifest.v1", "canonical case manifest schema mismatch");
  assert(canonical.version === plan.version, "visual plan/canonical version mismatch");
  assert(native?.schema === "media-server.v390-ui-native-exact-cases.v2", "native exact manifest schema mismatch");
  assert(equalArray(plan.viewportMatrix?.widths, requiredResponsiveWidths), "visual matrix widths must be exact 320/390/760/1180");
  assert(Number.isInteger(plan.viewportMatrix?.height) && plan.viewportMatrix.height > 0, "visual matrix height is invalid");
  assert(equalArray(plan.viewportMatrix?.themes, requiredThemes), "visual matrix themes must be exact light/dark");
  assert(Array.isArray(plan.representativeScreens), "representative visual screens are required");
  assert(plan.representativeScreens.length === requiredRepresentativeScreens.length, "representative visual screen count mismatch");

  const canonicalById = new Map(canonical.cases.map(item => [item.testId, item]));
  const nativeById = new Map(native.cases.map(item => [item.caseId, item]));
  const observedScreenIds = new Set();
  const observedCaseIds = new Set();
  for (let index = 0; index < requiredRepresentativeScreens.length; index += 1) {
    const [screenId, canonicalCaseId, screenRoute, accountRole] = requiredRepresentativeScreens[index];
    const screen = plan.representativeScreens[index];
    assert(screen?.screenId === screenId, `representative screen order/id mismatch at ${screenId}`);
    assert(screen.canonicalCaseId === canonicalCaseId, `${screenId} canonical case mismatch`);
    assert(screen.featureId === canonicalCaseId, `${screenId} feature mismatch`);
    assert(screen.screenRoute === screenRoute, `${screenId} route mismatch`);
    assert(screen.accountRole === accountRole, `${screenId} role mismatch`);
    assert(typeof screen.targetSelector === "string" && screen.targetSelector.length > 0, `${screenId} visual target selector missing`);
    assert(!observedScreenIds.has(screen.screenId), `duplicate representative screen id: ${screen.screenId}`);
    assert(!observedCaseIds.has(screen.canonicalCaseId), `duplicate representative case id: ${screen.canonicalCaseId}`);
    observedScreenIds.add(screen.screenId);
    observedCaseIds.add(screen.canonicalCaseId);

    const canonicalCase = canonicalById.get(canonicalCaseId);
    const nativeCase = nativeById.get(canonicalCaseId);
    assert(canonicalCase, `${screenId} canonical case is missing`);
    assert(nativeCase, `${screenId} native exact case is missing`);
    assert(canonicalCase.featureId === screen.featureId && canonicalCase.route === screenRoute && canonicalCase.accountRole === accountRole,
      `${screenId} canonical case binding mismatch`);
    assert(nativeCase.featureId === screen.featureId && nativeCase.screenRoute === screenRoute && nativeCase.accountRole === accountRole,
      `${screenId} native exact case binding mismatch`);
  }

  const live = plan.liveVideoProbe;
  assert(live?.screenId === "client-live" && live.requiredEveryVariant === true, "client/live must require video evidence for every variant");
  assert(equalArray(live.requiredObligationIds, requiredLiveObligations), "client/live visual obligation set mismatch");
  for (const obligationId of requiredLiveObligations) {
    const canonicalCase = canonicalById.get(obligationId);
    const nativeCase = nativeById.get(obligationId);
    assert(canonicalCase?.featureId === obligationId && canonicalCase.route === "/client/live" && canonicalCase.accountRole === "viewer",
      `${obligationId} canonical live obligation mismatch`);
    assert(nativeCase?.featureId === obligationId && nativeCase.screenRoute === "/client/live" && nativeCase.accountRole === "viewer",
      `${obligationId} native live obligation mismatch`);
  }
  for (const field of ["tileSelector", "stageSelector", "videoSelector", "placeholderSelector", "modeControlsSelector", "modeActionSelector", "modeSelector"]) {
    assert(typeof live[field] === "string" && live[field].length > 0, `live visual ${field} missing`);
  }
  assert(Array.isArray(live.controlSelectors) && live.controlSelectors.length >= 5 &&
    new Set(live.controlSelectors).size === live.controlSelectors.length, "live visual control selector set mismatch");
  assert(live.session?.method === "POST" && live.session?.requiredRequestBody?.overlayMode === "va-overlay",
    "live VA session request contract mismatch");
  assert(live.session?.answerMethod === "POST", "live answer request contract mismatch");
  compilePattern(live.session.pathPattern, liveSessionRegexContexts.request);
  compilePattern(live.session.answerPathPattern, liveSessionRegexContexts.answer);
  assert(equalArray(live.session.allowedStatuses, [200]), "live session allowed status mismatch");
  assert(equalArray(live.session.answerAllowedStatuses, [200, 204]), "live answer allowed status mismatch");
  assert(live.rendering?.objectFit === "contain" && live.rendering?.requireLiveTrack === true &&
    live.rendering?.requirePresentedFrameProgress === true && live.rendering?.requirePlaceholderHidden === true &&
    live.rendering?.requireControlsContained === true, "live rendering requirements mismatch");

  const variants = expandVisualMatrixPlan(plan);
  assert(variants.length === 80, "visual matrix expansion must contain exactly 80 variants");
  const variantKeys = variants.map(visualVariantKey);
  assert(new Set(variantKeys).size === variantKeys.length, "visual matrix plan contains duplicate variants");
  const liveVariantCount = variants.filter(item => item.liveVideoRequired).length;
  assert(liveVariantCount === 8, "client/live visual matrix must contain exactly 8 variants");
  return {
    screenCount: plan.representativeScreens.length,
    variantCount: variants.length,
    liveVariantCount,
    planSha256: sha256Text(stableStringify(plan)),
  };
}

export function expandVisualMatrixPlan(plan) {
  assert(plan?.schema === visualMatrixPlanSchema, "visual matrix plan schema mismatch");
  const widths = plan.viewportMatrix?.widths;
  const height = plan.viewportMatrix?.height;
  const themes = plan.viewportMatrix?.themes;
  assert(Array.isArray(plan.representativeScreens) && Array.isArray(widths) && Array.isArray(themes), "visual matrix plan is incomplete");
  return plan.representativeScreens.flatMap(screen => widths.flatMap(width => themes.map(theme => ({
    screenId: screen.screenId,
    canonicalCaseId: screen.canonicalCaseId,
    featureId: screen.featureId,
    screenRoute: screen.screenRoute,
    accountRole: screen.accountRole,
    targetSelector: screen.targetSelector,
    width,
    height,
    theme,
    liveVideoRequired: screen.screenId === plan.liveVideoProbe?.screenId && plan.liveVideoProbe?.requiredEveryVariant === true,
  }))));
}

export function evaluateVisualArtifact({
  screenshotPath,
  measurement,
  caseId,
  correlationId,
  expectedCase = null,
  expectedViewport = null,
  expectedTheme = "",
  liveVideoSpec = null,
  requireVideoOverlay = false,
}) {
  const failures = [];
  assert(measurement?.schema === browserMeasurementSchema, "browser visual measurement schema mismatch");
  const expected = expectedCase || {
    canonicalCaseId: measurement.caseBinding?.canonicalCaseId || caseId,
    featureId: measurement.caseBinding?.featureId || caseId,
    screenId: measurement.caseBinding?.screenId || caseId,
    screenRoute: measurement.route,
    accountRole: measurement.accountRole,
    targetSelector: measurement.target?.selector,
    width: expectedViewport?.width,
    height: expectedViewport?.height,
    theme: expectedTheme,
    liveVideoRequired: requireVideoOverlay,
  };
  let png;
  try {
    png = analyzePng(screenshotPath);
  } catch {
    failures.push("screenshot-decode-failed");
    png = readPngHeaderFailClosed(screenshotPath);
  }
  const screenshotSha256 = sha256File(screenshotPath);
  const measurementSha256 = sha256Text(stableStringify(measurement));
  const viewport = measurement.viewport || {};
  const binding = measurement.caseBinding || {};
  if (binding.canonicalCaseId !== expected.canonicalCaseId || binding.featureId !== expected.featureId || binding.screenId !== expected.screenId) {
    failures.push("case-binding-observation-mismatch");
  }
  if (binding.screenRoute !== expected.screenRoute || measurement.route !== expected.screenRoute) failures.push("screen-route-observation-mismatch");
  if (binding.accountRole !== expected.accountRole || measurement.accountRole !== expected.accountRole) failures.push("account-role-observation-mismatch");
  if (binding.targetSelector !== expected.targetSelector || measurement.target?.selector !== expected.targetSelector) failures.push("target-selector-observation-mismatch");
  if (viewport.width !== expected.width || viewport.height !== expected.height) failures.push("viewport-observation-mismatch");
  if (measurement.requestedTheme !== expected.theme) failures.push("requested-theme-observation-mismatch");
  if (measurement.appliedTheme !== expected.theme) failures.push("applied-theme-observation-mismatch");
  const dpr = Number(viewport.devicePixelRatio || 1);
  if (png.width !== Math.round(Number(viewport.width || 0) * dpr) || png.height !== Math.round(Number(viewport.height || 0) * dpr)) {
    failures.push("screenshot-viewport-dimension-mismatch");
  }
  if (png.lowInformation) failures.push("blank-or-low-information-screenshot");

  const documentGeometry = measurement.document || {};
  const targetRect = measurement.target?.rect;
  const horizontalOverflowPx = Math.max(0, Number(documentGeometry.scrollWidth || 0) - Number(documentGeometry.clientWidth || 0));
  const verticalOverflowPx = Math.max(0, Number(documentGeometry.scrollHeight || 0) - Number(documentGeometry.clientHeight || 0));
  const targetClipped = !measurement.target?.visible || (measurement.target?.documentTarget === true
    ? !rectIntersectsViewport(targetRect, viewport)
    : !rectInsideViewport(targetRect, viewport));
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
  const focusApplicable = measurement.focus?.applicable === true;
  const focusableCount = Number(measurement.focus?.focusableCount ?? -1);
  const visibleFocus = focusSamples.filter(item => item.visible === true && hasVisibleFocusIndicator(item));
  const visibleFocusSamples = focusSamples.filter(item => item.visible === true);
  const focusIdentities = visibleFocusSamples.map(item => String(item.focusIdentity || ""));
  const uniqueFocusOrder = new Set(focusIdentities);
  if (focusableCount < 0 || (focusApplicable && focusableCount === 0) ||
      (!focusApplicable && focusableCount !== 0)) failures.push("focus-applicability-invalid");
  if (focusApplicable && (focusSamples.length === 0 || visibleFocus.length === 0)) failures.push("focus-visible-missing");
  if (focusApplicable && focusIdentities.some(identity => identity.length === 0)) failures.push("focus-owner-identity-missing");
  if (focusApplicable && uniqueFocusOrder.size !== visibleFocusSamples.length) failures.push("focus-order-repeated");

  const liveRequired = Boolean(expected.liveVideoRequired || liveVideoSpec || requireVideoOverlay);
  const liveMetrics = evaluateLiveVideoEvidence({
    liveVideo: measurement.liveVideo,
    spec: liveVideoSpec,
    viewport,
    required: liveRequired,
    failures,
  });

  const status = failures.length === 0 ? "PASS" : "FAIL";
  return {
    schema: visualEvidenceSchema,
    status,
    reviewRequired: status !== "PASS",
    caseId,
    correlationId,
    binding: {
      canonicalCaseId: expected.canonicalCaseId,
      featureId: expected.featureId,
      screenId: expected.screenId,
      screenRoute: expected.screenRoute,
      accountRole: expected.accountRole,
      targetSelector: expected.targetSelector,
    },
    screenshotSha256,
    screenshot: {
      path: screenshotPath,
      sha256: screenshotSha256,
      width: png.width,
      height: png.height,
      sampledPixels: png.sampledPixels,
      distinctSampledColors: png.distinctSampledColors,
      luminanceRange: png.luminanceRange,
      opaqueRatio: png.opaqueRatio,
    },
    measurement: { schema: measurement.schema, sha256: measurementSha256 },
    observed: {
      route: measurement.route,
      accountRole: measurement.accountRole,
      viewport,
      requestedTheme: measurement.requestedTheme,
      appliedTheme: measurement.appliedTheme,
      mediaTheme: measurement.mediaTheme,
      theme: measurement.appliedTheme,
      targetSelector: measurement.target?.selector,
    },
    metrics: {
      geometry: { horizontalOverflowPx, verticalOverflowPx, targetClipped },
      contrast: { sampleCount: contrastSamples.length, failingCount: failingContrast.length, minimumRatio: minimum(contrastSamples.map(item => item.ratio)) },
      focus: { applicable: focusApplicable, focusableCount, sampleCount: focusSamples.length, visibleIndicatorCount: visibleFocus.length, uniqueOrderCount: uniqueFocusOrder.size },
      liveVideo: liveMetrics,
      videoOverlay: {
        required: liveRequired,
        readyVideoCount: liveMetrics.playbackReady ? 1 : 0,
        containedOverlayCount: liveMetrics.vaOverlaySessionBound ? 1 : 0,
      },
    },
    failures,
  };
}

export function evaluateVisualMatrix(probes, { plan, canonical, native } = {}) {
  assert(Array.isArray(probes), "visual matrix probes are required");
  const validation = validateVisualMatrixPlan({ plan, canonical, native });
  const required = expandVisualMatrixPlan(plan);
  const requiredVariants = required.map(visualVariantKey);
  const requiredSet = new Set(requiredVariants);
  const observedVariants = probes.map(probeVariantKey);
  const observedCountByKey = new Map();
  for (const key of observedVariants) observedCountByKey.set(key, (observedCountByKey.get(key) || 0) + 1);
  const missingVariants = requiredVariants.filter(value => !observedCountByKey.has(value));
  const duplicateVariants = [...observedCountByKey.entries()].filter(([, count]) => count > 1).map(([key]) => key).sort();
  const unexpectedVariants = [...observedCountByKey.keys()].filter(key => !requiredSet.has(key)).sort();
  const metadataDrift = probes.filter(probe => !probeMetadataMatchesPayload(probe)).map(item => item.id);
  const failedProbes = probes.filter(item => item.payload?.status !== "PASS").map(item => item.id);
  const roles = new Set(probes.map(item => item.role).filter(Boolean));
  const routeIds = new Set(probes.filter(item => requiredSet.has(probeVariantKey(item))).map(item => item.screenId));
  const liveVideoProbes = probes.filter(item => item.payload?.metrics?.liveVideo?.required === true);
  const passingLiveVideoProbes = liveVideoProbes.filter(item => item.payload?.status === "PASS" &&
    item.payload.metrics.liveVideo.vaOverlaySessionBound === true && item.payload.metrics.liveVideo.playbackReady === true);
  const status = probes.length === requiredVariants.length && missingVariants.length === 0 && duplicateVariants.length === 0 &&
    unexpectedVariants.length === 0 && metadataDrift.length === 0 && failedProbes.length === 0 &&
    routeIds.size === plan.representativeScreens.length && passingLiveVideoProbes.length === 8 ? "PASS" : "FAIL";
  return {
    schema: visualMatrixSchema,
    status,
    reviewRequired: status !== "PASS",
    matrixPlanSha256: validation.planSha256,
    requiredVariants,
    observedVariants,
    missingVariants,
    duplicateVariants,
    unexpectedVariants,
    metadataDrift,
    failedProbes,
    roles: [...roles].sort(),
    routeCount: routeIds.size,
    liveVideoVariantCount: passingLiveVideoProbes.length,
    hasVideoOverlay: passingLiveVideoProbes.length === 8,
    inputEvidenceSha256: sha256Text(stableStringify(probes.map(item => ({
      id: item.id,
      canonicalCaseId: item.canonicalCaseId,
      featureId: item.featureId,
      screenId: item.screenId,
      screenRoute: item.screenRoute,
      role: item.role,
      width: item.width,
      height: item.height,
      theme: item.theme,
      screenshotSha256: item.payload?.screenshotSha256,
      measurementSha256: item.payload?.measurement?.sha256,
      status: item.payload?.status,
    })))),
  };
}

function evaluateLiveVideoEvidence({ liveVideo, spec, viewport, required, failures }) {
  const metrics = {
    required,
    sameTileIdentity: false,
    vaOverlaySessionBound: false,
    playbackReady: false,
    frameProgress: false,
    contentContained: false,
    controlCount: 0,
    containedControlCount: 0,
  };
  if (!required) return metrics;
  if (!spec || !liveVideo) {
    failures.push("live-video-evidence-missing");
    return metrics;
  }
  const tileIdentity = liveVideo.tile?.identity;
  const identities = [
    liveVideo.stage?.tileIdentity,
    liveVideo.video?.tileIdentity,
    liveVideo.placeholder?.tileIdentity,
    liveVideo.modeControls?.tileIdentity,
    liveVideo.mode?.tileIdentity,
    liveVideo.session?.tileIdentity,
    liveVideo.playback?.tileIdentity,
    liveVideo.rendering?.tileIdentity,
    ...(liveVideo.controls || []).map(item => item.tileIdentity),
  ];
  metrics.sameTileIdentity = typeof tileIdentity === "string" && tileIdentity.length > 0 && identities.every(value => value === tileIdentity);
  if (!metrics.sameTileIdentity) failures.push("live-video-tile-identity-mismatch");
  const selectorPairs = [
    [liveVideo.tile?.selector, spec.tileSelector],
    [liveVideo.stage?.selector, spec.stageSelector],
    [liveVideo.video?.selector, spec.videoSelector],
    [liveVideo.placeholder?.selector, spec.placeholderSelector],
    [liveVideo.modeControls?.selector, spec.modeControlsSelector],
    [liveVideo.mode?.selector, spec.modeSelector],
  ];
  if (selectorPairs.some(([actual, expected]) => actual !== expected)) failures.push("live-video-selector-binding-mismatch");
  if (liveVideo.tile?.visible !== true || !rectInsideViewport(liveVideo.tile?.rect, viewport) ||
      liveVideo.stage?.visible !== true || liveVideo.video?.visible !== true) failures.push("live-video-tile-or-stage-clipped");
  if (liveVideo.modeControls?.visible !== true) failures.push("va-overlay-controls-missing");
  if (liveVideo.mode?.active !== true || liveVideo.mode?.value !== "va-overlay") failures.push("va-overlay-mode-not-active");
  if (spec.rendering.requirePlaceholderHidden && liveVideo.placeholder?.hidden !== true) failures.push("live-video-placeholder-visible");

  const session = liveVideo.session || {};
  const sessionPathOk = matchesPattern(
    session.requestPath,
    spec.session.pathPattern,
    liveSessionRegexContexts.request,
  );
  const sessionPathBinding = parseLiveSessionRequestPath(session.requestPath);
  const answerPathBinding = parseLiveSessionAnswerPath(session.answerPath);
  const tileViewId = String(liveVideo.tile?.viewId || "");
  const viewBindingOk = tileViewId.length > 0 && session.tileViewId === tileViewId &&
    session.requestViewId === tileViewId && session.answerViewId === tileViewId &&
    sessionPathBinding?.viewId === tileViewId && answerPathBinding?.viewId === tileViewId;
  if (!viewBindingOk) failures.push("va-overlay-session-view-mismatch");
  const sessionIdBindingOk = typeof session.responseSessionId === "string" && session.responseSessionId.length > 0 &&
    session.sessionId === session.responseSessionId && session.answerSessionId === session.responseSessionId &&
    answerPathBinding?.sessionId === session.responseSessionId;
  if (!sessionIdBindingOk) failures.push("va-overlay-session-id-mismatch");
  const requestOk = session.requestMethod === spec.session.method && sessionPathOk &&
    session.requestBody?.overlayMode === spec.session.requiredRequestBody.overlayMode &&
    spec.session.allowedStatuses.includes(session.responseStatus) && viewBindingOk && sessionIdBindingOk &&
    session.offerReceived === true && typeof session.correlationId === "string" && session.correlationId.length > 0;
  if (!requestOk) failures.push("va-overlay-session-request-mismatch");
  const answerOk = session.answerMethod === spec.session.answerMethod &&
    matchesPattern(
      session.answerPath,
      spec.session.answerPathPattern,
      liveSessionRegexContexts.answer,
    ) && viewBindingOk && sessionIdBindingOk &&
    spec.session.answerAllowedStatuses.includes(session.answerStatus);
  if (!answerOk) failures.push("va-overlay-session-answer-mismatch");
  metrics.vaOverlaySessionBound = requestOk && answerOk && metrics.sameTileIdentity && liveVideo.mode?.active === true;

  const playback = liveVideo.playback || {};
  metrics.playbackReady = playback.srcObject === true && Number(playback.liveVideoTracks || 0) > 0 &&
    Number(playback.readyState || 0) >= 2 && Number(playback.videoWidth || 0) > 0 && Number(playback.videoHeight || 0) > 0;
  if (!metrics.playbackReady) failures.push("video-not-ready-or-live");
  metrics.frameProgress = Number(playback.currentTimeAfter || 0) > Number(playback.currentTimeBefore || 0) &&
    Number(playback.presentedFramesAfter || 0) > Number(playback.presentedFramesBefore || 0);
  if (spec.rendering.requirePresentedFrameProgress && !metrics.frameProgress) failures.push("video-frame-progress-missing");

  const rendering = liveVideo.rendering || {};
  if (rendering.objectFit !== spec.rendering.objectFit) failures.push("video-object-fit-mismatch");
  metrics.contentContained = rectContained(rendering.contentRect, rendering.stageRect) &&
    rectContained(rendering.stageRect, liveVideo.tile?.rect) && rectInsideViewport(rendering.contentRect, viewport);
  if (!metrics.contentContained) failures.push("video-content-cropped-or-outside-stage");
  const intrinsicRatio = Number(playback.videoWidth || 0) / Number(playback.videoHeight || 0);
  const contentRatio = Number(rendering.contentRect?.width || 0) / Number(rendering.contentRect?.height || 0);
  if (!Number.isFinite(intrinsicRatio) || !Number.isFinite(contentRatio) || Math.abs(intrinsicRatio - contentRatio) > 0.03) {
    failures.push("video-content-aspect-mismatch");
  }

  const controls = Array.isArray(liveVideo.controls) ? liveVideo.controls : [];
  metrics.controlCount = controls.length;
  const controlsBySelector = new Map(controls.map(item => [item.selector, item]));
  const requiredControls = spec.controlSelectors.map(selector => controlsBySelector.get(selector));
  const exactControlSet = controls.length === spec.controlSelectors.length && requiredControls.every(Boolean);
  if (!exactControlSet) failures.push("live-video-control-set-mismatch");
  metrics.containedControlCount = requiredControls.filter(item => item?.visible === true &&
    rectInsideViewport(item.rect, viewport) && rectContained(item.rect, liveVideo.tile?.rect)).length;
  if (spec.rendering.requireControlsContained && metrics.containedControlCount !== spec.controlSelectors.length) {
    failures.push("live-video-controls-clipped");
  }
  return metrics;
}

function analyzePng(filePath) {
  const bytes = fs.readFileSync(filePath);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  assert(bytes.length >= 33 && bytes.subarray(0, 8).equals(signature), "screenshot is not a PNG");
  let offset = 8;
  let header = null;
  const idat = [];
  let sawIend = false;
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const end = offset + 12 + length;
    assert(end <= bytes.length, "PNG chunk is truncated");
    const typeBytes = bytes.subarray(offset + 4, offset + 8);
    const type = typeBytes.toString("ascii");
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    const expectedCrc = bytes.readUInt32BE(offset + 8 + length);
    assert(crc32(Buffer.concat([typeBytes, data])) === expectedCrc, `PNG ${type} CRC mismatch`);
    if (type === "IHDR") {
      assert(!header && length === 13, "PNG IHDR is invalid");
      header = {
        width: data.readUInt32BE(0),
        height: data.readUInt32BE(4),
        bitDepth: data[8],
        colorType: data[9],
        compression: data[10],
        filter: data[11],
        interlace: data[12],
      };
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") {
      assert(length === 0, "PNG IEND is invalid");
      sawIend = true;
      offset = end;
      break;
    }
    offset = end;
  }
  assert(header && header.width > 0 && header.height > 0 && sawIend && idat.length > 0 && offset === bytes.length,
    "PNG structure is incomplete");
  assert(header.bitDepth === 8 && header.compression === 0 && header.filter === 0 && header.interlace === 0,
    "PNG format is unsupported");
  const channels = new Map([[0, 1], [2, 3], [4, 2], [6, 4]]).get(header.colorType);
  assert(channels, "PNG color type is unsupported");
  const rowBytes = header.width * channels;
  const expectedBytes = header.height * (rowBytes + 1);
  assert(Number.isSafeInteger(expectedBytes) && expectedBytes <= 64 * 1024 * 1024, "PNG decoded size exceeds visual limit");
  const filtered = zlib.inflateSync(Buffer.concat(idat), { maxOutputLength: 64 * 1024 * 1024 });
  assert(filtered.length === expectedBytes, "PNG decoded length mismatch");
  const raw = unfilterPng(filtered, header.width, header.height, channels);
  const sampleStride = Math.max(1, Math.floor(Math.sqrt((header.width * header.height) / 4096)));
  const colors = new Set();
  let minimumLuminance = 1;
  let maximumLuminance = 0;
  let opaque = 0;
  let sampledPixels = 0;
  for (let y = 0; y < header.height; y += sampleStride) {
    for (let x = 0; x < header.width; x += sampleStride) {
      const pixel = pngPixel(raw, header.width, channels, header.colorType, x, y);
      sampledPixels += 1;
      if (pixel[3] >= 242) opaque += 1;
      colors.add(`${pixel[0] >> 3}:${pixel[1] >> 3}:${pixel[2] >> 3}:${pixel[3] >> 5}`);
      const value = luminance(pixel.slice(0, 3));
      minimumLuminance = Math.min(minimumLuminance, value);
      maximumLuminance = Math.max(maximumLuminance, value);
    }
  }
  const opaqueRatio = sampledPixels > 0 ? opaque / sampledPixels : 0;
  const luminanceRange = maximumLuminance - minimumLuminance;
  return {
    width: header.width,
    height: header.height,
    sampledPixels,
    distinctSampledColors: colors.size,
    luminanceRange,
    opaqueRatio,
    lowInformation: colors.size < 4 || luminanceRange < 0.01 || opaqueRatio < 0.1,
  };
}

function readPngHeaderFailClosed(filePath) {
  const bytes = fs.readFileSync(filePath);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const hasHeader = bytes.length >= 24 && bytes.subarray(0, 8).equals(signature) &&
    bytes.subarray(12, 16).toString("ascii") === "IHDR";
  return {
    width: hasHeader ? bytes.readUInt32BE(16) : 0,
    height: hasHeader ? bytes.readUInt32BE(20) : 0,
    sampledPixels: 0,
    distinctSampledColors: 0,
    luminanceRange: 0,
    opaqueRatio: 0,
    lowInformation: true,
  };
}

function unfilterPng(filtered, width, height, channels) {
  const rowBytes = width * channels;
  const raw = Buffer.alloc(rowBytes * height);
  for (let row = 0; row < height; row += 1) {
    const inputOffset = row * (rowBytes + 1);
    const outputOffset = row * rowBytes;
    const filter = filtered[inputOffset];
    assert(filter >= 0 && filter <= 4, "PNG filter is unsupported");
    for (let column = 0; column < rowBytes; column += 1) {
      const encoded = filtered[inputOffset + 1 + column];
      const left = column >= channels ? raw[outputOffset + column - channels] : 0;
      const up = row > 0 ? raw[outputOffset + column - rowBytes] : 0;
      const upLeft = row > 0 && column >= channels ? raw[outputOffset + column - rowBytes - channels] : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = up;
      else if (filter === 3) predictor = Math.floor((left + up) / 2);
      else if (filter === 4) predictor = paeth(left, up, upLeft);
      raw[outputOffset + column] = (encoded + predictor) & 0xff;
    }
  }
  return raw;
}

function pngPixel(raw, width, channels, colorType, x, y) {
  const offset = (y * width + x) * channels;
  if (colorType === 0) return [raw[offset], raw[offset], raw[offset], 255];
  if (colorType === 2) return [raw[offset], raw[offset + 1], raw[offset + 2], 255];
  if (colorType === 4) return [raw[offset], raw[offset], raw[offset], raw[offset + 1]];
  return [raw[offset], raw[offset + 1], raw[offset + 2], raw[offset + 3]];
}

function paeth(left, up, upLeft) {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upLeftDistance = Math.abs(estimate - upLeft);
  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) return left;
  if (upDistance <= upLeftDistance) return up;
  return upLeft;
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
  return Boolean(rect && Number.isFinite(rect.left) && Number.isFinite(rect.top) && Number.isFinite(rect.right) && Number.isFinite(rect.bottom) &&
    rect.left >= -1 && rect.top >= -1 && rect.right <= Number(viewport.width || 0) + 1 && rect.bottom <= Number(viewport.height || 0) + 1);
}

function rectIntersectsViewport(rect, viewport) {
  return Boolean(rect && Number(rect.width) > 0 && Number(rect.height) > 0 &&
    Number(rect.right) > 0 && Number(rect.bottom) > 0 &&
    Number(rect.left) < Number(viewport.width) && Number(rect.top) < Number(viewport.height));
}

function rectContained(inner, outer) {
  return Boolean(inner && outer && inner.left >= outer.left - 1 && inner.top >= outer.top - 1 &&
    inner.right <= outer.right + 1 && inner.bottom <= outer.bottom + 1);
}

function visualVariantKey(item) {
  return `${item.canonicalCaseId}|${item.screenId}|${item.screenRoute}|${item.accountRole}|${item.width}x${item.height}|${item.theme}`;
}

function probeVariantKey(item) {
  return `${item.canonicalCaseId}|${item.screenId}|${item.screenRoute}|${item.role}|${item.width}x${item.height}|${item.theme}`;
}

function probeMetadataMatchesPayload(probe) {
  const binding = probe.payload?.binding || {};
  const observed = probe.payload?.observed || {};
  return binding.canonicalCaseId === probe.canonicalCaseId && binding.featureId === probe.featureId &&
    binding.screenId === probe.screenId && binding.screenRoute === probe.screenRoute && binding.accountRole === probe.role &&
    observed.route === probe.screenRoute && observed.accountRole === probe.role &&
    observed.viewport?.width === probe.width && observed.viewport?.height === probe.height && observed.appliedTheme === probe.theme;
}

function compilePattern(value, context) {
  const descriptor = {
    schema: explicitRegexPatternSchema,
    source: typeof value === "string" ? value : "",
    flags: String(context?.flags || ""),
  };
  const safeContext = [
    `case=${String(context?.caseId || "missing")}`,
    `action=${String(context?.actionId || "missing")}`,
    `phase=${String(context?.phase || "missing")}`,
    `callsite=${String(context?.callsite || "missing")}`,
    `patternDigest=${sha256Text(descriptor.source)}`,
    `flags=${descriptor.flags || "none"}`,
  ].join(" ");
  if (descriptor.schema !== explicitRegexPatternSchema || descriptor.source.length === 0 ||
      !context?.caseId || !context?.actionId || !context?.phase || !context?.callsite) {
    throw new Error(`EXPLICIT_REGEX_SCHEMA_INVALID ${safeContext}`);
  }
  try { return new RegExp(descriptor.source, descriptor.flags); }
  catch { throw new Error(`EXPLICIT_REGEX_COMPILE_INVALID ${safeContext}`); }
}

function matchesPattern(value, pattern, context) {
  return typeof value === "string" && compilePattern(pattern, context).test(value);
}

function parseLiveSessionRequestPath(value) {
  const match = String(value || "").match(/^\/client\/api\/views\/([^/]+)\/webrtc\/session$/);
  return match ? { viewId: decodePathSegment(match[1]) } : null;
}

function parseLiveSessionAnswerPath(value) {
  const match = String(value || "").match(/^\/client\/api\/views\/([^/]+)\/webrtc\/session\/([^/]+)\/answer$/);
  return match ? { viewId: decodePathSegment(match[1]), sessionId: decodePathSegment(match[2]) } : null;
}

function decodePathSegment(value) {
  try { return decodeURIComponent(String(value || "")); }
  catch { return ""; }
}

function equalArray(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length && actual.every((item, index) => item === expected[index]);
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

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const value of bytes) {
    crc ^= value;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
