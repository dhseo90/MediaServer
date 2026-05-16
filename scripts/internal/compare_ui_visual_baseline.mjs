#!/usr/bin/env node
// 파일 용도: UI visual regression artifact baseline과 candidate screenshot을 manifest 기반으로 비교한다.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import zlib from "node:zlib";
import { pathToFileURL } from "node:url";

import { assertKnownOptions, hasHelpFlag, printUsageAndExit } from "./script_arg_utils.mjs";

const REPORT_SCHEMA = "media-server.ui-visual-baseline-diff.v1";
const ARTIFACT_SCHEMA = "media-server.ui-visual-artifact-index.v1";

if (isMainModule()) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[fail] ${message}`);
    process.exit(1);
  });
}

export function compareVisualBaseline({
  baselineDir,
  candidateDir,
  outputDir,
  maxDiffPct = 0,
  pixelThreshold = 0,
  allowExtra = false,
  failOnReview = false,
} = {}) {
  if (!baselineDir) throw new Error("--baseline-dir is required");
  if (!candidateDir) throw new Error("--candidate-dir is required");
  const resolvedBaselineDir = path.resolve(baselineDir);
  const resolvedCandidateDir = path.resolve(candidateDir);
  const resolvedOutputDir = path.resolve(outputDir || candidateDir);
  fs.mkdirSync(resolvedOutputDir, { recursive: true });

  const baselineManifest = readVisualManifest(resolvedBaselineDir, "baseline");
  const candidateManifest = readVisualManifest(resolvedCandidateDir, "candidate");
  const baselineItems = mapScreenshots(baselineManifest);
  const candidateItems = mapScreenshots(candidateManifest);
  const fileNames = Array.from(new Set([...baselineItems.keys(), ...candidateItems.keys()])).sort((a, b) => a.localeCompare(b));
  const results = [];

  for (const file of fileNames) {
    const baselineItem = baselineItems.get(file);
    const candidateItem = candidateItems.get(file);
    if (!baselineItem) {
      results.push({
        file,
        status: allowExtra ? "extra-allowed" : "extra",
        ok: Boolean(allowExtra),
        requiresReview: Boolean(allowExtra),
        page: candidateItem?.page || "",
        viewport: candidateItem?.viewport || {},
        reason: "candidate artifact has no matching baseline screenshot",
        reviewReason: allowExtra ? "candidate-only screenshot allowed by policy; visual review required" : "",
      });
      continue;
    }
    if (!candidateItem) {
      results.push({
        file,
        status: "missing",
        ok: false,
        page: baselineItem.page || "",
        viewport: baselineItem.viewport || {},
        reason: "candidate artifact is missing baseline screenshot",
      });
      continue;
    }
    results.push(compareScreenshotPair({
      file,
      baselineDir: resolvedBaselineDir,
      candidateDir: resolvedCandidateDir,
      baselineItem,
      candidateItem,
      maxDiffPct,
      pixelThreshold,
    }));
  }

  const summary = buildSummary(results);
  const report = {
    schema: REPORT_SCHEMA,
    generatedAt: new Date().toISOString(),
    baselineDir: resolvedBaselineDir,
    candidateDir: resolvedCandidateDir,
    outputDir: resolvedOutputDir,
    thresholds: {
      maxDiffPct,
      pixelThreshold,
      allowExtra,
      failOnReview,
    },
    policy: buildCandidatePolicy({ maxDiffPct, pixelThreshold, allowExtra, failOnReview }),
    baselineManifest: summarizeManifest(baselineManifest),
    candidateManifest: summarizeManifest(candidateManifest),
    summary,
    results,
  };
  const jsonPath = path.join(resolvedOutputDir, "visual-baseline-diff.json");
  const markdownPath = path.join(resolvedOutputDir, "visual-baseline-diff.md");
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(markdownPath, buildMarkdownReport(report));
  return { ...report, jsonPath, markdownPath };
}

async function main() {
  const rawArgs = process.argv.slice(2);
  if (hasHelpFlag(rawArgs)) {
    printUsageAndExit(`UI visual baseline diff

Usage:
  ./server.sh compare-ui-visual-baseline --baseline-dir <dir> --candidate-dir <dir> [options]

