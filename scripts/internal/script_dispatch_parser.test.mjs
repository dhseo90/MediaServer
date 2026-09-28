// 파일 용도: 고정 명령 분기 파서의 지원 및 거부 경계 검사.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseServerDispatches} from './script_dispatch_parser.mjs';
let passed=0,failed=0;const start=Date.now();
function check(name,fn){try{fn();passed++;console.log(`[pass] ${name}`);}catch{failed++;console.log(`[fail] ${name}`);}}
const conditional='  verify-v410-recording-startup)\n    if [[ "${1:-}" == "--unit" ]]; then\n      shift\n      require_internal "verify_v410_recording_startup.sh"\n      exec "${INTERNAL_DIR}/verify_v410_recording_startup.sh" "$@"\n    fi\n    require_internal "verify_v410_recording_startup.mjs"\n    exec node "$ROOT_DIR/scripts/internal/verify_v410_recording_startup.mjs" "$@"\n    ;;';
check('actual conditional both targets',()=>assert.deepEqual(parseServerDispatches(conditional),[{command:'verify-v410-recording-startup',script:'verify_v410_recording_startup.sh'},{command:'verify-v410-recording-startup',script:'verify_v410_recording_startup.mjs'}]));
const block=(exec,require='x.sh',name='one')=>`  ${name})\n    require_internal ${require}\n    ${exec}\n    ;;`;
for(const prefix of ['', 'bash ', 'node '])check(`straight ${prefix||'direct'}`,()=>assert.deepEqual(parseServerDispatches(block(`exec ${prefix}"\${INTERNAL_DIR}/x.sh" "$@"`)),[{command:'one',script:'x.sh'}]));
check('aliases',()=>assert.equal(parseServerDispatches(block('exec "${INTERNAL_DIR}/x.sh"','x.sh','one|two')).length,2));
check('braced root canonical',()=>assert.deepEqual(parseServerDispatches(block('exec node "${ROOT_DIR}/scripts/internal/x.mjs"','x.mjs')),[{command:'one',script:'x.mjs'}]));
for(const [name,line] of [['external','exec "/tmp/x.sh"'],['python','exec python "${INTERNAL_DIR}/x.sh"'],['comment','# exec "${INTERNAL_DIR}/x.sh"'],['string','echo \'exec "${INTERNAL_DIR}/x.sh"\''],['escape','exec "${INTERNAL_DIR}/../x.sh"']])check(`reject ${name}`,()=>assert.deepEqual(parseServerDispatches(block(line)),[]));
check('other case require cannot leak',()=>assert.deepEqual(parseServerDispatches('  one)\n    require_internal x.sh\n    ;;\n  two)\n    exec "${INTERNAL_DIR}/x.sh"\n    ;;'),[]));
check('fixed source region argument',()=>assert.equal(parseServerDispatches(block('exec "${INTERNAL_DIR}/x.sh" --source-region-contract "$@"')).length,1));
check('fixed fixture arguments',()=>assert.equal(parseServerDispatches(block('exec "${INTERNAL_DIR}/x.sh" --fixture-matrix --modes off,diagnostic --fail-on-missing-fixtures --fail-on-hold "$@"')).length,1));
for(const tail of ['$(evil)','; exec anything','# exec anything'])check(`reject shell tail ${tail}`,()=>assert.deepEqual(parseServerDispatches(block('exec "${INTERNAL_DIR}/x.sh" '+tail)),[]));
check('all old dispatch pairs retained and only startup added',()=>{
  const server=fs.readFileSync(new URL('../../server.sh',import.meta.url),'utf8'),old=[];
  const regex=/^\s{2}([a-zA-Z0-9_.|-]+)\)\n\s+require_internal [^\n]+\n\s+exec (?:bash |node )?"\$\{INTERNAL_DIR\}\/([^"\n]+)"/gm;
  for(const m of server.matchAll(regex))for(const command of m[1].split('|'))old.push(`${command}:${m[2]}`);
  const next=new Set(parseServerDispatches(server).map(x=>`${x.command}:${x.script}`));
  assert(old.length>0);assert.deepEqual(old.filter(x=>!next.has(x)),[]);
  assert.deepEqual([...next].filter(x=>!old.includes(x)).sort(),[
    'verify-v410-recording-startup:verify_v410_recording_startup.mjs',
    'verify-v410-recording-startup:verify_v410_recording_startup.sh']);
  console.log(`[dispatch-census] old=${old.length} next=${next.size} missing=0 added=2`);
});
if(passed+failed!==18)failed++;
console.log(`[summary] passed=${passed} failed=${failed} elapsedMs=${Date.now()-start}`);process.exitCode=failed?1:0;
