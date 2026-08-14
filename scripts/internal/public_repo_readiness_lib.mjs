// 파일 용도: public repository path/content 정책을 대형 text까지 동일하게 적용하는 공용 scanner입니다.

import fs from "node:fs";
import path from "node:path";

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
