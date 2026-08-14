// 파일 용도: exact 424의 세 기능군 runtime oracle catalog를 단일 fail-closed 조회/검증 경계로 결합한다.

import crypto from "node:crypto";

import {
  buildCoreExactOracleCatalog,
  coreExactOracleCaseIds,
  coreExactOracleFor,
  validateCoreExactOracleCatalog,
} from "./v390_ui_exact_core_oracles.mjs";
import {
  eventExactOracleCaseIds,
  eventExactOracleFor,
  validateEventExactOracleCatalog,
} from "./v390_ui_exact_event_oracles.mjs";
import {
  clientSafeExactOracleCaseIds,
  clientSafeExactOracleFor,
  validateClientSafeExactOracleCatalog,
} from "./v390_ui_exact_client_safe_oracles.mjs";

const expectedCaseCount = 424;
const orderedIds = Object.freeze([
  ...coreExactOracleCaseIds,
  ...eventExactOracleCaseIds(),
  ...clientSafeExactOracleCaseIds(),
]);
const catalog = buildExactRuntimeOracleCatalog();
const catalogById = new Map(catalog.map(item => [item.caseId, item]));

export const exactRuntimeOracleCaseIds = orderedIds;

export function buildExactRuntimeOracleCatalog({ implementation } = {}) {
  const core = implementation
    ? buildCoreExactOracleCatalog(implementation)
    : coreExactOracleCaseIds.map(coreExactOracleFor);
  return Object.freeze([
    ...core,
    ...eventExactOracleCaseIds().map(eventExactOracleFor),
    ...clientSafeExactOracleCaseIds().map(clientSafeExactOracleFor),
  ]);
}

export function exactRuntimeOracleFor(caseId) {
  return catalogById.get(String(caseId || "")) || null;
}

export function validateExactRuntimeOracleCatalog(candidateCatalog = catalog) {
  assert(Array.isArray(candidateCatalog), "exact runtime oracle catalog must be an array");
  const candidateIds = candidateCatalog.map(item => item?.caseId);
  assert(JSON.stringify(candidateIds) === JSON.stringify(orderedIds),
    "exact runtime oracle canonical order/coverage drift");
  const candidateById = new Map(candidateCatalog.map(item => [item.caseId, item]));
  const core = validateCoreExactOracleCatalog(
    coreExactOracleCaseIds.map(caseId => candidateById.get(caseId)),
  );
  const event = validateEventExactOracleCatalog();
  const clientSafe = validateClientSafeExactOracleCatalog();
  assert(orderedIds.length === expectedCaseCount,
    `exact runtime oracle count mismatch: ${orderedIds.length}/${expectedCaseCount}`);
  assert(new Set(orderedIds).size === expectedCaseCount, "exact runtime oracle case IDs must be globally unique");
  for (const caseId of orderedIds) {
    const spec = candidateById.get(caseId);
    assert(spec?.caseId === caseId, `${caseId} exact runtime oracle lookup drift`);
    assert(spec.route && spec.role && spec.visibleControl?.selector,
      `${caseId} exact runtime oracle route/role/control missing`);
    assert(Array.isArray(spec.requests) && spec.requests.length > 0,
      `${caseId} exact runtime oracle requests missing`);
    assert(Array.isArray(spec.dom) && spec.dom.length > 0,
      `${caseId} exact runtime oracle DOM assertions missing`);
    assert(Array.isArray(spec.stateSnapshots) && spec.stateSnapshots.length > 0,
      `${caseId} exact runtime oracle state snapshots missing`);
    assert(spec.cleanup?.strategy && Array.isArray(spec.cleanup?.targets),
      `${caseId} exact runtime oracle cleanup missing`);
  }
  const catalogSha256 = crypto.createHash("sha256")
    .update(JSON.stringify(candidateCatalog))
    .digest("hex");
  return Object.freeze({
    schema: "media-server.v390-ui-exact-runtime-oracle-catalog-validation.v1",
    caseCount: expectedCaseCount,
    catalogSha256,
    groups: Object.freeze({
      core: core.caseCount,
      event: event.caseCount || event.cases || eventExactOracleCaseIds().length,
      clientSafe: clientSafe.caseCount || clientSafe.canonicalCases || clientSafeExactOracleCaseIds().length,
    }),
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
