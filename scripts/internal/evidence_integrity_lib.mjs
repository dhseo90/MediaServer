// 파일 용도: v3.9 final evidence provenance, artifact inventory, screenshot dedupe 공통 로직을 제공한다.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export function collectSourceProvenance(rootDir) {
  const commitSha = git(rootDir, ["rev-parse", "HEAD"]);
  const branch = git(rootDir, ["branch", "--show-current"]);
  const status = git(rootDir, ["status", "--porcelain=v1", "--untracked-files=all"]);
  return {
    commitSha,
    branch,
    worktreeClean: status === "",
    worktreeStatusSha256: sha256Text(status),
    capturedAt: new Date().toISOString(),
  };
}

export function collectSourceProvenanceWithAllowedArtifacts(rootDir, allowedArtifactRoot) {
  const commitSha = git(rootDir, ["rev-parse", "HEAD"]);
  const branch = git(rootDir, ["branch", "--show-current"]);
  const status = gitRaw(rootDir, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]);
  const dirtyPaths = parsePorcelainPaths(status).map(candidate => path.resolve(rootDir, candidate));
  const allowedRoot = path.resolve(allowedArtifactRoot);
  const allowedArtifactPaths = dirtyPaths.filter(candidate => isWithin(allowedRoot, candidate));
  const unapprovedDirtyPaths = dirtyPaths.filter(candidate => !isWithin(allowedRoot, candidate));
  return {
    commitSha,
    branch,
    worktreeClean: dirtyPaths.length === 0,
    sourceWorktreeClean: unapprovedDirtyPaths.length === 0,
    dirtyPaths: dirtyPaths.map(candidate => path.relative(rootDir, candidate) || "."),
    allowedArtifactPaths: allowedArtifactPaths.map(candidate => path.relative(rootDir, candidate) || "."),
    unapprovedDirtyPaths: unapprovedDirtyPaths.map(candidate => path.relative(rootDir, candidate) || "."),
    allowedArtifactRoot: allowedRoot,
    worktreeStatusSha256: sha256Text(status),
    capturedAt: new Date().toISOString(),
  };
}

export function scanArtifactTree(root) {
  const files = listFiles(root);
  const screenshots = files.filter(filePath => filePath.toLowerCase().endsWith(".png"));
  const screenshotByHash = new Map();
  for (const filePath of screenshots) {
    const hash = sha256File(filePath);
    if (!screenshotByHash.has(hash)) screenshotByHash.set(hash, []);
    screenshotByHash.get(hash).push(filePath);
  }
  const duplicateScreenshotGroups = [...screenshotByHash.entries()]
    .filter(([, paths]) => paths.length > 1)
    .map(([sha256, paths]) => ({ sha256, paths }));
  const placeholderVideoFiles = files.filter(isPlaceholderVideoFile);
  return {
    root,
    fileCount: files.length,
    totalBytes: files.reduce((sum, filePath) => sum + fs.statSync(filePath).size, 0),
    screenshotFiles: screenshots.length,
    duplicateScreenshotGroups,
    duplicateScreenshotFiles: duplicateScreenshotGroups.reduce((sum, group) => sum + group.paths.length - 1, 0),
    placeholderVideoFiles,
  };
}

export function deduplicateScreenshotArtifacts(items) {
  const canonicalByHash = new Map();
  const removed = [];
  for (const item of items) {
    const screenshotPath = String(item.screenshotPath || "");
    if (!screenshotPath || !fs.existsSync(screenshotPath)) {
      item.screenshotEvidence = {
        status: "not-captured",
        sha256: "",
        canonicalPath: "",
        deduplicated: false,
        duplicateOfCaseId: "",
      };
      continue;
    }
    const sha256 = sha256File(screenshotPath);
    const canonical = canonicalByHash.get(sha256);
    if (canonical) {
      if (path.resolve(canonical.path) !== path.resolve(screenshotPath)) {
        fs.rmSync(screenshotPath, { force: true });
        removed.push({ path: screenshotPath, canonicalPath: canonical.path, sha256, duplicateOfCaseId: canonical.caseId });
      }
      item.screenshotPath = canonical.path;
      item.screenshotEvidence = {
        status: "captured",
        sha256,
        canonicalPath: canonical.path,
        deduplicated: true,
        duplicateOfCaseId: canonical.caseId,
      };
      continue;
    }
    canonicalByHash.set(sha256, { path: screenshotPath, caseId: item.caseId });
    item.screenshotEvidence = {
      status: "captured",
      sha256,
      canonicalPath: screenshotPath,
      deduplicated: false,
      duplicateOfCaseId: "",
    };
  }
  return {
    referencedScreenshots: items.filter(item => item.screenshotPath).length,
    uniqueScreenshotFiles: canonicalByHash.size,
    duplicateScreenshotFilesRemoved: removed.length,
    removed,
  };
}

export function pruneUnreferencedArtifactFiles({ roots, referencedPaths }) {
  const resolvedRoots = [...new Set((roots || []).map(value => path.resolve(value)))];
  const referenced = new Set((referencedPaths || []).filter(Boolean).map(value => path.resolve(value)));
  const removed = [];
  for (const root of resolvedRoots) {
    for (const filePath of listFiles(root)) {
      const resolved = path.resolve(filePath);
      if (referenced.has(resolved)) continue;
      fs.rmSync(resolved, { force: true });
      removed.push(resolved);
    }
  }
  return {
    scannedRoots: resolvedRoots,
    referencedFiles: referenced.size,
    removedFiles: removed,
  };
}

export function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

export function sha256Text(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

export function isRealPng(filePath) {
  if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).size < 8) return false;
  return fs.readFileSync(filePath).subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
}

export function listFiles(root) {
  if (!root || !fs.existsSync(root)) return [];
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(entryPath));
    else if (entry.isFile()) files.push(entryPath);
  }
  return files;
}

export function isInside(parent, candidate) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

export function isWithin(parent, candidate) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function isPlaceholderVideoFile(filePath) {
  if (/\.video\.txt$/i.test(filePath)) return true;
  if (!/\.(txt|log|json|md)$/i.test(filePath)) return false;
  const stat = fs.statSync(filePath);
  if (stat.size > 1024 * 1024) return false;
  return /(?:fixture\s+)?video\s+placeholder/i.test(fs.readFileSync(filePath, "utf8"));
}

function git(rootDir, args) {
  return execFileSync("git", args, {
    cwd: rootDir,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function gitRaw(rootDir, args) {
  return execFileSync("git", args, {
    cwd: rootDir,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function parsePorcelainPaths(status) {
  const entries = status.split("\0").filter(Boolean);
  const paths = [];
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    assertPorcelainEntry(entry);
    const state = entry.slice(0, 2);
    paths.push(entry.slice(3));
    if (/[RC]/.test(state) && entries[index + 1]) {
      paths.push(entries[index + 1]);
      index += 1;
    }
  }
  return [...new Set(paths.filter(Boolean))];
}

function assertPorcelainEntry(entry) {
  if (entry.length < 4 || entry[2] !== " ") {
    throw new Error(`unexpected git porcelain entry: ${JSON.stringify(entry)}`);
  }
}