Options:
  --baseline-dir <path>     기준 visual artifact 디렉터리입니다.
  --candidate-dir <path>    비교할 visual artifact 디렉터리입니다.
  --output-dir <path>       diff report 출력 디렉터리입니다. 기본 candidate-dir.
  --max-diff-pct <number>   허용 변경 pixel 비율(%)입니다. 기본 0.
  --pixel-threshold <n>     변경 pixel로 볼 채널 delta 임계값입니다. 기본 0.
  --allow-extra[=1]         candidate에만 있는 screenshot을 실패로 보지 않습니다.
  --fail-on-review[=1]      diff가 threshold 안이어도 review 필요 항목이 있으면 실패 종료합니다.
  -h, --help                도움말 출력
`);
  }
  assertKnownOptions(rawArgs, [
    "baseline-dir",
    "candidate-dir",
    "output-dir",
    "max-diff-pct",
    "pixel-threshold",
    "allow-extra",
    "fail-on-review",
    "h",
    "help",
  ]);
  const args = parseArgs(rawArgs);
  const report = compareVisualBaseline({
    baselineDir: args.baselineDir,
    candidateDir: args.candidateDir,
    outputDir: args.outputDir,
    maxDiffPct: numberOption(args.maxDiffPct, 0, "--max-diff-pct"),
    pixelThreshold: numberOption(args.pixelThreshold, 0, "--pixel-threshold"),
    allowExtra: isTruthy(args.allowExtra),
    failOnReview: isTruthy(args.failOnReview),
  });
  console.log(`[pass] visual baseline diff report: ${report.jsonPath}`);
  console.log(`[pass] visual baseline diff index: ${report.markdownPath}`);
  console.log("");
  console.log("== UI visual baseline diff summary ==");
  console.log(`- compared: ${report.summary.compared}`);
  console.log(`- passed: ${report.summary.passed}`);
  console.log(`- failed: ${report.summary.failed}`);
  console.log(`- changed: ${report.summary.changed}`);
  console.log(`- review: ${report.summary.review}`);
  console.log(`- decision: ${report.summary.decision}`);
  console.log(`- missing: ${report.summary.missing}`);
  console.log(`- extra: ${report.summary.extra}`);
  if (report.summary.failed > 0) {
    console.log("- failed files:");
    for (const item of report.results.filter((result) => !result.ok)) {
      console.log(`  - ${item.file}: ${item.status}${item.reason ? ` (${item.reason})` : ""}`);
    }
    process.exit(1);
  }
  if (report.thresholds.failOnReview && report.summary.reviewRequired) {
    console.log("- review-required files:");
    for (const item of report.results.filter((result) => result.requiresReview)) {
      console.log(`  - ${item.file}: ${item.reviewReason || item.status}`);
    }
    process.exit(1);
  }
}

function compareScreenshotPair({
  file,
  baselineDir,
  candidateDir,
  baselineItem,
  candidateItem,
  maxDiffPct,
  pixelThreshold,
}) {
  const baselinePath = path.join(baselineDir, file);
  const candidatePath = path.join(candidateDir, file);
  if (!fs.existsSync(baselinePath)) {
    return failedResult(file, baselineItem, "missing-baseline-file", "baseline screenshot file does not exist");
  }
  if (!fs.existsSync(candidatePath)) {
    return failedResult(file, baselineItem, "missing-candidate-file", "candidate screenshot file does not exist");
  }

  const baselineHash = sha256(baselinePath);
  const candidateHash = sha256(candidatePath);
  if (baselineHash === candidateHash) {
    return {
      file,
      status: "pass",
      ok: true,
      page: baselineItem.page || candidateItem.page || "",
      viewport: baselineItem.viewport || candidateItem.viewport || {},
      baselineBytes: fs.statSync(baselinePath).size,
      candidateBytes: fs.statSync(candidatePath).size,
      baselineSha256: baselineHash,
      candidateSha256: candidateHash,
      dimensions: manifestDimensions(baselineItem, candidateItem),
      changedPixels: 0,
      changedPct: 0,
      maxChannelDelta: 0,
      avgChannelDelta: 0,
      requiresReview: false,
      reviewReason: "",
    };
  }

  let baselinePng;
  let candidatePng;
  try {
    baselinePng = readPngAsRgba(baselinePath);
    candidatePng = readPngAsRgba(candidatePath);
  } catch (error) {
    return {
      ...failedResult(file, baselineItem, "decode-error", error instanceof Error ? error.message : String(error)),
      baselineSha256: baselineHash,
      candidateSha256: candidateHash,
    };
  }
  if (baselinePng.width !== candidatePng.width || baselinePng.height !== candidatePng.height) {
    return {
      ...failedResult(file, baselineItem, "dimension-mismatch", `${baselinePng.width}x${baselinePng.height} vs ${candidatePng.width}x${candidatePng.height}`),
      baselineSha256: baselineHash,
      candidateSha256: candidateHash,
      dimensions: {
        baseline: { width: baselinePng.width, height: baselinePng.height },
        candidate: { width: candidatePng.width, height: candidatePng.height },
      },
    };
  }
  const diff = diffRgbaPixels(baselinePng.rgba, candidatePng.rgba, pixelThreshold);
  const ok = diff.changedPct <= maxDiffPct;
  const requiresReview = ok && diff.changedPixels > 0;
  return {
    file,
    status: ok ? "pass" : "diff",
    ok,
    page: baselineItem.page || candidateItem.page || "",
    viewport: baselineItem.viewport || candidateItem.viewport || {},
    baselineBytes: fs.statSync(baselinePath).size,
    candidateBytes: fs.statSync(candidatePath).size,
    baselineSha256: baselineHash,
    candidateSha256: candidateHash,
    dimensions: {
      baseline: { width: baselinePng.width, height: baselinePng.height },
      candidate: { width: candidatePng.width, height: candidatePng.height },
    },
    ...diff,
    requiresReview,
    threshold: {
      maxDiffPct,
      pixelThreshold,
    },
    reason: ok ? "" : `changed pixel pct ${formatPct(diff.changedPct)} > ${formatPct(maxDiffPct)}`,
    reviewReason: requiresReview ? `changed pixel pct ${formatPct(diff.changedPct)} is within threshold; visual review required` : "",
  };
}

function failedResult(file, item, status, reason) {
  return {
    file,
    status,
    ok: false,
    page: item?.page || "",
    viewport: item?.viewport || {},
    reason,
  };
}

function readVisualManifest(dir, label) {
  const manifestPath = path.join(dir, "visual-regression-manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`${label} manifest not found: ${manifestPath}`);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  if (manifest.schema !== ARTIFACT_SCHEMA) {
    throw new Error(`${label} manifest schema mismatch: ${manifest.schema || "(missing)"}`);
  }
  if (!Array.isArray(manifest.screenshots)) {
    throw new Error(`${label} manifest screenshots must be an array`);
  }
  return manifest;
}

function mapScreenshots(manifest) {
  const result = new Map();
  for (const item of manifest.screenshots || []) {
    const file = String(item?.file || "").trim();
    if (!file) continue;
    result.set(file, item);
  }
  return result;
}

function summarizeManifest(manifest) {
  return {
    schema: manifest.schema,
    generatedAt: manifest.generatedAt || "",
    title: manifest.title || "",
    command: manifest.command || "",
    screenshotCount: manifest.screenshotCount || 0,
    viewport: manifest.viewport || {},
  };
}

function buildSummary(results) {
  const failed = results.filter((item) => !item.ok).length;
  const review = results.filter((item) => item.requiresReview).length;
  return {
    compared: results.filter((item) => item.status !== "extra" && item.status !== "extra-allowed").length,
    passed: results.filter((item) => item.ok).length,
    failed,
    changed: results.filter((item) => item.status === "diff" || Number(item.changedPixels || 0) > 0).length,
    identical: results.filter((item) => item.ok && !item.requiresReview && Number(item.changedPixels || 0) === 0 && item.status !== "extra-allowed").length,
    review,
    reviewRequired: review > 0,
    decision: failed > 0 ? "fail" : (review > 0 ? "review" : "pass"),
    changedWithinThreshold: results.filter((item) => item.status === "pass" && item.requiresReview && Number(item.changedPixels || 0) > 0).length,
    changedOverThreshold: results.filter((item) => item.status === "diff" && !item.ok).length,
    missing: results.filter((item) => item.status === "missing" || item.status === "missing-candidate-file").length,
    extra: results.filter((item) => item.status === "extra" || item.status === "extra-allowed").length,
    extraAllowed: results.filter((item) => item.status === "extra-allowed").length,
    extraFailed: results.filter((item) => item.status === "extra").length,
    decodeErrors: results.filter((item) => item.status === "decode-error").length,
    dimensionMismatches: results.filter((item) => item.status === "dimension-mismatch").length,
  };
}

function buildCandidatePolicy({ maxDiffPct, pixelThreshold, allowExtra, failOnReview }) {
  return {
    schema: "media-server.ui-visual-baseline-candidate-policy.v1",
    decision: "fail on missing, decode-error, dimension-mismatch, extra unless --allow-extra, or changedPct above maxDiffPct",
    review: "review when changed pixels are within threshold or candidate-only screenshots are allowed",
    missingCandidate: "fail",
    missingBaseline: allowExtra ? "review" : "fail",
    dimensionMismatch: "fail",
    decodeError: "fail",
    pixelDiff: `fail when changedPct > ${formatPct(maxDiffPct)} with pixelThreshold=${pixelThreshold}`,
    failOnReview,
  };
}

function buildMarkdownReport(report) {
  const lines = [
    "# UI Visual Baseline Diff",
    "",
    `- schema: ${report.schema}`,
    `- generatedAt: ${report.generatedAt}`,
    `- baselineDir: ${report.baselineDir}`,
    `- candidateDir: ${report.candidateDir}`,
    `- policySchema: ${report.policy?.schema || ""}`,
    `- maxDiffPct: ${formatPct(report.thresholds.maxDiffPct)}`,
    `- pixelThreshold: ${report.thresholds.pixelThreshold}`,
    `- allowExtra: ${report.thresholds.allowExtra}`,
    `- failOnReview: ${report.thresholds.failOnReview}`,
    `- decision: ${report.summary.decision}`,
    `- reviewRequired: ${report.summary.reviewRequired}`,
    `- compared: ${report.summary.compared}`,
    `- passed: ${report.summary.passed}`,
    `- failed: ${report.summary.failed}`,
    `- review: ${report.summary.review}`,
    "",
    "| File | Status | Review | Page | Width | Changed Pixels | Changed % | Max Delta | Reason |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ];
  for (const item of report.results || []) {
    lines.push([
      `| ${item.file || ""}`,
      item.status || "",
      item.requiresReview ? "yes" : "",
      item.page || "",
      item.viewport?.width ?? item.dimensions?.baseline?.width ?? "",
      item.changedPixels ?? "",
      item.changedPct == null ? "" : formatPct(item.changedPct),
      item.maxChannelDelta ?? "",
      sanitizeMarkdownCell(item.reason || item.reviewReason || ""),
    ].join(" | ") + " |");
  }
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function sanitizeMarkdownCell(value) {
  return String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function readPngAsRgba(filePath) {
  const buffer = fs.readFileSync(filePath);
  const pngSignature = "89504e470d0a1a0a";
  if (buffer.subarray(0, 8).toString("hex") !== pngSignature) {
    throw new Error(`${filePath} is not a PNG file`);
  }
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks = [];
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const data = buffer.subarray(dataStart, dataEnd);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      const compression = data[10];
      const filter = data[11];
      const interlace = data[12];
      if (bitDepth !== 8 || compression !== 0 || filter !== 0 || interlace !== 0) {
        throw new Error(`${filePath} uses unsupported PNG format`);
      }
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset = dataEnd + 4;
  }
  const bytesPerPixel = pngBytesPerPixel(colorType);
  if (!width || !height || !bytesPerPixel || idatChunks.length === 0) {
    throw new Error(`${filePath} is missing supported PNG image data`);
  }
  const inflated = zlib.inflateSync(Buffer.concat(idatChunks));
  const scanlineBytes = width * bytesPerPixel;
  const expectedBytes = height * (scanlineBytes + 1);
  if (inflated.length < expectedBytes) {
    throw new Error(`${filePath} PNG data is truncated`);
  }
  const raw = Buffer.alloc(width * height * bytesPerPixel);
  let sourceOffset = 0;
  for (let row = 0; row < height; row += 1) {
    const filterType = inflated[sourceOffset];
    sourceOffset += 1;
    const rowStart = row * scanlineBytes;
    const prevRowStart = rowStart - scanlineBytes;
    for (let column = 0; column < scanlineBytes; column += 1) {
      const rawValue = inflated[sourceOffset + column];
      const left = column >= bytesPerPixel ? raw[rowStart + column - bytesPerPixel] : 0;
      const up = row > 0 ? raw[prevRowStart + column] : 0;
      const upLeft = row > 0 && column >= bytesPerPixel ? raw[prevRowStart + column - bytesPerPixel] : 0;
      raw[rowStart + column] = unfilterByte(filterType, rawValue, left, up, upLeft);
    }
    sourceOffset += scanlineBytes;
  }
  return {
    width,
    height,
    rgba: convertRawToRgba(raw, colorType, width * height),
  };
}

function pngBytesPerPixel(colorType) {
  if (colorType === 0) return 1;
  if (colorType === 2) return 3;
  if (colorType === 4) return 2;
  if (colorType === 6) return 4;
  throw new Error(`unsupported PNG color type: ${colorType}`);
}

function unfilterByte(filterType, rawValue, left, up, upLeft) {
  if (filterType === 0) return rawValue;
  if (filterType === 1) return (rawValue + left) & 0xff;
  if (filterType === 2) return (rawValue + up) & 0xff;
  if (filterType === 3) return (rawValue + Math.floor((left + up) / 2)) & 0xff;
  if (filterType === 4) return (rawValue + paeth(left, up, upLeft)) & 0xff;
  throw new Error(`unsupported PNG filter: ${filterType}`);
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

function convertRawToRgba(raw, colorType, pixelCount) {
  const rgba = Buffer.alloc(pixelCount * 4);
  let source = 0;
  for (let pixel = 0; pixel < pixelCount; pixel += 1) {
    const target = pixel * 4;
    if (colorType === 0) {
      const value = raw[source];
      rgba[target] = value;
      rgba[target + 1] = value;
      rgba[target + 2] = value;
      rgba[target + 3] = 255;
      source += 1;
    } else if (colorType === 2) {
      rgba[target] = raw[source];
      rgba[target + 1] = raw[source + 1];
      rgba[target + 2] = raw[source + 2];
      rgba[target + 3] = 255;
      source += 3;
    } else if (colorType === 4) {
      const value = raw[source];
      rgba[target] = value;
      rgba[target + 1] = value;
      rgba[target + 2] = value;
      rgba[target + 3] = raw[source + 1];
      source += 2;
    } else if (colorType === 6) {
      rgba[target] = raw[source];
      rgba[target + 1] = raw[source + 1];
      rgba[target + 2] = raw[source + 2];
      rgba[target + 3] = raw[source + 3];
      source += 4;
    }
  }
  return rgba;
}

function diffRgbaPixels(baseline, candidate, pixelThreshold) {
  let changedPixels = 0;
  let maxChannelDelta = 0;
  let channelDeltaTotal = 0;
  const pixelCount = baseline.length / 4;
  for (let offset = 0; offset < baseline.length; offset += 4) {
    let pixelMax = 0;
    for (let channel = 0; channel < 4; channel += 1) {
      const delta = Math.abs(baseline[offset + channel] - candidate[offset + channel]);
      channelDeltaTotal += delta;
      if (delta > pixelMax) pixelMax = delta;
      if (delta > maxChannelDelta) maxChannelDelta = delta;
    }
    if (pixelMax > pixelThreshold) changedPixels += 1;
  }
  return {
    changedPixels,
    changedPct: pixelCount > 0 ? (changedPixels / pixelCount) * 100 : 0,
    maxChannelDelta,
    avgChannelDelta: pixelCount > 0 ? channelDeltaTotal / (pixelCount * 4) : 0,
  };
}

function manifestDimensions(baselineItem, candidateItem) {
  return {
    baseline: {
      width: baselineItem?.viewport?.width ?? null,
      height: baselineItem?.viewport?.height ?? null,
    },
    candidate: {
      width: candidateItem?.viewport?.width ?? null,
      height: candidateItem?.viewport?.height ?? null,
    },
  };
}

function sha256(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function numberOption(value, fallback, name) {
  if (value == null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative number`);
  }
  return parsed;
}

function formatPct(value) {
  return Number(value || 0).toFixed(4).replace(/\.?0+$/, "");
}

function isTruthy(value) {
  const text = String(value || "").toLowerCase();
  return text === "1" || text === "true" || text === "yes" || text === "on";
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const eq = token.indexOf("=");
    const key = token.slice(2, eq >= 0 ? eq : undefined).replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
    if (eq >= 0) {
      result[key] = token.slice(eq + 1);
      continue;
    }
    const next = argv[index + 1];
    if (next && !next.startsWith("--")) {
      result[key] = next;
      index += 1;
    } else {
      result[key] = "1";
    }
  }
  return result;
}

function isMainModule() {
  return process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
}
