// 파일 용도: 보존 헤더 예외의 실제 검증기 실행과 실패 경계를 검사한다.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
if(process.argv.slice(2).some(x=>!['--red','--exact-findings','--python-comments','--selected-files'].includes(x))||process.argv.length>3)process.exit(2);
const EXACT_ORACLE = Object.freeze({
  "contractPath": path.join(repo, "test/fixtures/code-comment-policy/contract.json"),
  "contractSha256": "4a771a8e66c2a8234985c44dcdd5448173b3be82034b7237009fc948d5b7e3ea",
  "ledgerPath": path.join(repo, "test/fixtures/code-comment-policy/findings.json.gz"),
  "ledgerSha256": "87d84e48fe0214c00555a0d58b9499fabae408aedcf756a5ada4cf51b6ffc15d",
  "approvalPath": path.join(repo, "config/code-comment-approval/approval-record.json"),
  "approvalSha256": "84eb37232adfcd967dcacfc48ad2c83eac6aa141a1816add6345e8fb07e41b52",
  "priorCheckerPath": path.join(repo, "test/fixtures/code-comment-policy/prior-checker.mjs.txt"),
  "priorCheckerSha256": "7f00a6deb738c5d8fdc77095ceacca1d192c9c6427bdf3682b9d005230c0ac2b",
  "priorPolicyPath": path.join(repo, "test/fixtures/code-comment-policy/prior-policy.json")
});
const red=process.argv[2]==='--red',start=Date.now();
const exceptions=[
  {
    "path": "docs/release-artifacts/v4.1.0/20260904-s05-identity-fix/resume-verification.mjs",
    "sha256": "fae3570778ce5aa602aa25f6761e7e347ab5de56efec614d0dfd1718050bb9b4",
    "reason": "당시 실행 source의 해시 증거를 보존하므로 상단 주석을 변경하지 않는다."
  },
  {
    "path": "docs/release-artifacts/v4.1.0/20260904-s05-identity-fix/verify-actual-link-reader.mjs",
    "sha256": "6629b50fe944c30a3c49c828fdb3f0567ce7269610e7264ae958a628f9204110",
    "reason": "당시 실행 source의 해시 증거를 보존하므로 상단 주석을 변경하지 않는다."
  },
  {
    "path": "docs/release-artifacts/v4.1.0/20260904-s05-identity-fix/verify-actual-link-reader.test.mjs",
    "sha256": "b26a9265c9de38370259075edaeb12ef8b70ceccd74890db357094714a4c336e",
    "reason": "당시 실행 source의 해시 증거를 보존하므로 상단 주석을 변경하지 않는다."
  },
  {
    "path": "docs/release-artifacts/v4.1.0/20260904-s05-identity-fix/verify-actual.mjs",
    "sha256": "dfa43d418f298fd81038267593efd2583542b37f748cd29218372196d68b5100",
    "reason": "당시 실행 source의 해시 증거를 보존하므로 상단 주석을 변경하지 않는다."
  },
  {
    "path": "docs/release-artifacts/v4.1.0/20260904-s05-identity-red/reproduce.mjs",
    "sha256": "633a714475ca8aad920df8ad2e7ab75536f51017ab215817cbd53ca2545de7df",
    "reason": "당시 실행 source의 해시 증거를 보존하므로 상단 주석을 변경하지 않는다."
  },
  {
    "path": "docs/release-artifacts/v4.1.0/20260905-s05-identity-actual-rerun/verify-actual-rerun.mjs",
    "sha256": "0628b00fc2d5a2b48928ed77a7c9c9e1f00e07ef574b4a36c544cc0fe36b2e8c",
    "reason": "당시 실행 source의 해시 증거를 보존하므로 상단 주석을 변경하지 않는다."
  }
];
if(process.argv[2]==='--selected-files'){runSelectedFiles();process.exit(process.exitCode||0);}
if(process.argv[2]==='--python-comments'){runPythonComments();process.exit(process.exitCode||0);}
if(process.argv[2]==='--exact-findings'){runExactFindings();process.exit(process.exitCode||0);}
const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'s09-preserved-header-')));
let passed=0,failed=0,index=0;
function check(name,change,want,marker){
  const dir=path.join(root,String(++index));
  fs.mkdirSync(path.join(dir,'scripts/internal'),{recursive:true});
  fs.mkdirSync(path.join(dir,'config'));
  for(const file of ['verify_code_comments.mjs','script_arg_utils.mjs'])
    fs.copyFileSync(path.join(repo,'scripts/internal',file),path.join(dir,'scripts/internal',file));
  const policy=JSON.parse(fs.readFileSync(path.join(repo,'config/code_comment_policy.json')));
  policy.preservedHeaderExceptions=structuredClone(exceptions);
  for(const item of exceptions){const p=path.join(dir,item.path);fs.mkdirSync(path.dirname(p),{recursive:true});fs.copyFileSync(path.join(repo,item.path),p);}
  copyExactAssets(dir,policy);
  change(dir,policy);
  fs.writeFileSync(path.join(dir,'config/code_comment_policy.json'),JSON.stringify(policy));
  const r=spawnSync(process.execPath,[path.join(dir,'scripts/internal/verify_code_comments.mjs')],{encoding:'utf8',timeout:10000,maxBuffer:1000000,env:{PATH:process.env.PATH}});
  const ok=!r.error&&!r.signal&&r.status===want&&(!marker||(r.stdout||'').includes(marker));
  console.log(`[${ok?'pass':'fail'}] ${name} exit=${r.status}`);
  console.log(`[ph-receipt] ${JSON.stringify({name,command:[process.execPath,path.join(dir,'scripts/internal/verify_code_comments.mjs')],cwd:process.cwd(),pid:r.pid,expectedExit:want,expectedMarker:marker||null,exit:r.status,signal:r.signal,error:r.error?.message||null,stdout:r.stdout||'',stderr:r.stderr||'',assertionPassed:ok})}`);
  if(ok)passed++;else failed++;
}
try{
  check('PH01 exact six accepted',()=>{},0);
  if(!red){
    check('PH02 one byte rejected',d=>fs.appendFileSync(path.join(d,exceptions[0].path),' '),1,'preserved header');
    check('PH03 valid header cannot bypass hash',d=>{const p=path.join(d,exceptions[0].path);fs.writeFileSync(p,'// 파일 용도: 변경된 파일\n'+fs.readFileSync(p));},1,'preserved header');
    check('PH04 unregistered header rejected',d=>fs.writeFileSync(path.join(d,'unregistered.mjs'),'const x=1;\n'),1,'상단 용도');
    check('PH05 English still checked',(d,p)=>{const f=path.join(d,exceptions[0].path);fs.writeFileSync(f,'// English comment\n');p.preservedHeaderExceptions[0].sha256=crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');},1,'한글 설명');
    check('PH06 deleted file rejected',d=>fs.unlinkSync(path.join(d,exceptions[0].path)),1,'preserved header');
    check('PH07 duplicate rejected',(d,p)=>p.preservedHeaderExceptions.push({...exceptions[0]}),1,'preserved header');
    check('PH08 malformed hash rejected',(d,p)=>p.preservedHeaderExceptions[0].sha256='BAD',1,'preserved header');
    check('PH09 escape rejected',(d,p)=>p.preservedHeaderExceptions[0].path='../escape.mjs',1,'preserved header');
    check('PH10 leaf symlink rejected',d=>{const f=path.join(d,exceptions[0].path);fs.renameSync(f,f+'.saved');fs.symlinkSync(f+'.saved',f);},1,'preserved header');
    check('PH11 parent symlink rejected',d=>{const f=path.join(d,'docs');fs.renameSync(f,f+'-saved');fs.symlinkSync(f+'-saved',f);},1,'preserved header');
    check('PH12 missing Korean reason rejected',(d,p)=>p.preservedHeaderExceptions[0].reason='',1,'preserved header');
    check('PH13 noncanonical path rejected',(d,p)=>p.preservedHeaderExceptions[0].path='./'+exceptions[0].path,1,'preserved header');
    check('PH14 nonarray rejected',(d,p)=>p.preservedHeaderExceptions={},1,'preserved header');
    check('PH15 current code exception rejected',(d,p)=>{const f='scripts/current.mjs';fs.copyFileSync(path.join(d,exceptions[0].path),path.join(d,f));p.preservedHeaderExceptions.push({...exceptions[0],path:f});},1,'preserved header');
  }
}catch{failed++;console.log('[fail] fixture execution error');}
finally{
  function size(p){const s=fs.lstatSync(p);return s.isDirectory()?fs.readdirSync(p).reduce((n,k)=>n+size(path.join(p,k)),0):s.size;}
  const bytes=size(root);fs.rmSync(root,{recursive:true,force:true});
  let absent=false;try{fs.lstatSync(root);}catch(e){if(e.code==='ENOENT')absent=true;else throw e;}
  if(!absent)failed++;
  console.log(`[cleanup] path=${root} bytes=${bytes} absent=${absent}`);
}
if(passed+failed!==(red?1:15)){failed++;console.log('[fail] required case count');}
console.log(JSON.stringify({passed,failed,elapsedMs:Date.now()-start}));
process.exitCode=failed?1:0;

// 승인된 제안과 CC01 원장을 독립 기대값으로 읽는다. 정책에서 기대값을 만들지 않는다.
function exactOracle() {
  const contractBytes = fs.readFileSync(EXACT_ORACLE.contractPath);
  const ledgerBytes = gunzipSync(fs.readFileSync(EXACT_ORACLE.ledgerPath), {maxOutputLength: 4 * 1024 * 1024});
  assert.equal(hashBytes(contractBytes), EXACT_ORACLE.contractSha256);
  assert.equal(hashBytes(ledgerBytes), EXACT_ORACLE.ledgerSha256);
  return { contract: JSON.parse(contractBytes), ledger: JSON.parse(ledgerBytes) };
}
function hashBytes(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function copyExactAssets(dir, policy) {
  const { contract } = exactOracle();
  for (const item of new Map(contract.scope.entries.map(item => [item.path, item])).values()) {
    const bytes = fs.readFileSync(path.join(repo, item.path));
    assert.equal(hashBytes(bytes), item.fileSha256); assert.equal(bytes.length, item.fileBytes);
    const target = path.join(dir, item.path); fs.mkdirSync(path.dirname(target), {recursive:true}); fs.writeFileSync(target, bytes);
  }
  const bytes = fs.readFileSync(EXACT_ORACLE.approvalPath);
  assert.equal(hashBytes(bytes), EXACT_ORACLE.approvalSha256);
  const target = path.join(dir, 'approval-record.json'); fs.writeFileSync(target, bytes);
  policy.exactPreservedFindings.approvalRecord.path = target;
  fs.copyFileSync(path.join(repo,'config/code-comment-approval/user-approval.txt'),path.join(dir,'user-approval.txt'));
}
function runExactFindings() {
  const oracle = exactOracle();
  const approvedIds = ['CC01-0001','CC01-0002','CC01-0003','CC01-0105','CC01-0106'];
  assert.deepEqual(oracle.contract.scope.entries.map(x=>x.originalFindingId), approvedIds);
  const historical = [...new Set(oracle.contract.scope.entries.map(x=>x.path))];
  const scratch = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'cc03-exact-')));
  const records = []; let serial = 0, cleanup = false;
  function fixture() {
    const dir = path.join(scratch, String(++serial)); fs.mkdirSync(path.join(dir,'scripts/internal'),{recursive:true}); fs.mkdirSync(path.join(dir,'config'));
    for (const file of ['verify_code_comments.mjs','script_arg_utils.mjs']) fs.copyFileSync(path.join(repo,'scripts/internal',file),path.join(dir,'scripts/internal',file));
    const policy = JSON.parse(fs.readFileSync(path.join(repo,'config/code_comment_policy.json')));
    assert.deepEqual(policy.preservedHeaderExceptions, exceptions);
    for (const item of exceptions) { const p=path.join(dir,item.path);fs.mkdirSync(path.dirname(p),{recursive:true});fs.copyFileSync(path.join(repo,item.path),p); }
    copyExactAssets(dir,policy);
    return {dir,policy,write(p,bytes){const target=path.join(dir,p);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);}};
  }
  function invoke(f) {
    fs.writeFileSync(path.join(f.dir,'config/code_comment_policy.json'),JSON.stringify(f.policy));
    const argv=[path.join(f.dir,'scripts/internal/verify_code_comments.mjs')];
    const r=spawnSync(process.execPath,argv,{cwd:f.dir,encoding:'utf8',timeout:10000,maxBuffer:1048576,env:{PATH:process.env.PATH}});
    const applied=(r.stdout||'').split('\n').filter(x=>x.startsWith('[exact-finding-exception] ')).map(x=>JSON.parse(x.slice('[exact-finding-exception] '.length)));
    return {command:[process.execPath,...argv],cwd:f.dir,pid:r.pid,exit:r.status,signal:r.signal,error:r.error?.message||null,stdout:r.stdout||'',stderr:r.stderr||'',applied};
  }
  function check(id, label, fn) {
    let detail;
    try { detail=fn();records.push({id,label,status:'PASS',detail}); }
    catch(error){ records.push({id,label,status:'FAIL',error:error.stack,detail:error.detail}); }
    console.log(`[cc03-receipt] ${JSON.stringify(records.at(-1))}`);
  }
  function result(r, code, applied, markers=[]) {
    try {
      assert.equal(r.error,null);assert.equal(r.signal,null);assert.equal(r.exit,code);
      assert.deepEqual(r.applied.map(x=>x.id),applied?approvedIds:[]);
      for(const marker of markers)assert(r.stdout.includes(marker),marker);
    } catch(e) { e.detail=r;throw e; }
    return r;
  }
  function positive(id,label,change=()=>{},want=0,markers=[]) {check(id,label,()=>{const f=fixture();change(f);return result(invoke(f),want,true,markers);});}
  function negative(id,label,change,markers=['[fail] exact historical finding binding']) {check(id,label,()=>{const f=fixture();change(f);return result(invoke(f),1,false,markers);});}
  // 원장 재생은 실제 validator를 실행하되 전수 파일 검사를 다시 실행하지 않는다.
  function replay(f, invalid=false) {
    const source=fs.readFileSync(path.join(repo,'scripts/internal/verify_code_comments.mjs'),'utf8');
    const anchors=source.slice(source.indexOf('const EXACT_APPROVAL ='),source.indexOf('const policy = readPolicy();'));
    const functions=source.slice(source.indexOf('function stableJson('),source.indexOf('function validatePreservedHeaders('));
    const application=source.slice(source.indexOf('const rawFindingCount ='),source.indexOf('if (preservedErrors.length > 0) {'));
    const original=oracle.ledger.findings;
    const missing=original.filter(x=>x.category==='missing-header').map(x=>x.path);
    const english=original.filter(x=>x.category==='english-only-comment').map(x=>`${x.path}:${x.line}:${x.rawSourceLine}`);
    const buffers=new Map(historical.map(p=>[p,fs.readFileSync(path.join(repo,p))]));
    if(invalid)f.policy.exactPreservedFindings.findings[0].originalFindingIdentitySha256='0'.repeat(64);
    const context={fs,path,crypto,rootDir:f.dir,policy:f.policy,exactBuffers:buffers,missingHeaders:missing,englishOnlyComments:english,console:{log(){}}};
    const observed=vm.runInNewContext(anchors+functions+application+'\n({missingHeaders,englishOnlyComments,exact,rawFindingCount,exactErrors});',context,{timeout:10000});
    const excluded=new Set(invalid?[]:approvedIds);
    const expected=original.filter(x=>!excluded.has(x.id));
    assert.deepEqual(Array.from(observed.missingHeaders),expected.filter(x=>x.category==='missing-header').map(x=>x.path));
    assert.deepEqual(Array.from(observed.englishOnlyComments),expected.filter(x=>x.category==='english-only-comment').map(x=>`${x.path}:${x.line}:${x.rawSourceLine}`));
    assert.equal(observed.rawFindingCount,1280);assert.equal(observed.exact.applied.length,invalid?0:5);
    assert.equal(observed.missingHeaders.length+observed.englishOnlyComments.length,invalid?1280:1275);
    const newRows=original.filter(x=>x.baselineComparison==='NEW_SOURCE_FINDING');assert.equal(newRows.length,7);
    for(const x of [...newRows,original.find(x=>x.id==='CC01-0578')])assert(expected.includes(x));
    return {kind:'actual-validator-VM-with-fixed-ledger',ledgerFindings:1280,remaining:expected.length,applied:Array.from(observed.exact.applied,x=>x.id),newFindingsRetained:7,pythonFalsePositiveRetained:true,bindingErrors:Array.from(observed.exactErrors)};
  }
  try {
    positive('CC02-P01','정확3파일/5finding/승인기록 일치',f=>{f.policy.exactPreservedFindings.approvalRecord.path='approval-record.json';});
    positive('CC02-P02','일반 위반은 정확 예외와 함께 있어도 실패',f=>f.write('ordinary.py','# Ordinary English description\n'),1,['ordinary.py','- missing headers: 1','- english-only comments: 1']);
    positive('CC02-P03','기존6개 및 marker2종의 허용과 거부 유지',f=>f.write('markers.mjs','// 파일 용도: 기존 marker 회귀.\n// WEBRTC_HTTP_SERVER_LOGICAL_ORIGIN 12 function\n// OPS_RENDERER_BYTE_BASELINE_BEGIN\n// OPS_RENDERER_BYTE_BASELINE_END\n// Unregistered marker\n'),1,['- english-only comments: 1','markers.mjs:5:']);
    check('CC02-P04','고정1280 원장과 실제 validator의 정확1275 잔여 대조',()=>replay(fixture()));
    negative('CC02-N01','한 바이트 변경',f=>{const p=path.join(f.dir,historical[0]);const b=fs.readFileSync(p);b[b.length-2]^=1;fs.writeFileSync(p,b);});
    negative('CC02-N02','동일 파일명 다른 내용/크기',f=>f.write(historical[0],'# Changed content\n'));
    negative('CC02-N03','파일 이동',f=>fs.renameSync(path.join(f.dir,historical[0]),path.join(f.dir,historical[0]+'.moved.py')));
    negative('CC02-N04','승인 파일의 새 영문 주석',f=>fs.appendFileSync(path.join(f.dir,historical[0]),'\n# New English description\n'),['[fail] exact historical finding binding','New English description']);
    negative('CC02-N05','승인 finding 삭제 후 다른 위반',f=>{const p=path.join(f.dir,historical[0]);fs.writeFileSync(p,fs.readFileSync(p,'utf8').replace('# Mutate real, valid native observations; never infer missing original records.','# Different violation'));});
    negative('CC02-N06','예외 entry를 다른 파일에 복사',f=>{const x=f.policy.exactPreservedFindings.findings[0];f.write('docs/release-artifacts/copied.py',fs.readFileSync(path.join(f.dir,x.path)));x.path='docs/release-artifacts/copied.py';});
    check('CC02-N07','미등록 역사 파일 헤더 누락',()=>{const f=fixture();f.write('docs/release-artifacts/unregistered.py','value=1\n');return result(invoke(f),1,true,['unregistered.py','- missing headers: 1']);});
    negative('CC02-N08','일반 Source에 예외 전용',f=>{f.write('scripts/current.py',fs.readFileSync(path.join(f.dir,historical[0])));f.policy.exactPreservedFindings.findings[0].path='scripts/current.py';});
    check('CC02-N09','일반 파일 신규 영문 주석',()=>{const f=fixture();f.write('ordinary.py','# 파일 용도: 오류 사례.\n# New English description\n');return result(invoke(f),1,true,['ordinary.py:2:','- english-only comments: 1']);});
    check('CC02-N10','일반 파일 신규 헤더 누락',()=>{const f=fixture();f.write('ordinary.mjs','const value=1;\n');return result(invoke(f),1,true,['ordinary.mjs','- missing headers: 1']);});
    negative('CC02-N11','승인 Metadata 위조',f=>{const p=f.policy.exactPreservedFindings.approvalRecord.path;const x=JSON.parse(fs.readFileSync(p));x.authority='forged';x.approved=true;fs.writeFileSync(p,JSON.stringify(x));});
    negative('CC02-N12','위조 기록과 자체 hash 동시 변경',f=>{const p=f.policy.exactPreservedFindings.approvalRecord.path;fs.appendFileSync(p,' ');f.policy.exactPreservedFindings.approvalRecord.sha256=hashBytes(fs.readFileSync(p));});
    check('CC02-N13','정책/예외 Version 및 계약 hash 불일치',()=>{
      const results=[];
      for(const change of [p=>p.schema='unknown',p=>p.exactPreservedFindings.version='unknown',p=>p.exactPreservedFindings.contractSha256='0'.repeat(64)]){const f=fixture();change(f.policy);results.push(result(invoke(f),1,false,['[fail] exact historical finding binding']));}
      return results;
    });
    check('CC02-N14','잘못된 Finding ID와 digest',()=>{
      const results=[];for(const key of ['originalFindingId','originalFindingIdentitySha256']){const f=fixture();f.policy.exactPreservedFindings.findings[0][key]='wrong';results.push(result(invoke(f),1,false,['finding-scope-anchor-mismatch']));}return results;
    });
    negative('CC02-N15','Finding 종류 변경',f=>f.policy.exactPreservedFindings.findings[0].findingType='english-only-comment');
    check('CC02-N16','Finding 위치와 문맥 변경',()=>{
      const results=[];for(const key of ['line','rawLine']){const f=fixture();f.policy.exactPreservedFindings.findings[3].location[key]=key==='line'?21:'# Changed context';results.push(result(invoke(f),1,false,['finding-scope-anchor-mismatch']));}return results;
    });
    negative('CC02-N17','승인 외 추가 헤더 finding',f=>f.policy.exactPreservedFindings.findings.push({...f.policy.exactPreservedFindings.findings[0],originalFindingId:'CC01-extra'}));
    check('CC02-N18','심링크·경로 이탈·비정규 경로 거부',()=>{
      const results=[];
      for(const kind of ['leaf','parent','escape','noncanonical']){const f=fixture();if(kind==='leaf'){const p=path.join(f.dir,historical[0]);fs.renameSync(p,p+'.saved');fs.symlinkSync(p+'.saved',p);}else if(kind==='parent'){const p=path.join(f.dir,'docs/release-artifacts/v4.5.0');fs.renameSync(p,p+'-saved');fs.symlinkSync(p+'-saved',p);}else f.policy.exactPreservedFindings.findings[0].path=kind==='escape'?'../outside.py':'./'+historical[0];results.push(result(invoke(f),1,false,['[fail] exact historical finding binding']));}return results;
    });
    check('CC02-N19','중복·누락·타입·알 수 없는 필드',()=>{
      const results=[];for(const change of [b=>b.findings[1]=b.findings[0],b=>b.findings.pop(),b=>b.findings={},b=>b.unapproved=true]){const f=fixture();change(f.policy.exactPreservedFindings);results.push(result(invoke(f),1,false,['[fail] exact historical finding binding']));}return results;
    });
    check('CC02-N20','승인 기록 누락·철회·계약 변경',()=>{
      const results=[];
      for(const kind of ['missing','revoked','contract','request-missing','request-changed','request-symlink','relative-escape','relative-dot']) {
        const f=fixture(), p=f.policy.exactPreservedFindings.approvalRecord.path, request=path.join(f.dir,'user-approval.txt');
        if(kind==='missing')fs.unlinkSync(p);
        else if(kind==='request-missing')fs.unlinkSync(request);
        else if(kind==='request-changed')fs.appendFileSync(request,' ');
        else if(kind==='request-symlink'){fs.renameSync(request,request+'.saved');fs.symlinkSync(request+'.saved',request);}
        else if(kind==='relative-escape')f.policy.exactPreservedFindings.approvalRecord.path='../'+path.basename(f.dir)+'/approval-record.json';
        else if(kind==='relative-dot')f.policy.exactPreservedFindings.approvalRecord.path='./approval-record.json';
        else {const x=JSON.parse(fs.readFileSync(p));if(kind==='revoked')x.status='REVOKED';else x.contractSha256='0'.repeat(64);fs.writeFileSync(p,JSON.stringify(x));}
        results.push({kind,...result(invoke(f),1,false,['[fail] exact historical finding binding'])});
      }
      return results;
    });
    negative('CC02-N21','정상 헤더 추가도 보존 hash 변경으로 실패',f=>{const p=path.join(f.dir,historical[0]);fs.writeFileSync(p,'# 파일 용도: 변경된 역사 파일.\n'+fs.readFileSync(p));});
    check('CC02-N22','같은 basename과 바이트의 다른 파일은 미승인',()=>{const f=fixture();f.write('docs/other/'+path.basename(historical[0]),fs.readFileSync(path.join(f.dir,historical[0])));return result(invoke(f),1,true,['docs/other/158-driver-first.py','- missing headers: 1','- english-only comments: 1']);});
    check('CC02-C01','기존 Coverage 함수 및 확장자·제외 경계 보존',()=>{
      const now=fs.readFileSync(path.join(repo,'scripts/internal/verify_code_comments.mjs'),'utf8');
      const prior=fs.readFileSync(EXACT_ORACLE.priorCheckerPath,'utf8');assert.equal(hashBytes(prior),EXACT_ORACLE.priorCheckerSha256);
      assert.equal(now.slice(now.indexOf('function collectCodeFiles(')),prior.slice(prior.indexOf('function collectCodeFiles(')));
      const policy=JSON.parse(fs.readFileSync(path.join(repo,'config/code_comment_policy.json')));const oldPolicy=JSON.parse(fs.readFileSync(EXACT_ORACLE.priorPolicyPath));delete policy.exactPreservedFindings;assert.deepEqual(policy,oldPolicy);
      const f=fixture();for(const ext of oldPolicy.codeExtensions)f.write('coverage'+ext,'value\n');
      for(const name of ['server.sh','CMakeLists.txt'])f.write(name,'value\n');
      f.write('build/ignored.py','# English ignored\n');f.write('third_party/ignored.mjs','// English ignored\n');f.write('nested/__pycache__/ignored.py','# English ignored\n');f.write('ignored.txt','# English ignored\n');
      return {kind:'source-equivalence-and-real-fixture',functionsUnchanged:true,policyBaseUnchanged:true,run:result(invoke(f),1,true,['- missing headers: 11','- english-only comments: 0'])};
    });
    check('CC02-C02','예외 결속 실패 중에도 기존1280 finding 보존',()=>replay(fixture(),true));
    check('CC02-C03','정책과 checker 동시 변경은 별도 Source 결속에서 차단',()=>{
      const f=fixture();fs.writeFileSync(path.join(f.dir,'config/code_comment_policy.json'),JSON.stringify(f.policy));
      const paths=['scripts/internal/verify_code_comments.mjs','config/code_comment_policy.json'];const expected=paths.map(p=>hashBytes(fs.readFileSync(path.join(f.dir,p))));
      fs.appendFileSync(path.join(f.dir,paths[0]),'\n');f.policy.exactPreservedFindings.findings[0].path='forged.py';fs.writeFileSync(path.join(f.dir,paths[1]),JSON.stringify(f.policy));
      const actual=paths.map(p=>hashBytes(fs.readFileSync(path.join(f.dir,p))));const admitted=expected.every((h,i)=>h===actual[i]);let productSpawns=0;if(admitted)productSpawns++;
      assert.equal(admitted,false);assert.equal(productSpawns,0);assert(actual.every((h,i)=>h!==expected[i]));
      return {kind:'synthetic-source-hash-admission-not-runtime',admitted,productSpawns,expected,actual,limitation:'검사기 자체가 함께 변조된 trust root를 인증한다는 주장이 아니며 실제 G07 Runtime Gate 실행도 아니다.'};
    });
  } finally {
    fs.rmSync(scratch,{recursive:true,force:true});cleanup=!fs.existsSync(scratch);
  }
  assert.equal(records.length,29);assert(cleanup);
  const passed=records.filter(x=>x.status==='PASS').length;
  console.log(`[cc03-summary] ${JSON.stringify({passed,failed:records.length-passed,positive:4,negative:22,boundary:3,cleanup:{path:scratch,absent:cleanup},productSpawns:0})}`);
  process.exitCode=passed===29?0:1;
}

