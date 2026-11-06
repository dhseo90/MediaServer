// 파일 용도: 실제 script inventory 분류와 dispatch 검사를 격리 입력으로 확인한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {execFileSync, spawnSync} from 'node:child_process';
import {parseServerDispatches} from './script_dispatch_parser.mjs';

const source = fs.readFileSync(new URL('./verify_script_inventory.mjs', import.meta.url), 'utf8');
const literalMatcher=vm.runInNewContext('('+source.slice(source.indexOf('function makeLiteralMatcher('))+')');
const rootDir = '/owned-inventory-fixture';
const command = 'scripts/internal/command.sh';
const orphan = 'scripts/internal/unregistered.mjs';
const server = '  verify-fixture)\n    require_internal command.sh\n    exec "${INTERNAL_DIR}/command.sh" "$@"\n    ;;';
function run(name, entries, serverText = server, trackedKeys = Object.keys(entries)) {
  const files = new Map(Object.entries(entries));
  const start = source.indexOf(`check("${name}", () => {`);
  const next = source.indexOf('\ncheck(', start + 1);
  const end = next < 0 ? source.indexOf('\nlet pass = 0;', start) : next;
  assert(start >= 0 && end > start, '실제 검사 callback 경계');
  const relative = file => path.relative(rootDir, file);
  vm.runInNewContext(source.slice(start, end), {
    rootDir, path, makeLiteralMatcher: literalMatcher, pythonNonOutputKeywordText,
    fs: {
      existsSync: file => files.has(relative(file)),
      statSync: () => ({mode: 0o755}),
    },
    pythonReferences: texts => pythonResolve(Object.fromEntries(texts), [...files.keys()]),
    check: (_label, fn) => fn(),
    assert: (ok, reason) => { if (!ok) throw new Error(reason); },
    parseServerDispatches: () => parseServerDispatches(serverText),
    gitLsFiles: args => trackedKeys.filter(file => !args.length || args.some(prefix => file.startsWith(prefix))),
    fileExists: file => files.has(file),
    readText: file => {
      assert(files.has(relative(file)), `fixture missing ${file}`);
      return files.get(relative(file));
    },
  });
}
const classify = entries => run('tracked scripts are classified and referenced', entries);
test('SI-01 command·실제 상대 import helper·명시 자체검사·수동 명령 분류', () => {
  classify({
    [command]: '',
    'scripts/internal/caller.mjs': "import './dependency.mjs';",
    'scripts/internal/dependency.mjs': 'export const value = 1;',
    'scripts/internal/focused.test.mjs': "import test from 'node:test'; test('case', () => {});",
    'scripts/internal/manual.sh': '#!/bin/bash',
    'docs/stream-verification.md': 'node scripts/internal/caller.mjs\nnode --test scripts/internal/focused.test.mjs\nbash scripts/internal/manual.sh',
  });
});
test('SI-02 미등록 및 파일명만 test인 스크립트 거부', () => {
  for (const file of [orphan, 'scripts/internal/unregistered.test.mjs']) {
    assert.throws(() => classify({[command]: '', [file]: ''}), /unclassified or unreferenced/);
  }
});
test('SI-03 실제 import 연결을 끊으면 남은 dependency 거부', () => {
  assert.throws(() => classify({
    [command]: '',
    'scripts/internal/caller.mjs': "import './wrong.mjs';",
    'scripts/internal/dependency.mjs': '',
    'docs/stream-verification.md': 'node scripts/internal/caller.mjs',
  }), /scripts\/internal\/dependency\.mjs/);
});
test('SI-04 누락·다른 실제 dispatch 대상 거부', () => {
  assert.throws(() => run('server.sh dispatch targets exist and are executable', {}), /missing target script/);
  assert.throws(() => run('server.sh dispatch targets exist and are executable', {[command]: ''},
    server.replace('require_internal command.sh', 'require_internal wrong.sh')), /dispatch command not found/);
});
for (const record of ['docs/release-artifacts/v4.1.1/failure.json', 'docs/release-artifacts/v4.1.0/run.md', 'docs/archive/run.md', 'failure.log']) {
  test(`SI-05 종료 기록의 경로·basename 참조는 등록이 아님: ${record}`, () => {
    for (const text of [orphan, path.basename(orphan)]) {
      assert.throws(() => classify({[command]: '', [orphan]: '', [record]: text}), /unclassified or unreferenced/);
    }
  });
}
test('SI-06 정상 분류는 종료 기록 추가·제거와 무관', () => {
  const entries = {[command]: '', [orphan]: '', 'docs/stream-verification.md': `node ${orphan}`};
  classify(entries);
  classify({...entries, 'docs/release-artifacts/v4.1.1/failure.json': orphan});
});
test('SI-07 현재 독립 실행 안내의 누락·잘못된 대상 거부', () => {
  const entries = {[command]: '', 'docs/development-guide.md': '', 'docs/stream-verification.md': `bash ${command}`};
  const name = 'current standalone script instructions target tracked files';
  run(name, entries);
  assert.throws(() => run(name, {...entries, 'docs/stream-verification.md': 'bash scripts/internal/missing.sh'}), /missing standalone script target/);
  assert.throws(() => run(name, {...entries, 'docs/stream-verification.md': 'node --test scripts/internal/wrong.test.mjs'}), /missing standalone script target/);
});

