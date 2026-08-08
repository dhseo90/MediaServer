// 파일 용도: parent/child diagnostic runner가 공유하는 selection mode와 selection binding을 검증한다.

import { createHash } from "node:crypto";

export const diagnosticSelectionModes = Object.freeze({
  fixedRemainingSweep: "fixed-remaining-sweep",
  explicitPositiveCase: "explicit-positive-case",
  sharedAdapterImpactSweep: "shared-adapter-impact-sweep",
  diagnosticFailureCensusSweep: "diagnostic-failure-census-sweep",
  diagnosticFailureClosureSweep: "diagnostic-failure-closure-sweep",
  eventRecordOwnerImpactSweep: "event-record-owner-impact-sweep",
});

export const diagnosticSelectionModeRegistry = Object.freeze([
  Object.freeze({
    mode: diagnosticSelectionModes.fixedRemainingSweep,
    artifactSchema: null,
    selectionKind: "canonical-fixed-suffix",
    expectedCount: 125,
    expectedStartCaseId: "EVT-023",
  }),
  Object.freeze({
    mode: diagnosticSelectionModes.explicitPositiveCase,
    artifactSchema: null,
    selectionKind: "single-positive",
    expectedCount: 1,
    expectedStartCaseId: null,
  }),
  Object.freeze({
    mode: diagnosticSelectionModes.sharedAdapterImpactSweep,
    artifactSchema: "media-server.v390-ui-shared-adapter-impact.v1",
    selectionKind: "canonical-full-manifest",
    expectedCount: 424,
    expectedStartCaseId: null,
  }),
  Object.freeze({
    mode: diagnosticSelectionModes.diagnosticFailureCensusSweep,
    artifactSchema: "media-server.v390-ui-diagnostic-failure-census.v1",
    selectionKind: "immutable-failure-census",
    expectedCount: 99,
    expectedStartCaseId: null,
  }),
  Object.freeze({
    mode: diagnosticSelectionModes.diagnosticFailureClosureSweep,
    artifactSchema: "media-server.v390-ui-diagnostic-failure-closure.v1",
    selectionKind: "immutable-failure-closure",
    expectedCount: 7,
    expectedStartCaseId: null,
  }),
  Object.freeze({
    mode: diagnosticSelectionModes.eventRecordOwnerImpactSweep,
    artifactSchema: "media-server.v390-ui-event-record-owner-impact.v1",
    selectionKind: "immutable-event-record-owner-impact",
    expectedCount: 6,
    expectedStartCaseId: null,
  }),
]);

const selectionContractSchema = "media-server.v390-ui-diagnostic-selection.v1";
const registryByMode = new Map(diagnosticSelectionModeRegistry.map(entry => [entry.mode, entry]));
const registryByArtifactSchema = new Map(diagnosticSelectionModeRegistry
  .filter(entry => entry.artifactSchema)
  .map(entry => [entry.artifactSchema, entry]));

export function validateDiagnosticSelectionMode(mode) {
  assert(typeof mode === "string" && mode.length > 0,
    "diagnostic selection mode must be non-empty");
  const entry = registryByMode.get(mode);
  assert(entry, `unsupported diagnostic selection mode: ${mode}`);
  return entry;
}

export function diagnosticSelectionModeForArtifactSchema(schema) {
  assert(typeof schema === "string" && schema.length > 0,
    "diagnostic selection artifact schema must be non-empty");
  const entry = registryByArtifactSchema.get(schema);
  assert(entry, `unsupported diagnostic selection artifact schema: ${schema}`);
  return entry.mode;
}

export function buildDiagnosticSelectionContract({ mode, selectedIds }) {
  validateDiagnosticSelectionMode(mode);
  validateSelectedIds(selectedIds);
  const payload = {
    schema: selectionContractSchema,
    mode,
    startCaseId: selectedIds[0],
    endCaseId: selectedIds.at(-1),
    selectedIds: [...selectedIds],
    targetCaseCount: selectedIds.length,
    targetCaseIdsSha256: sha256(selectedIds.join("\n")),
  };
  return Object.freeze({
    ...payload,
    selectedIds: Object.freeze(payload.selectedIds),
    digest: sha256(stableJson(payload)),
  });
}

export function validateDiagnosticSelectionContract(
  value,
  { expectedMode = "", manifestCaseIds = [] } = {},
) {
  assert(value && typeof value === "object" && !Array.isArray(value),
    "diagnostic selection contract must be an object");
  assert(JSON.stringify(Object.keys(value).sort()) === JSON.stringify([
    "digest",
    "endCaseId",
    "mode",
    "schema",
    "selectedIds",
    "startCaseId",
    "targetCaseCount",
    "targetCaseIdsSha256",
  ]), "diagnostic selection contract shape mismatch");
  assert(value.schema === selectionContractSchema,
    "diagnostic selection contract schema mismatch");
  const entry = validateDiagnosticSelectionMode(value.mode);
  if (expectedMode) {
    assert(value.mode === expectedMode,
      "diagnostic selection contract mode mismatch");
  }
  validateSelectedIds(value.selectedIds);
  assert(value.startCaseId === value.selectedIds[0] &&
    value.endCaseId === value.selectedIds.at(-1) &&
    value.targetCaseCount === value.selectedIds.length &&
    value.targetCaseIdsSha256 === sha256(value.selectedIds.join("\n")),
  "diagnostic selection contract ID binding mismatch");
  const { digest, ...payload } = value;
  assert(/^[0-9a-f]{64}$/.test(digest) && digest === sha256(stableJson(payload)),
    "diagnostic selection contract digest mismatch");

  if (manifestCaseIds.length > 0) {
    validateSelectedIds(manifestCaseIds);
    const indexById = new Map(manifestCaseIds.map((caseId, index) => [caseId, index]));
    const indexes = value.selectedIds.map(caseId => indexById.get(caseId));
    assert(indexes.every(Number.isInteger),
      "diagnostic selection contract contains an unknown case ID");
    assert(indexes.every((index, position) => position === 0 || indexes[position - 1] < index),
      "diagnostic selection contract case order mismatch");
    assert(value.targetCaseCount === entry.expectedCount,
      `diagnostic selection contract count mismatch for ${value.mode}`);
    if (entry.selectionKind === "canonical-fixed-suffix") {
      const expectedStartIndex = manifestCaseIds.indexOf(entry.expectedStartCaseId);
      assert(expectedStartIndex >= 0 &&
        JSON.stringify(value.selectedIds) ===
          JSON.stringify(manifestCaseIds.slice(expectedStartIndex)),
      "fixed remaining diagnostic selection contract drift");
    } else if (entry.selectionKind === "canonical-full-manifest") {
      assert(JSON.stringify(value.selectedIds) === JSON.stringify(manifestCaseIds),
        "shared adapter diagnostic selection contract drift");
    }
  }
  return value;
}

function validateSelectedIds(selectedIds) {
  assert(Array.isArray(selectedIds) && selectedIds.length > 0,
    "diagnostic selection IDs must be non-empty");
  assert(selectedIds.every(caseId => typeof caseId === "string" && /^[A-Z]+-\d{3}$/.test(caseId)),
    "diagnostic selection contains an invalid case ID");
  assert(new Set(selectedIds).size === selectedIds.length,
    "diagnostic selection contains duplicate case IDs");
}

function sha256(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort()
      .map(key => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
