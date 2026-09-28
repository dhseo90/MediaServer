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
  const root = path.resolve(rootDir);
  // `git diff --binary` 전체를 child-process 버퍼에 적재하면 대형 fixture 정리처럼
  // 정상적인 release patch가 64 MiB를 넘을 때 provenance 수집 자체가 실패한다.
  // base commit, dirty path, 현재 file bytes/mode를 bounded read로 결합하면 같은
  // source state를 안정적으로 식별하면서 acceptance-owned artifact는 제외할 수 있다.
  const sourceState = sourceStateFingerprint(root, commitSha, unapprovedDirtyPaths);
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
    sourcePatchSha256: sha256Text(sourceState),
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

export function deduplicateScreenshotArtifactAgainstTree(item, root) {
  const screenshotPath = path.resolve(String(item?.screenshotPath || ""));
  const artifactRoot = path.resolve(String(root || ""));
  if (!item || !screenshotPath || !isWithin(artifactRoot, screenshotPath) ||
      !fs.existsSync(screenshotPath)) {
    throw new Error("case screenshot deduplication input is invalid");
  }
  const sha256 = sha256File(screenshotPath);
  const canonicalPath = listFiles(artifactRoot)
    .filter(candidate => candidate.toLowerCase().endsWith(".png") &&
      path.resolve(candidate) !== screenshotPath)
    .sort()
    .find(candidate => sha256File(candidate) === sha256) || "";
  const duplicateOfCaseId = canonicalPath
    ? path.basename(path.dirname(path.dirname(canonicalPath))).replace(/^\d+-/, "")
    : "";
  if (canonicalPath) {
    fs.rmSync(screenshotPath, { force: true });
    item.screenshotPath = canonicalPath;
  }
  const evidence = {
    status: "captured",
    sha256,
    canonicalPath: canonicalPath || screenshotPath,
    deduplicated: Boolean(canonicalPath),
    duplicateOfCaseId,
  };
  item.screenshotEvidence = evidence;
  return evidence;
}

// finalizer에서 새로 촬영한 PNG만 정리한다. 기존 case 증거는 읽기 전용이다.
export function deduplicateFinalizerScreenshots(probes, root) {
  const owned = path.resolve(root);
  const fresh = path.join(owned, "suite-finalizer", "visual-matrix");
  if (!Array.isArray(probes) || probes.length > 1000) throw new Error("finalizer probe input invalid");
  const validate = (file, directory = false) => {
    const resolved = path.resolve(file);
    if (resolved !== owned && !isWithin(owned, resolved)) throw new Error("finalizer path outside owned root");
    let cursor = owned;
    for (const part of ["", ...path.relative(owned, resolved).split(path.sep).filter(Boolean)]) {
      if (part) cursor = path.join(cursor, part);
      const stat = fs.lstatSync(cursor);
      if (stat.isSymbolicLink() || (cursor !== resolved && !stat.isDirectory())) throw new Error("finalizer unsafe path");
      if (cursor === resolved && !(directory ? stat.isDirectory() : stat.isFile())) throw new Error("finalizer invalid file type");
    }
    return resolved;
  };
  validate(owned, true);
  const candidates = [];
  const visit = directory => {
    validate(directory, true);
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error("finalizer unsafe candidate path");
      if (entry.isDirectory()) visit(file);
      else if (entry.name.toLowerCase().endsWith(".png")) candidates.push(validate(file));
      if (candidates.length > 10000) throw new Error("finalizer candidate bound exceeded");
    }
  };
  const cases = path.join(owned, "cases");
  let hasCases = true;
  try { fs.lstatSync(cases); } catch (error) { if (error.code === "ENOENT") hasCases = false; else throw error; }
  if (hasCases) visit(cases);
  const seenPaths = new Set();
  // 모든 입력 검증을 삭제/참조 변경보다 먼저 완료한다.
  const inputs = probes.map(probe => {
    if (!probe || typeof probe.screenshotPath !== "string" || !probe.screenshotPath) throw new Error("finalizer screenshot missing");
    const file = validate(probe.screenshotPath);
    if (!isWithin(fresh, file) || !file.toLowerCase().endsWith(".png") || seenPaths.has(file)) throw new Error("finalizer screenshot ownership invalid");
    seenPaths.add(file);
    return { probe, file, sha256: sha256File(file) };
  });
  const canonical = new Map();
  for (const file of candidates) {
    const hash = sha256File(file);
    if (!canonical.has(hash)) canonical.set(hash, { file, id: path.basename(path.dirname(path.dirname(file))).replace(/^\d+-/, "") });
  }
  const plan = inputs.map(input => {
    const prior = canonical.get(input.sha256);
    if (!prior) canonical.set(input.sha256, { file: input.file, id: String(input.probe.id || "") });
    return { ...input, target: prior?.file || input.file, duplicateOfCaseId: prior?.id || "" };
  });
  for (const item of plan) {
    validate(item.file); validate(item.target);
    if (sha256File(item.file) !== item.sha256 || sha256File(item.target) !== item.sha256) throw new Error("finalizer screenshot changed during planning");
  }
  for (const item of plan) {
    validate(item.file); validate(item.target);
    if (sha256File(item.file) !== item.sha256 || sha256File(item.target) !== item.sha256) throw new Error("finalizer screenshot changed before removal");
    if (item.file !== item.target) fs.unlinkSync(item.file);
    item.probe.screenshotPath = item.target;
    item.probe.screenshotEvidence = { status: "captured", sha256: item.sha256,
      canonicalPath: item.target, deduplicated: item.file !== item.target, duplicateOfCaseId: item.duplicateOfCaseId };
  }
  return { removed: plan.filter(item => item.file !== item.target).length, retained: canonical.size };
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
  return /(?:fixture\s+)?video\s+placeholder\b/i.test(fs.readFileSync(filePath, "utf8"));
}

function sourceStateFingerprint(rootDir, commitSha, absolutePaths) {
  if (absolutePaths.length === 0) return "";
  const entries = absolutePaths
    .map(absolute => {
      const relative = path.relative(rootDir, absolute).split(path.sep).join("/");
      if (!relative || relative.startsWith("../") || path.isAbsolute(relative)) {
        throw new Error(`source provenance path escapes repository: ${absolute}`);
      }
      let stat;
      try { stat = fs.lstatSync(absolute); }
      catch (error) {
        if (error?.code === "ENOENT") return { path: relative, type: "missing" };
        throw error;
      }
      if (stat.isSymbolicLink()) {
        return {
          path: relative,
          type: "symlink",
          targetSha256: sha256Text(fs.readlinkSync(absolute)),
        };
      }
      if (stat.isFile()) {
        return {
          path: relative,
          type: "file",
          mode: stat.mode & 0o777,
          size: stat.size,
          sha256: sha256FileBounded(absolute),
        };
      }
      return { path: relative, type: "other", mode: stat.mode & 0o777 };
    })
    .sort((left, right) => left.path.localeCompare(right.path));
  return JSON.stringify({
    schema: "media-server.source-state-fingerprint.v1",
    baseCommit: commitSha,
    entries,
  });
}

function sha256FileBounded(filePath) {
  const hash = crypto.createHash("sha256");
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  const descriptor = fs.openSync(filePath, "r");
  try {
    for (;;) {
      const bytesRead = fs.readSync(descriptor, buffer, 0, buffer.length, null);
      if (bytesRead === 0) break;
      hash.update(buffer.subarray(0, bytesRead));
    }
  } finally {
    fs.closeSync(descriptor);
  }
  return hash.digest("hex");
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
