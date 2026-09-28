// 파일 용도: 보존 헤더 예외의 실제 검증기 실행과 실패 경계를 검사한다.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
if(process.argv.slice(2).some(x=>x!=='--red')||process.argv.length>3)process.exit(2);
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
  change(dir,policy);
  fs.writeFileSync(path.join(dir,'config/code_comment_policy.json'),JSON.stringify(policy));
  const r=spawnSync(process.execPath,[path.join(dir,'scripts/internal/verify_code_comments.mjs')],{encoding:'utf8',timeout:10000,maxBuffer:1000000,env:{PATH:process.env.PATH}});
  const ok=!r.error&&!r.signal&&r.status===want&&(!marker||(r.stdout||'').includes(marker));
  console.log(`[${ok?'pass':'fail'}] ${name} exit=${r.status}`);
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