function pythonResolve(texts, tracked = Object.keys(texts)) {
  return JSON.parse(execFileSync('python3', [new URL('./script_inventory_python_refs.py', import.meta.url).pathname], {
    input: JSON.stringify({texts, tracked}), encoding: 'utf8', timeout: 5000,
  }));
}
const py = (consumer, extra = {}, tracked) => pythonResolve({
  'scripts/internal/caller.py': consumer, 'scripts/internal/local_dep.py': 'raise RuntimeError("must never execute")', ...extra,
}, tracked);
test('PY01 실제 import/alias/from/함수 내부 import 결속; module 실행 없음', () => {
  for (const code of ['import local_dep','import local_dep as dep','from local_dep import value','def f():\n import local_dep']) {
    const refs=py(code).references;assert.equal(refs.length,1);assert.equal(refs[0].target,'scripts/internal/local_dep.py');assert(refs[0].line>=1);
  }
});
test('PY02 주석·문자열·docstring·동적호출·filename 언급 거부',()=>{
  for(const code of ['# import local_dep','x="import local_dep"','"""import local_dep"""','__import__("local_dep")','x="local_dep.py"'])assert.deepEqual(py(code).references,[]);
});
test('PY03 자기/미존재/외부/relative/dotted/package symbol 거부',()=>{
  for(const code of ['import caller','import absent','import os','from . import local_dep','import pkg.local_dep','from pkg import local_dep'])assert.deepEqual(py(code).references,[]);
});
test('PY04 untracked/outside consumer와 동명 package 충돌 거부',()=>{
  assert.deepEqual(py('import local_dep',{},['scripts/internal/caller.py']).references,[]);
  assert.deepEqual(py('import local_dep',{},['scripts/internal/local_dep.py']).references,[]);
  assert.deepEqual(pythonResolve({'docs/old.py':'import local_dep','docs/local_dep.py':''}).references,[]);
  const ambiguous=py('import local_dep',{'scripts/internal/local_dep/__init__.py':''});assert.deepEqual(ambiguous.references,[]);assert.equal(ambiguous.unresolved[0].reason,'ambiguous-package');
  assert.deepEqual(py('import local_dep',{'scripts/internal/__init__.py':''}).references,[]);
});
test('PY05 다른 디렉터리 동명 파일은 정확한 sibling으로 결속하지 않음',()=>{
  const refs=pythonResolve({'scripts/a/caller.py':'import local_dep','scripts/b/local_dep.py':''}).references;assert.deepEqual(refs,[]);
});
test('PY06 실제 분류 callback: import 해소/끊김 FAIL 유지',()=>{
 const entries={[command]:'','scripts/internal/caller.py':'import local_dep','scripts/internal/local_dep.py':'','docs/stream-verification.md':'python3 scripts/internal/caller.py'};
 classify(entries);
 assert.throws(()=>classify({...entries,'scripts/internal/caller.py':'# import local_dep'}),/local_dep.py/);
});

