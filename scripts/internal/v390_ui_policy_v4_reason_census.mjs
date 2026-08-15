// 파일 용도: Policy v4 qualification reason 전수를 정확히 하나의 공통 원인 cluster에 배정한다.

const clusterReasons = Object.freeze({
  "canonical-source-binding": Object.freeze(new Set([
    "canonical-parent-binding-source-digest-mismatch",
    "canonical-case-manifest-version-mismatch",
  ])),
  "action-selector-identity": Object.freeze(new Set([
    "raw-primary-action-count-mismatch",
    "raw-primary-action-kind-mismatch",
    "raw-primary-control-not-visible",
    "raw-primary-snapshot-selector-mismatch",
  ])),
  "console-security": Object.freeze(new Set([
    "unapproved-console-message-present",
  ])),
  "cross-cutting-and-case-visual": Object.freeze(new Set([
    "independent-case-visual-not-pass",
    "cross-cutting-video-overlay-crop-independent-live-evidence-missing",
    "cross-cutting-visual-quality-independent-matrix-not-pass",
    "cross-cutting-visual-quality-independent-visual-failed",
  ])),
  "readback-identity": Object.freeze(new Set([
    "raw-independent-readback-action-count-mismatch",
    "raw-primary-readback-observation-digest-mismatch",
    "raw-primary-readback-observation-mismatch",
  ])),
  "request-response-identity": Object.freeze(new Set([
    "raw-primary-request-ambiguous",
    "raw-primary-request-pair-missing",
    "raw-primary-request-path-mismatch",
  ])),
  "suite-derived-closure": Object.freeze(new Set([
    "derived-case-fail-must-be-zero",
  ])),
});

export function censusQualificationReasons(reasons) {
  if (!Array.isArray(reasons)) throw new Error("Policy v4 qualification reasons must be an array");
  const assignments = reasons.map(reason => assignReason(reason));
  const unassignedReasons = unique(assignments
    .filter(item => item.assignmentStatus === "unassigned")
    .map(item => item.reason));
  const multiplyAssignedReasons = unique(assignments
    .filter(item => item.assignmentStatus === "multiply-assigned")
    .map(item => item.reason));
  const assigned = assignments.filter(item => item.cluster);
  return {
    schema: "media-server.v390-ui-policy-v4-reason-census.v1",
    assignmentStatus: unassignedReasons.length === 0 && multiplyAssignedReasons.length === 0
      ? "exact-one-cluster"
      : "fail-closed-incomplete-assignment",
    reasonCount: assignments.length,
    reasonCounts: countBy(assignments.map(item => item.reason)),
    clusterCounts: countBy(assigned.map(item => item.cluster)),
    assignments,
    unassignedReasons,
    multiplyAssignedReasons,
  };
}

function assignReason(rawReason) {
  const raw = String(rawReason || "");
  const reason = normalizeReason(raw);
  const matches = Object.entries(clusterReasons)
    .filter(([, values]) => values.has(reason))
    .map(([cluster]) => cluster);
  if (matches.length === 0) {
    return {
      rawReason: raw,
      caseId: raw.includes(":") ? raw.slice(0, raw.indexOf(":")) : null,
      reason,
      cluster: null,
      assignmentStatus: "unassigned",
    };
  }
  if (matches.length !== 1) {
    return {
      rawReason: raw,
      caseId: raw.includes(":") ? raw.slice(0, raw.indexOf(":")) : null,
      reason,
      cluster: null,
      assignmentStatus: "multiply-assigned",
    };
  }
  return {
    rawReason: raw,
    caseId: raw.includes(":") ? raw.slice(0, raw.indexOf(":")) : null,
    reason,
    cluster: matches[0],
    assignmentStatus: "exact-one-cluster",
  };
}

function normalizeReason(value) {
  return /^[A-Z]+-[0-9]+:/.test(value) ? value.slice(value.indexOf(":") + 1) : value;
}

function countBy(values) {
  const result = {};
  for (const value of values) result[value] = (result[value] || 0) + 1;
  return result;
}

function unique(values) {
  return [...new Set(values)];
}
