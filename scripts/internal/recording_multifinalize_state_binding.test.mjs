import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import crypto from 'node:crypto';import{execFileSync}from'node:child_process';import{fileURLToPath}from'node:url';  // 파일 용도: 격리 fixture로 Multi-Finalize 후보의 source·evidence 결속과 오류 거부를 검증한다.
import{MULTIFINALIZE_SCHEMA,validateCandidateIdentity,boundArtifact,verifyEvidenceManifest}from'./recording_multifinalize_state_binding.mjs';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function ownedRoot(t,prefix){
  const root=fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()),prefix));
  const owner=fs.lstatSync(root);assert(!owner.isSymbolicLink()&&owner.isDirectory());
  t.after(()=>{
    const current=fs.lstatSync(root);
    assert(current.dev===owner.dev&&current.ino===owner.ino&&current.uid===owner.uid,'fixture ownership changed');
    fs.rmSync(root,{recursive:true});assert(!fs.existsSync(root),'fixture cleanup incomplete');
    console.log('[fixture-cleanup] '+JSON.stringify({root,absent:true}));
  });
  return root;
}
function fixture(t){
  const root=ownedRoot(t,'multi-binding-negative-'),clone=path.join(root,'repo');
  // 불변 Git 객체는 alternates로 읽으며 source·evidence 파일의 hardlink는 만들지 않는다.
  // 각 checkout·index·신규 객체는 fixture가 독립 소유하고 테스트가 끝나면 정리한다.
  // Assertion은 테스트 사이의 동시 실행 여부에 의존하지 않는다.
  execFileSync('git',['clone','--quiet','--shared','--no-hardlinks',repo,clone]);
  const git=args=>execFileSync('git',args,{cwd:clone,encoding:'utf8'});
  const head=git(['rev-parse','HEAD']).trim(),sources={};
  for(const p of git(['ls-tree','-r','--name-only','HEAD','--','CMakeLists.txt','src','include']).trim().split('\n')){
    const target=path.join(clone,p),original=fs.statSync(path.join(repo,p)),local=fs.statSync(target);
    assert(local.nlink===1&&!(local.dev===original.dev&&local.ino===original.ino),'shared mutable fixture file');
    sources[p]=sha(fs.readFileSync(target));
  }
  const file=path.join(root,'sources.json');fs.writeFileSync(file,JSON.stringify(sources));
  console.log('[fixture-created] '+JSON.stringify({root,head,products:Object.keys(sources).length,allocatedKiB:Number(execFileSync('du',['-sk',root],{encoding:'utf8'}).split(/\s+/)[0]),mode:'shared immutable Git objects; private checkout/index'}));
  return{root,clone,git,result:{schema:MULTIFINALIZE_SCHEMA,head,productHead:head,branch:git(['branch','--show-current']).trim(),sourceManifest:{path:file,sha256:sha(fs.readFileSync(file)),bytes:fs.statSync(file).size}},sources};
}
// 모든 fixture는 독립 소유한 로컬 clone이며 원본과 Evidence는 변경하지 않는다.
test('clean HEAD exact sources accepted',t=>{const f=fixture(t);assert.deepEqual(validateCandidateIdentity(f.clone,f.result),f.sources);});
test('dirty Worktree rejected',t=>{const f=fixture(t);fs.appendFileSync(path.join(f.clone,'CMakeLists.txt'),'\n# dirty\n');assert.throws(()=>validateCandidateIdentity(f.clone,f.result),/multi-dirty/);});
test('staged modification rejected',t=>{const f=fixture(t);fs.appendFileSync(path.join(f.clone,'CMakeLists.txt'),'\n# staged\n');f.git(['add','--','CMakeLists.txt']);assert.throws(()=>validateCandidateIdentity(f.clone,f.result),/multi-dirty/);});
test('untracked and HEAD mismatch rejected',t=>{const f=fixture(t);assert.throws(()=>validateCandidateIdentity(f.clone,{...f.result,head:'0'.repeat(40)}),/multi-head/);fs.writeFileSync(path.join(f.clone,'unexpected-binding-file'),'x');assert.throws(()=>validateCandidateIdentity(f.clone,f.result),/multi-dirty/);});
test('product bytes mismatch with rehashed manifest rejected',t=>{const f=fixture(t);f.sources['CMakeLists.txt']='0'.repeat(64);const bytes=Buffer.from(JSON.stringify(f.sources));fs.writeFileSync(f.result.sourceManifest.path,bytes);f.result.sourceManifest={...f.result.sourceManifest,sha256:sha(bytes),bytes:bytes.length};assert.throws(()=>validateCandidateIdentity(f.clone,f.result),/multi-source-bytes/);});
test('manifest SHA mismatch and missing evidence rejected',t=>{const f=fixture(t);assert.throws(()=>boundArtifact({...f.result.sourceManifest,sha256:'0'.repeat(64)}),/multi-artifact-sha/);assert.throws(()=>boundArtifact({...f.result.sourceManifest,path:path.join(f.root,'missing')}));});
test('other evidence manifest and tampered patch rejected',t=>{const root=ownedRoot(t,'multi-binding-evidence-');fs.writeFileSync(path.join(root,'artifact-manifest.json'),'{}');assert.throws(()=>verifyEvidenceManifest(root,'0'.repeat(64)),/multi-evidence-manifest/);const p=path.join(root,'candidate.patch');fs.writeFileSync(p,'verified patch');const entry={path:p,sha256:sha(fs.readFileSync(p)),bytes:fs.statSync(p).size};fs.appendFileSync(p,' tampered');assert.throws(()=>boundArtifact(entry),/multi-artifact-sha/);});
test('unsupported schema rejected',t=>{const f=fixture(t);assert.throws(()=>validateCandidateIdentity(f.clone,{...f.result,schema:'future-v99'}),/multi-schema/);});