// R01: 자기 자신과 순서를 포함해 이전 전체 열거 결과와 존재 여부를 비교한다.
test('R01 reference existence preserves prior substring semantics and input freshness',()=>{
 const file='scripts/internal/unregistered.mjs',base=path.basename(file);
 for(const text of ['',file,base,'prefix'+base+'suffix','unregisteredX.mjs']) {
  for(const self of [false,true])for(const reverse of [false,true]) {
   const entries={[command]:'',[file]:self?text:'','docs/current.md':self?'':text,'docs/empty.md':''};
   const ordered=Object.fromEntries(reverse?Object.entries(entries).reverse():Object.entries(entries));
   const expected=Object.entries(ordered).some(([p,t])=>p!==file&&(t.includes(file)||t.includes(base)));
   if(expected)classify(ordered);else assert.throws(()=>classify(ordered),/unclassified or unreferenced/);
  }
 }
 const entries={[command]:'',[file]:'','docs/current.md':base};
 classify(entries);entries['docs/current.md']='removed';
 assert.throws(()=>classify(entries),/unclassified or unreferenced/);
 entries['docs/current.md']=file;classify(entries);
});
test('R01 success retains all checks; failure default and fail-fast return contracts remain',()=>{
 const start=source.indexOf('let pass = 0;'),end=source.indexOf('\nfunction check(',start);
 for(const failFast of [false,true])for(const bad of [false,true]){
  const visited=[],logs=[];let exit=null;
  vm.runInNewContext(source.slice(start,end),{checks:[{name:'a',fn(){visited.push('a');if(bad)throw Error('expected');}},{name:'b',fn(){visited.push('b');}}],rawArgs:failFast?['--fail-fast']:[],console:{log:x=>logs.push(x)},process:{exit:n=>{exit=n;}}});
  assert.deepEqual(visited,bad&&failFast?['a']:['a','b']);
  assert.equal(exit,bad?1:null);assert(logs.includes('- fail: '+Number(bad)));
 }
});