// CC04: 고정 원문과 독립 문자열 fixture로 Python 토큰 경계를 검사한다.
function runPythonComments() {
  const scratch = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cc04-python-comments-')));
  const records = [];
  const header = '# 파일 용도: Python 주석 토큰 경계를 검증한다.\n';
  const approvedIds = ['CC01-0001','CC01-0002','CC01-0003','CC01-0105','CC01-0106'];
  const cases = [
    {id:'PY01',label:'CC01-0578 실제 원문의 문자열 오탐 제거와 실제 주석 보존',actual:true,exit:1,headers:1,english:2,has:['ordinary.py:18:','ordinary.py:52:'],absent:['ordinary.py:105:']},
    {id:'PY02',label:'일반 영문 주석 위반 유지',text:header+'# Ordinary English description\n',exit:1,english:1,has:['ordinary.py:2:']},
    {id:'PY03',label:'한글 설명 주석 허용',text:header+'# 종료 전에 소유한 자원을 반환한다.\n',exit:0,english:0},
    {id:'PY04',label:'일반 문자열의 주석 기호 제외',text:header+'text = "// English literal # literal"\n',exit:0,english:0},
    {id:'PY05',label:'세 따옴표 문자열과 raw 문자열 제외',text:header+'text = """\n// English literal\n# English literal\n"""\nraw = r\'\'\'\n// Escaped literal\n# Literal hash\n\'\'\'\n',exit:0,english:0},
    {id:'PY06',label:'f-string 리터럴 안의 주석 기호 제외',text:header+'text = f"""\n// English literal {1 + 1}\n# Literal hash\n"""\n',exit:0,english:0},
    {id:'PY07',label:'같은 행의 한글 문자열이 영문 주석을 숨기지 않음',text:header+'text = "한글 // literal"  # Actual English comment\n',exit:1,english:1,has:['ordinary.py:2:']},
    {id:'PY08',label:'구문 오류를 검사 실패로 반환',text:header+'if :\n    pass\n',exit:1,english:0,parserError:true},
    {id:'PY09',label:'정확 역사 예외와 무관한 임의 Python 파일 검사',file:'unrelated/name.py',text:header+'text = "literal"  # Unapproved English comment\n',exit:1,english:1,has:['unrelated/name.py:2:']},
    {id:'PY10',label:'닫히지 않은 문자열을 검사 실패로 반환',text:header+'text = """\n# Not a valid complete string\n',exit:1,english:0,parserError:true},
    {id:'PY11',label:'f-string 표현식 안의 실제 주석 검사',text:header+'text = f"""{1  # Actual expression comment\n}"""\n',exit:1,english:1,has:['ordinary.py:2:']},
    {id:'PY12',label:'명시된 코드의 noqa 문법을 설명으로 오인하지 않음',text:header+'value = 1  # noqa: BLE001\n',exit:0,english:0},
    {id:'PY13',label:'Python 실행 불가 시 조용히 통과하지 않음',text:header+'value = 1\n',exit:1,headers:3,english:0,parserError:true,withoutPython:true,has:['[fail] exact historical finding binding','english-finding-context-mismatch']},
    {id:'PY14',label:'함수 밖 return도 유효한 Python으로 인정하지 않음',text:header+'return 1\n',exit:1,english:0,parserError:true},
    {id:'PY15',label:'비BMP 문자 뒤 주석의 열 위치와 CRLF 보존',text:header.replaceAll('\n','\r\n')+'text = "😀 한글"  # Actual English comment\r\n',exit:1,english:1,has:['ordinary.py:2:']},
    {id:'PY16',label:'오류 코드가 있는 type ignore 문법',text:header+'import missing  # type: ignore[import-not-found]\n',exit:0,english:0},
    {id:'PY17',label:'쉼표로 나눈 noqa 코드 목록',text:header+'value=1  # noqa: F401, BLE001\n',exit:0,english:0},
    {id:'PY18',label:'공백으로 나눈 noqa 코드 목록과 대소문자',text:header+'value=1  # NOQA: F401 BLE001\n',exit:0,english:0},
    {id:'PY19',label:'type ignore 코드 목록',text:header+'value=1  # type: ignore[attr-defined, import-not-found]\n',exit:0,english:0},
    {id:'PY20',label:'noqa 뒤 실제 영문 설명은 계속 실패',text:header+'value=1  # noqa: BLE001 # English explanation\n',exit:1,english:1,has:['ordinary.py:2:']},
    {id:'PY21',label:'type ignore 뒤 실제 영문 설명은 계속 실패',text:header+'value=1  # type: ignore[import-not-found] # English explanation\n',exit:1,english:1,has:['ordinary.py:2:']},
    {id:'PY22',label:'noqa 뒤 한글 설명은 허용',text:header+'value=1  # noqa: BLE001 # 상위 처리기로 전달한다.\n',exit:0,english:0},
    {id:'PY23',label:'type ignore 뒤 한글 설명은 허용',text:header+'value=1  # type: ignore[import-not-found] # 선택 의존성이다.\n',exit:0,english:0},
    {id:'PY24',label:'잘못된 noqa 코드 문자열을 문법으로 면제하지 않음',text:header+'value=1  # noqa: English\n',exit:1,english:1,has:['ordinary.py:2:']},
    {id:'PY25',label:'빈 type ignore 코드 목록은 그대로 검사',text:header+'value=1  # type: ignore[]\n',exit:1,english:1,has:['ordinary.py:2:']},
    {id:'PY26',label:'닫히지 않은 type ignore 목록은 그대로 검사',text:header+'value=1  # type: ignore[import-not-found\n',exit:1,english:1,has:['ordinary.py:2:']},
    {id:'PY27',label:'일반 설명 안의 지시문 문자열로 우회하지 못함',text:header+'value=1  # English explanation # noqa: BLE001\n',exit:1,english:1,has:['ordinary.py:2:']},
    {id:'PY28',label:'구분자 없는 후행 영문 설명을 숨기지 않음',text:header+'value=1  # noqa: BLE001 English explanation\n',exit:1,english:1,has:['ordinary.py:2:']},
    {id:'PY29',label:'범위 없는 noqa 전체 면제를 추가하지 않음',text:header+'value=1  # noqa\n',exit:1,english:1,has:['ordinary.py:2:']},
    {id:'PY30',label:'범위 없는 type ignore 전체 면제를 추가하지 않음',text:header+'value=1  # type: ignore\n',exit:1,english:1,has:['ordinary.py:2:']},
  ];
  try {
    for (const test of cases) {
      const dir = path.join(scratch,test.id); fs.mkdirSync(path.join(dir,'scripts/internal'),{recursive:true}); fs.mkdirSync(path.join(dir,'config'));
      let detail;
      try {
        for (const name of ['verify_code_comments.mjs','script_arg_utils.mjs']) fs.copyFileSync(path.join(repo,'scripts/internal',name),path.join(dir,'scripts/internal',name));
        const policy = JSON.parse(fs.readFileSync(path.join(repo,'config/code_comment_policy.json')));
        for (const item of exceptions) { const target=path.join(dir,item.path);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(repo,item.path),target); }
        copyExactAssets(dir,policy);fs.writeFileSync(path.join(dir,'config/code_comment_policy.json'),JSON.stringify(policy));
        let text = test.text;
        if (test.actual) {
          const original = exactOracle().ledger.findings.find(row=>row.id==='CC01-0578');
          const bytes = fs.readFileSync(path.join(repo,'test/fixtures/code-comment-policy/python-original.py.txt'));assert.equal(hashBytes(bytes),original.candidateSha256);
          text = bytes.toString('utf8');assert.equal(text.split('\n')[original.line-1],original.rawSourceLine);
        }
        const file = test.file||'ordinary.py', target=path.join(dir,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,text);
        const argv=[path.join(dir,'scripts/internal/verify_code_comments.mjs')];
        const result=spawnSync(process.execPath,argv,{cwd:dir,encoding:'utf8',timeout:10000,maxBuffer:1048576,env:{PATH:test.withoutPython?path.join(scratch,'no-interpreters'):process.env.PATH}});
        detail={command:[process.execPath,...argv],cwd:dir,pid:result.pid,exit:result.status,signal:result.signal,error:result.error?.message||null,stdout:result.stdout||'',stderr:result.stderr||'',inputSha256:hashBytes(text),expected:{exit:test.exit,headers:test.headers||0,english:test.english,parserError:!!test.parserError}};
        assert.equal(detail.error,null);assert.equal(detail.signal,null);assert.equal(detail.exit,test.exit);
        assert(detail.stdout.includes(`- missing headers: ${test.headers||0}\n`));assert(detail.stdout.includes(`- english-only comments: ${test.english}\n`));
        const applied=detail.stdout.split('\n').filter(x=>x.startsWith('[exact-finding-exception] ')).map(x=>JSON.parse(x.slice('[exact-finding-exception] '.length)).id);
        assert.deepEqual(applied,test.withoutPython?[]:approvedIds);
        assert.equal(detail.stdout.includes('[fail] Python comment parsing'),!!test.parserError);
        for(const marker of test.has||[])assert(detail.stdout.includes(marker),marker);
        for(const marker of test.absent||[])assert(!detail.stdout.includes(marker),marker);
        records.push({id:test.id,label:test.label,status:'PASS',detail});
      } catch(error) { records.push({id:test.id,label:test.label,status:'FAIL',error:error.stack,detail}); }
      console.log(`[cc04-python-receipt] ${JSON.stringify(records.at(-1))}`);
    }
  } finally { fs.rmSync(scratch,{recursive:true,force:true}); }
  const absent=!fs.existsSync(scratch);assert(absent);assert.equal(records.length,30);
  const passed=records.filter(record=>record.status==='PASS').length;
  console.log(`[cc04-python-summary] ${JSON.stringify({passed,failed:records.length-passed,cleanup:{path:scratch,absent},productSpawns:0})}`);
  process.exitCode=passed===30?0:1;
}


