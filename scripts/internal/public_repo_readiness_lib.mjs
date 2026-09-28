// 파일 용도: public repository path/content 정책을 대형 text까지 동일하게 적용하는 공용 scanner입니다.

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

// B14: 공개 검토한 역사적 이미지의 정확한 바이트만 허용한다.
export function loadReviewedHistoricalAssets(rootDir, policy) {
  const spec = policy.reviewedHistoricalAssets;
  if (spec === undefined) return new Set();
  const invalid = () => { throw new Error("historical-review-invalid"); };
  const canonical = value => typeof value === "string" && value.length > 0 &&
    !value.includes("\\") && !value.includes("\0") && !path.posix.isAbsolute(value) &&
    value.split("/").every(part => part && part !== "." && part !== "..");
  try {
    if (!spec || !canonical(spec.manifest) || !canonical(spec.root) ||
        !spec.root.startsWith("docs/release-artifacts/v4.1.0/") ||
        !spec.manifest.startsWith("docs/release-artifacts/v4.1.0/") ||
        !/^[a-f0-9]{64}$/.test(spec.sha256) || !Number.isSafeInteger(spec.count) ||
        spec.count < 1 || spec.count > 20) invalid();
    const actualRoot = fs.realpathSync(rootDir);
    const read = relative => {
      const absolute = path.resolve(actualRoot, relative);
      const stat = fs.lstatSync(absolute);
      if (!stat.isFile() || stat.isSymbolicLink() ||
          fs.realpathSync(absolute) !== absolute || stat.size > 2 * 1024 * 1024) invalid();
      return fs.readFileSync(absolute);
    };
    const digest = bytes => createHash("sha256").update(bytes).digest("hex");
    const manifest = read(spec.manifest);
    if (digest(manifest) !== spec.sha256) invalid();
    const review = JSON.parse(manifest);
    if (review.schema !== "media-server.historical-ui-publication-review.v1" ||
        !Array.isArray(review.entries) || review.entries.length !== spec.count) invalid();
    const accepted = new Set();
    for (const entry of review.entries) {
      if (!canonical(entry.path) || !entry.path.startsWith(`${spec.root}/`) ||
          !entry.path.endsWith(".jpg") || accepted.has(entry.path) ||
          entry.mimeType !== "image/jpeg" || entry.historicalOnly !== true ||
          entry.wholeSuitePass !== false || !Number.isSafeInteger(entry.bytes) ||
          entry.bytes < 1 || !/^[a-f0-9]{64}$/.test(entry.sha256)) invalid();
      const bytes = read(entry.path);
      if (bytes.length !== entry.bytes || digest(bytes) !== entry.sha256) invalid();
      accepted.add(entry.path);
    }
    return accepted;
  } catch {
    invalid(); // 파일 내용·로컬 경로를 오류 문자열로 내보내지 않는다.
  }
}

export function findDeniedContent(text, policy) {
  const sources = [
    ...(policy.deniedTrackedContentPatterns || []),
    ...(policy.secretPatterns || []),
  ];
  const hits = [];
  for (const item of sources) {
    const match = new RegExp(item.pattern, "m").exec(text);
    if (match) hits.push({ id: item.id, match: match[0].slice(0, 80) });
  }
  return hits;
}

export function isDeniedArtifactPath(relativePath, policy) {
  const normalized = String(relativePath || "").replaceAll(path.sep, "/");
  if (!normalized.startsWith("docs/release-artifacts/")) return false;
  const basename = path.posix.basename(normalized);
  if ((policy.deniedReleaseArtifactBasenames || []).includes(basename)) return true;
  if ((policy.deniedReleaseArtifactExtensions || []).some((extension) => basename.endsWith(extension))) return true;
  return (policy.deniedReleaseArtifactNamePatterns || [])
    .some((pattern) => new RegExp(pattern).test(basename));
}

export function scanTrackedTextFile(filePath, relativePath, policy) {
  if (!shouldScanTrackedText(filePath, relativePath, policy)) return [];
  return findDeniedContent(fs.readFileSync(filePath, "utf8"), policy)
    .map((hit) => ({ ...hit, file: relativePath }));
}

export function shouldScanTrackedText(filePath, relativePath, policy) {
  const extension = path.extname(String(relativePath || "")).toLowerCase();
  if ((policy.trackedTextExtensions || []).includes(extension)) return true;
  const stat = fs.statSync(filePath);
  if (stat.size > 2 * 1024 * 1024) return false;
  const descriptor = fs.openSync(filePath, "r");
  try {
    const sample = Buffer.alloc(Math.min(stat.size, 8192));
    fs.readSync(descriptor, sample, 0, sample.length, 0);
    return !sample.includes(0);
  } finally {
    fs.closeSync(descriptor);
  }
}