// R02: 실제 literal 목록과 callback을 읽으며 파일명으로 재구성하지 않는다.
const phraseStart=source.indexOf('const forbiddenSnippets = [')+'const forbiddenSnippets = '.length;
const phrases=Array.from(vm.runInNewContext(source.slice(phraseStart,source.indexOf('];',phraseStart)+1)));
const phraseCheck='critical verifier pass output avoids grouped feature-result wording';
const expectedMatches=(text,needles)=>[...new Set(needles.filter(n=>text.includes(n)))].sort();
test('R02 literal matcher equals includes for overlap, prefix, metacharacters and UTF16',()=>{
 const cases=[['abc','ab','bc','a'],['a.b','a+b','[x]','a|b','\\','^$','(x)','?','*','{x}'],['한글','글','😀','\ud83d','\ude00','\ufffd'],['','x','x'],[]];
 for(const needles of cases){const find=literalMatcher(needles);for(const text of ['',...needles,needles.join(''),needles.join('\n'),'ABC aXb'])assert.deepEqual([...find(text)].sort(),expectedMatches(text,needles));}
 let seed=713;const rand=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)%8);const alphabet='ab.[\\한😀';
 for(let i=0;i<100;i++){const needles=Array.from({length:7},()=>Array.from({length:1+rand()},()=>alphabet[rand()]).join(''));const text=Array.from({length:40},()=>alphabet[rand()]).join('');assert.deepEqual([...literalMatcher(needles)(text)].sort(),expectedMatches(text,needles));}
});
test('R02 every actual forbidden literal and report order match the old scan',()=>{
 const find=literalMatcher(phrases);
 for(const text of ['',...phrases,'prefix '+phrases.join('\n')+' suffix'])assert.deepEqual(phrases.filter(n=>find(text).has(n)),phrases.filter(n=>text.includes(n)));
 const text=phrases.join('\n');let error;try{run(phraseCheck,{'AGENTS.md':'','docs/current.md':text});}catch(e){error=e;}
 assert(error);assert.equal(error.message,'grouped feature-result wording remains:\n'+phrases.filter(n=>text.includes(n)).map(n=>'docs/current.md: '+n).join('\n'));
});
test('R02 actual callback preserves tracked scope, historical/binary text and exclusions',()=>{
 run(phraseCheck,{'AGENTS.md':'','docs/current.md':'ordinary safe text'});
 for(const file of ['docs/current.md','docs/release-artifacts/fixture.tar.gz','scripts/internal/tool.py','AGENTS.md'])assert.throws(()=>run(phraseCheck,{'AGENTS.md':'',[file]:phrases[0]}),/grouped feature-result/);
 run(phraseCheck,{'AGENTS.md':'','docs/untracked.md':phrases[0]},server,['AGENTS.md']);
 run(phraseCheck,{'AGENTS.md':'','docs/image.png':phrases[0]});
 run(phraseCheck,{'AGENTS.md':'','scripts/internal/verify_script_inventory.mjs':phrases[0]});
});
test('R02 changed input and missing required or forged wording keep failures',()=>{
 const entries={'AGENTS.md':'','docs/current.md':'safe'};run(phraseCheck,entries);entries['docs/current.md']=phrases[0];assert.throws(()=>run(phraseCheck,entries),/grouped feature-result/);entries['docs/current.md']='safe';run(phraseCheck,entries);
 // A5는 참조 존재 여부와 독립적으로 필수 실제 target을 검증한다.
 assert.throws(()=>run('current standalone script instructions target tracked files',{'docs/stream-verification.md':'node scripts/internal/missing.mjs','docs/development-guide.md':''}),/missing standalone/);
 // A12는 금지 literal의 부재 검사이므로 없으면 PASS이며 필수 항목 누락 FAIL이 아니다.
 assert.deepEqual([...literalMatcher(['case-sensitive'])('CASE-SENSITIVE')],[]);
});
test('R02 R01 existential references do not bypass independent target validation',()=>{
 const target='scripts/internal/unregistered.mjs';
 for(const guide of [target,target+'\n'+target,target+'\nwrong.mjs','elsewhere/'+path.basename(target)])classify({[command]:'',[target]:'','docs/current.md':guide});
 assert.throws(()=>classify({[command]:'',[target]:'','docs/current.md':'untracked.mjs'}),/unclassified/);
 const entries={[command]:'',[target]:'','docs/stream-verification.md':'node '+target+'\nnode scripts/internal/missing.mjs','docs/development-guide.md':''};
 classify(entries);assert.throws(()=>run('current standalone script instructions target tracked files',entries),/missing standalone/);
});