// 기존 정책의 파일 선택 모드와 전체 검사·보호 경계를 실제 fixture로 대조한다.
function runSelectedFiles() {
  const scratch=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'cc-selected-'))), records=[];
  const header='# 파일 용도: 선택 검사 fixture.\n';
  const cases=[
    {id:'CC-DEV01',code:0},
    {id:'CC-DEV02',code:1,text:header+'# English description\n',marker:'ordinary.py:2:'},
    {id:'CC-DEV03',code:1,text:'value=1\n',marker:'- missing headers: 1'},
    {id:'CC-DEV04',code:0,unselected:true},
    {id:'CC-DEV05',code:2,args:['--files']},
    {id:'CC-DEV06',code:2,args:['--files','/tmp/outside.py']},
    {id:'CC-DEV07',code:2,args:['--files','../outside.py']},
    {id:'CC-DEV08',code:2,args:['--files','missing.py']},
    {id:'CC-DEV09',code:2,link:true,args:['--files','linked.py']},
    {id:'CC-DEV10',code:2,args:['--files','notes.txt']},
    {id:'CC-DEV11',code:1,text:header+'if :\n',marker:'[fail] Python comment parsing'},
    {id:'CC-DEV12',code:0,args:['--files','ordinary.py','ordinary.py'],marker:'- files: 4'},
    {id:'CC-DEV13',code:1,corrupt:true,marker:'[fail] exact historical finding binding'},
  ];
  try {
    for (const test of cases) {
      const dir=path.join(scratch,test.id);fs.mkdirSync(path.join(dir,'scripts/internal'),{recursive:true});fs.mkdirSync(path.join(dir,'config'));
      let detail;
      try {
        for(const file of ['verify_code_comments.mjs','script_arg_utils.mjs'])fs.copyFileSync(path.join(repo,'scripts/internal',file),path.join(dir,'scripts/internal',file));
        const policy=JSON.parse(fs.readFileSync(path.join(repo,'config/code_comment_policy.json')));
        for(const item of exceptions){const p=path.join(dir,item.path);fs.mkdirSync(path.dirname(p),{recursive:true});fs.copyFileSync(path.join(repo,item.path),p);}
        copyExactAssets(dir,policy);fs.writeFileSync(path.join(dir,'config/code_comment_policy.json'),JSON.stringify(policy));
        fs.writeFileSync(path.join(dir,'ordinary.py'),test.text??header+'value=1\n');fs.writeFileSync(path.join(dir,'notes.txt'),'text\n');
        if(test.unselected)fs.writeFileSync(path.join(dir,'unselected.py'),'# English description\n');
        if(test.link)fs.symlinkSync('ordinary.py',path.join(dir,'linked.py'));
        if(test.corrupt)fs.appendFileSync(path.join(dir,policy.exactPreservedFindings.findings[0].path),'\n');
        const invoke=args=>spawnSync(process.execPath,[path.join(dir,'scripts/internal/verify_code_comments.mjs'),...args],{cwd:dir,encoding:'utf8',timeout:10000,maxBuffer:1048576,env:{PATH:process.env.PATH}});
        const args=test.args??['--files','ordinary.py'],r=invoke(args);
        detail={command:[process.execPath,path.join(dir,'scripts/internal/verify_code_comments.mjs'),...args],exit:r.status,signal:r.signal,stdout:r.stdout,stderr:r.stderr};
        assert(!r.error);assert.equal(r.signal,null);assert.equal(r.status,test.code);
        if(test.marker)assert(r.stdout.includes(test.marker),test.marker);
        if(test.code===0){assert(r.stdout.includes('- scope: selected files; historical bindings included'));assert.equal(r.stdout.split('\n').filter(x=>x.startsWith('[exact-finding-exception] ')).length,5);}
        if(test.unselected){assert(!r.stdout.includes('unselected.py'));const all=invoke([]);assert(!all.error);assert.equal(all.signal,null);assert.equal(all.status,1);assert(all.stdout.includes('unselected.py:1:'));assert(all.stdout.includes('- scope: full source'));detail.fullSource={exit:all.status,stdout:all.stdout};}
        records.push({id:test.id,status:'PASS',detail});
      }catch(error){records.push({id:test.id,status:'FAIL',error:error.stack,detail});}
      console.log(`[cc-selected-receipt] ${JSON.stringify(records.at(-1))}`);
    }
  }finally{fs.rmSync(scratch,{recursive:true,force:true});}
  assert(!fs.existsSync(scratch));assert.equal(records.length,13);
  const passed=records.filter(x=>x.status==='PASS').length;
  console.log(`[cc-selected-summary] ${JSON.stringify({passed,failed:records.length-passed,cleanup:{path:scratch,absent:true},productSpawns:0})}`);
  process.exitCode=passed===13?0:1;
}
