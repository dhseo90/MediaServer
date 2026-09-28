// 파일 용도: 초기 소스 집합과 계정별 허용 범위 대조 검사.
import assert from 'node:assert/strict';
import {sourceRegistryIds, scopedSourceMatch} from './recording_foundation_auth_helpers.mjs';
const start = Date.now();
let passed = 0, failed = 0;
function check(name, fn) {
  try { fn(); passed++; console.log(`[pass] ${name}`); }
  catch { failed++; console.log(`[fail] ${name}`); }
}
const seeded = ['1', '2', '9101'];
check('seeded initial IDs', () => assert.deepEqual(sourceRegistryIds({sources: seeded.map(sourceId => ({sourceId}))}), seeded));
check('admin seeded extra allowed', () => assert(scopedSourceMatch(seeded, ['9101', '2', '1'])));
check('allowed scope exact', () => assert(scopedSourceMatch(seeded, ['9101'], '9101')));
check('other absent scope empty', () => assert(scopedSourceMatch(seeded, [], '9201')));
check('missing rejected', () => assert(!scopedSourceMatch(seeded, ['9101'])));
check('duplicate rejected', () => assert(!scopedSourceMatch(seeded, ['1', '2', '9101', '9101'])));
check('invalid ID rejected', () => assert(!scopedSourceMatch(seeded, ['1', '2', 'secret/raw'])));
check('unauthorized extra rejected', () => assert(!scopedSourceMatch(seeded, ['9101', '2'], '9101')));
check('missing sources rejected', () => assert.throws(() => sourceRegistryIds({})));
check('duplicate initial IDs rejected', () => assert.throws(() => sourceRegistryIds({sources:[{sourceId:'1'},{sourceId:'1'}]})));
check('restart exact accepted', () => assert(scopedSourceMatch(seeded, sourceRegistryIds({sources:seeded.map(sourceId=>({sourceId}))}))));
check('restart missing rejected', () => assert(!scopedSourceMatch(seeded, ['1', '9101'])));
check('restart extra rejected', () => assert(!scopedSourceMatch(seeded, [...seeded, '3'])));
check('successful POST tracked', () => assert(scopedSourceMatch([...seeded, '9201'], ['9201', ...seeded])));
check('invalid scope rejected', () => assert(!scopedSourceMatch(seeded, [], 'raw/value')));
if (passed + failed !== 15) failed++;
console.log(`[summary] passed=${passed} failed=${failed} elapsedMs=${Date.now()-start}`);
process.exitCode = failed ? 1 : 0;
