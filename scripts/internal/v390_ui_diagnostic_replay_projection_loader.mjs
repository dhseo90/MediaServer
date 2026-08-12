// 파일 용도: tracked diagnostic replay projection을 단일 fail-closed 경계로 읽고 검증한다.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const projectionPath = path.join(
  root,
  "test/fixtures/v390_ui_diagnostic_replay_tracked_projection.json",
);
const evt004ProjectionPath = path.join(
  root,
  "test/fixtures/v390_ui_diagnostic_evt004_recorded_contract.json",
);
const schema = "media-server.v390-ui-diagnostic-replay-tracked-projection.v1";
let cached = null;
let companionSummariesBySha = null;
const hydratedCaseCache = new Map();

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(key =>
      `${JSON.stringify(key)}:${stable(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} is missing or not an object`);
  }
  return value;
}

function requireDigest(value, label) {
  if (!/^[a-f0-9]{64}$/.test(String(value || ""))) {
    throw new Error(`${label} digest is missing or invalid`);
  }
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function assertNoForbiddenProjectionData(value, pathSegments = []) {
  if (Array.isArray(value)) {
    value.forEach((child, index) => assertNoForbiddenProjectionData(child, [...pathSegments, index]));
    return;
  }
  if (!value || typeof value !== "object") {
    if (typeof value === "string" && (/\/Users\//.test(value) || value.includes(".media_server.test"))) {
      throw new Error(`absolute or ignored artifact path stored at ${pathSegments.join(".")}`);
    }
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (/^(?:rawBody|responseBody|responseBodies|console|credential|token|secret)$/i.test(key)) {
      throw new Error(`forbidden replay projection field: ${[...pathSegments, key].join(".")}`);
    }
    assertNoForbiddenProjectionData(child, [...pathSegments, key]);
  }
}

export function validateV390UiDiagnosticReplayProjection(value) {
  const projection = requireObject(value, "diagnostic replay projection");
  if (projection.schema !== schema) {
    throw new Error(`diagnostic replay projection schema drift: ${projection.schema || "missing"}`);
  }
  const expectedDigest = sha256(stable({ ...projection, projectionSha256: "" }));
  if (projection.projectionSha256 !== expectedDigest) {
    throw new Error("diagnostic replay projection digest drift");
  }
  const safety = requireObject(projection.secretSafety, "diagnostic replay secret safety");
  for (const key of [
    "rawBodyStored", "consoleStored", "credentialStored", "tokenStored",
    "absoluteArtifactPathStored",
  ]) {
    if (safety[key] !== false) throw new Error(`diagnostic replay secret safety drift: ${key}`);
  }
  assertNoForbiddenProjectionData(projection);
  const runs = requireObject(projection.runs, "diagnostic replay runs");
  if (Object.keys(runs).length === 0) throw new Error("diagnostic replay run set is empty");
  for (const [alias, runValue] of Object.entries(runs)) {
    const run = requireObject(runValue, `diagnostic replay run ${alias}`);
    if (!/^[a-f0-9]{40}$/.test(String(run.sourceCommit || ""))) {
      throw new Error(`${alias} source commit is missing or invalid`);
    }
    requireDigest(run.parent?.summarySha256, `${alias} parent summary`);
    requireDigest(run.caseSummaryDigestSetSha256, `${alias} case summary set`);
    requireDigest(run.caseTraceDigestSetSha256, `${alias} case trace set`);
    const cases = requireObject(run.cases, `${alias} cases`);
    for (const [caseId, caseValue] of Object.entries(cases)) {
      const record = requireObject(caseValue, `${alias}/${caseId}`);
      requireDigest(record.summarySha256, `${alias}/${caseId} summary`);
      if (record.traceSha256) requireDigest(record.traceSha256, `${alias}/${caseId} trace`);
      if (record.summary) {
        if (record.summary.summarySha256 !== record.summarySha256 ||
            record.summary.case?.caseId !== caseId) {
          throw new Error(`${alias}/${caseId} summary projection binding drift`);
        }
      }
      if (record.trace) {
        if (record.trace.traceSha256 !== record.traceSha256 || record.trace.caseId !== caseId) {
          throw new Error(`${alias}/${caseId} trace projection binding drift`);
        }
      }
    }
  }
  return projection;
}

export function validateV390UiDiagnosticReplayCompanionProjection(value) {
  const companion = requireObject(value, "diagnostic replay companion projection");
  if (companion.schema !== "media-server.v390-ui-diagnostic-evt004-recorded-contract.v1") {
    throw new Error("diagnostic replay companion projection schema drift");
  }
  assertNoForbiddenProjectionData(companion);
  requireDigest(companion.sourceArtifacts?.preservedCaseLocalFailureSha256,
    "diagnostic replay preserved EVT-004 companion");
  requireDigest(companion.sourceArtifacts?.latestBrowserFailureSha256,
    "diagnostic replay latest EVT-004 companion");
  return companion;
}

export function loadV390UiDiagnosticReplayProjection() {
  if (cached) return cached;
  const parsed = JSON.parse(fs.readFileSync(projectionPath, "utf8"));
  validateV390UiDiagnosticReplayProjection(parsed);
  const evt004Bytes = fs.readFileSync(evt004ProjectionPath);
  if (sha256(evt004Bytes) !== parsed.companionProjectionSha256) {
    throw new Error("diagnostic replay companion projection digest drift");
  }
  const companion = JSON.parse(evt004Bytes);
  validateV390UiDiagnosticReplayCompanionProjection(companion);
  companionSummariesBySha = new Map([
    [companion.sourceArtifacts?.preservedCaseLocalFailureSha256,
      companion.preservedCaseLocalFailure],
    [companion.sourceArtifacts?.latestBrowserFailureSha256,
      companion.latestBrowserFailure],
  ]);
  cached = deepFreeze(parsed);
  return cached;
}

export function loadDiagnosticReplayRun(alias) {
  const run = loadV390UiDiagnosticReplayProjection().runs[String(alias || "")];
  if (!run) throw new Error(`diagnostic replay run projection missing: ${alias || "empty"}`);
  return run;
}

export function loadDiagnosticReplayCase(alias, caseId) {
  const record = loadDiagnosticReplayRun(alias).cases[String(caseId || "")];
  if (!record) {
    throw new Error(`diagnostic replay case projection missing: ${alias}/${caseId || "empty"}`);
  }
  const faithful = companionSummariesBySha?.get(record.summarySha256);
  if (!faithful) return record;
  const cacheKey = `${alias}\u0000${caseId}`;
  if (hydratedCaseCache.has(cacheKey)) return hydratedCaseCache.get(cacheKey);
  if (faithful?.case?.caseId !== record.summary?.case?.caseId) {
    throw new Error("diagnostic replay companion projection case binding drift");
  }
  const hydrated = structuredClone(faithful);
  hydrated.summarySha256 = record.summarySha256;
  const markerDigest = record.summary?.case?.markerStageEvidence
    ?.fileStageEvidence?.markerDigest;
  if (markerDigest) {
    hydrated.case.markerStageEvidence.fileStageEvidence.markerDigest = markerDigest;
  }
  const result = deepFreeze({ ...record, summary: hydrated });
  hydratedCaseCache.set(cacheKey, result);
  return result;
}