test('R02 last assertion rejects missing and forged required option guard literals',()=>{
 const name='user-facing JS option parsers reject unknown options';
 const start=source.indexOf('const strictScripts = [')+'const strictScripts = '.length;
 const scripts=Array.from(vm.runInNewContext(source.slice(start,source.indexOf('];',start)+1)));
 const entries=Object.fromEntries(scripts.map(file=>['scripts/internal/'+file,'script_arg_utils.mjs assertKnownOptions']));
 run(name,entries);
 for(const text of ['assertKnownOptions','script_arg_utils.mjs','script_arg_utilsXmjs assertKnownOption','SCRIPT_ARG_UTILS.MJS assertKnownOptions']){
  assert.throws(()=>run(name,{...entries,['scripts/internal/'+scripts[0]]:text}),/missing script_arg_utils import|missing assertKnownOptions/);
 }
});
test('R02 actual phrase callback and loop return process exit zero or one on synthetic input',()=>{
 const begin=source.indexOf(`check("${phraseCheck}", () => {`);
 const callback=source.slice(begin,source.indexOf('\ncheck(',begin+1));
 const loop=source.slice(source.indexOf('let pass = 0;'),source.indexOf('\nfunction check('));
 for(const bad of [false,true]){
  const input=bad?phrases[0]:'safe';
  const fixture=`const path=require('node:path'); const rootDir='/fixture'; const rawArgs=['--fail-fast']; const checks=[];
  function check(name,fn){checks.push({name,fn});}
  function assert(ok,message){if(!ok)throw Error(message);}
  function gitLsFiles(args){return args[0]==='docs'?['docs/current.md']:[];}
  function fileExists(){return true;}
  function readText(file){return file.endsWith('AGENTS.md')?'':${JSON.stringify(input)};}
  ${source.slice(source.indexOf('function makeLiteralMatcher('))}
  ${callback}
  ${loop}`;
  const result=spawnSync(process.execPath,['-e',fixture],{encoding:'utf8',timeout:2000});
  assert.ifError(result.error);assert.equal(result.signal,null);assert.equal(result.status,bad?1:0);
  assert(result.stdout.includes(bad?'[fail] '+phraseCheck:'[pass] '+phraseCheck));
  assert(result.stdout.includes('- fail: '+Number(bad)));
 }
});

// R03: Python 문법은 구별하되 실제 출력 문자열과 불명확한 문맥은 보수적으로 검사한다.
function pythonNonOutputKeywordText(text) {
 return JSON.parse(execFileSync('python3',[new URL('./script_inventory_python_refs.py',import.meta.url).pathname],{
  input:JSON.stringify({a12Text:text}),encoding:'utf8',timeout:5000,
 })).searchText;
}
test('R03 keyword syntax is non-output; literals, comments, fstrings and malformed input stay guarded',()=>{
 const needle=phrases.find(n=>n.startsWith(', ')&&n.endsWith('='));
 const entries=text=>({'AGENTS.md':'','scripts/internal/example.py':text});
 const actual=fs.readFileSync(new URL('./recording_degraded_http_run.test.py',import.meta.url),'utf8');
 assert(actual.includes(needle));assert(literalMatcher(phrases)(actual).has(needle));run(phraseCheck,entries(actual));
 const syntax='record = dict(first=1'+needle+'False)';run(phraseCheck,entries(syntax));
 assert.equal(pythonNonOutputKeywordText(syntax).length,syntax.length);
 run(phraseCheck,entries('이름 = dict(first=1'+needle+'False)'));
 for(const text of [
  'print('+JSON.stringify('[pass] tables=1'+needle+'0')+')',
  'print('+JSON.stringify('[pass] alpha and beta '+phrases[0]) +')',
  'data = '+JSON.stringify(needle),
  '# '+needle,
  'f"{dict(first=1'+needle+'False)=}"',
  'broken syntax '+needle,
  syntax+'; print('+JSON.stringify(needle)+')',
 ])assert.throws(()=>run(phraseCheck,entries(text)),/grouped feature-result/);
 run(phraseCheck,entries('print("[pass] single feature")'));
 run(phraseCheck,entries('import sys\nprint("[fail] output limit exceeded", file=sys.stderr)'));
 run(phraseCheck,entries('print('+JSON.stringify(needle.slice(0,-1))+')'));
 run(phraseCheck,entries('print('+JSON.stringify(needle.toUpperCase())+')'));
 assert.throws(()=>run(phraseCheck,{'docs/current.md':'safe'}),/fixture missing/);
});
