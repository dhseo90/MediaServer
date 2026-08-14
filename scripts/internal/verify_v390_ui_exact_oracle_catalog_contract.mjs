#!/usr/bin/env node
// 파일 용도: exact 424 runtime oracle 통합 catalog의 전수·중복·조회 결속을 검증한다.

import {
  exactRuntimeOracleCaseIds,
  exactRuntimeOracleFor,
  validateExactRuntimeOracleCatalog,
} from "./v390_ui_exact_oracle_catalog.mjs";

const result = validateExactRuntimeOracleCatalog();
assert(result.caseCount === 424, "integrated exact runtime oracle count must be 424");
assert(exactRuntimeOracleCaseIds.length === 424, "integrated exact runtime oracle ID count must be 424");
assert(new Set(exactRuntimeOracleCaseIds).size === 424, "integrated exact runtime oracle IDs must be unique");
for (const caseId of exactRuntimeOracleCaseIds) {
  const spec = exactRuntimeOracleFor(caseId);
  assert(spec?.caseId === caseId, `${caseId} integrated exact runtime oracle lookup failed`);
}
assert(exactRuntimeOracleFor("UNKNOWN-999") === null, "unknown exact runtime oracle must fail closed");

console.log("[pass] integrated catalog covers 424 unique exact runtime oracles");
console.log("[pass] every exact ID resolves to its immutable group-owned runtime oracle");
console.log("[pass] unknown exact IDs fail closed");
console.log("\n== v3.9.0 integrated exact runtime oracle catalog summary ==");
console.log(`- cases: ${result.caseCount}`);
console.log(`- catalogSha256: ${result.catalogSha256}`);
console.log("- pass: 3");
console.log("- fail: 0");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
