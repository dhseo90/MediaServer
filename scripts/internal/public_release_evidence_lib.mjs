// 파일 용도: 공개 저장소에 보존할 최소 release evidence record/manifest 계약을 검증합니다.

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

const statuses = new Set(["PASS", "FAIL", "not-run", "excluded", "conditional"]);
const requiredFields = [
  "sourceCommit",
  "command",
  "status",
  "startedAt",
  "finishedAt",
  "firstFailure",
  "counts",
  "cleanup",
  "policyEvaluation",
  "artifactHashes",
];

export function validatePublicReleaseEvidence(record) {
  const reasons = [];
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return { pass: false, reasons: ["record-not-object"] };
  }
  if (record.schema !== "media-server.public-release-evidence.v1") reasons.push("schema-mismatch");
  for (const field of requiredFields) {
    if (!Object.hasOwn(record, field)) reasons.push(`missing-${field}`);
  }
  if (!/^[a-f0-9]{40}$/.test(String(record.sourceCommit || ""))) reasons.push("invalid-sourceCommit");
  if (!String(record.command || "").trim()) reasons.push("invalid-command");
  if (!statuses.has(record.status)) reasons.push("invalid-status");
  const started = Date.parse(String(record.startedAt || ""));
  const finished = Date.parse(String(record.finishedAt || ""));
  if (!Number.isFinite(started)) reasons.push("invalid-startedAt");
  if (!Number.isFinite(finished)) reasons.push("invalid-finishedAt");
  if (Number.isFinite(started) && Number.isFinite(finished) && finished < started) {
    reasons.push("finished-before-started");
  }
  if (record.status === "PASS" && record.firstFailure !== null) reasons.push("pass-has-firstFailure");
  if (record.status === "FAIL" && (!record.firstFailure || typeof record.firstFailure !== "object")) {
    reasons.push("fail-missing-firstFailure");
  }
  if (!record.counts || typeof record.counts !== "object" || Array.isArray(record.counts)) {
    reasons.push("invalid-counts");
  } else {
    for (const field of ["pass", "fail", "notRun"]) {
      if (!Number.isInteger(record.counts[field]) || record.counts[field] < 0) {
        reasons.push(`invalid-counts-${field}`);
      }
    }
  }
  if (!record.cleanup || typeof record.cleanup !== "object" ||
      record.cleanup.rawArtifactsPruned !== true || !statuses.has(record.cleanup.status)) {
    reasons.push("invalid-cleanup");
  }
  if (!Array.isArray(record.artifactHashes) || record.artifactHashes.length === 0) {
    reasons.push("invalid-artifactHashes");
  } else {
    const seen = new Set();
    for (const artifact of record.artifactHashes) {
      const artifactPath = String(artifact?.path || "").replaceAll("\\", "/");
      if (!artifactPath || path.posix.isAbsolute(artifactPath) || artifactPath.startsWith("../") ||
          artifactPath.includes("/../")) reasons.push("invalid-artifact-path");
      if (isRawRuntimeArtifactPath(artifactPath)) reasons.push(`raw-artifact-path:${artifactPath}`);
      if (seen.has(artifactPath)) reasons.push(`duplicate-artifact-path:${artifactPath}`);
      seen.add(artifactPath);
      if (!Number.isInteger(artifact?.bytes) || artifact.bytes < 0) reasons.push(`invalid-artifact-bytes:${artifactPath}`);
      if (!/^[a-f0-9]{64}$/.test(String(artifact?.sha256 || ""))) reasons.push(`invalid-artifact-sha256:${artifactPath}`);
    }
  }
  return { pass: reasons.length === 0, reasons };
}

export function validatePublicReleaseManifest(manifest, options = {}) {
  const reasons = [];
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    return { pass: false, reasons: ["manifest-not-object"] };
  }
  if (manifest.schema !== "media-server.public-release-evidence-manifest.v1") {
    reasons.push("manifest-schema-mismatch");
  }
  if (!/^\d+\.\d+\.\d+$/.test(String(manifest.releaseVersion || ""))) {
    reasons.push("invalid-releaseVersion");
  }
  if (!Array.isArray(manifest.records) || manifest.records.length === 0) {
    reasons.push("manifest-records-empty");
  } else {
    const ids = new Set();
    for (const record of manifest.records) {
      const id = String(record?.id || "");
      if (!id || ids.has(id)) reasons.push(`invalid-record-id:${id}`);
      ids.add(id);
      const validation = validatePublicReleaseEvidence(record);
      reasons.push(...validation.reasons.map(reason => `${id || "record"}:${reason}`));
      if (options.verifyArtifacts === true) {
        verifyArtifactHashes(record, options.rootDir || process.cwd(), reasons, id || "record");
      }
    }
  }
  return { pass: reasons.length === 0, reasons };
}

export function isRawRuntimeArtifactPath(relativePath) {
  const normalized = String(relativePath || "").replaceAll("\\", "/");
  const basename = path.posix.basename(normalized);
  if (["auth-registry", "registry.json", "seed.json", "ports.json", "server.log", "trace.log"]
    .includes(basename)) return true;
  if (basename.endsWith(".log")) return true;
  return /(?:^|[-_.])(?:registry|seed|ports?|trace)(?:[-_.]|$)/.test(basename);
}

function verifyArtifactHashes(record, rootDir, reasons, recordId) {
  const root = path.resolve(rootDir);
  for (const artifact of record.artifactHashes || []) {
    const relative = String(artifact.path || "");
    const absolute = path.resolve(root, relative);
    const fromRoot = path.relative(root, absolute);
    if (!fromRoot || fromRoot.startsWith("..") || path.isAbsolute(fromRoot)) {
      reasons.push(`${recordId}:artifact-escapes-root:${relative}`);
      continue;
    }
    if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
      reasons.push(`${recordId}:artifact-missing:${relative}`);
      continue;
    }
    const bytes = fs.statSync(absolute).size;
    if (bytes !== artifact.bytes) reasons.push(`${recordId}:artifact-bytes-mismatch:${relative}`);
    const sha256 = createHash("sha256").update(fs.readFileSync(absolute)).digest("hex");
    if (sha256 !== artifact.sha256) reasons.push(`${recordId}:artifact-sha256-mismatch:${relative}`);
  }
}
