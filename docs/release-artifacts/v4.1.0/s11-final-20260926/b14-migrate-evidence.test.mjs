// 파일 용도: B14 이행 경계를 검증한다. 파일은 격리된 테스트 소유 root에만 만든다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {gunzipSync,gzipSync} from 'node:zlib';
import {buildPlan,applyPlan,digest,rewriteMarkdownLinks} from './b14-migrate-evidence.mjs';
const prefix='docs/release-artifacts/v4.1.0/';
function fixture(fn){
  const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'b14-migrate-unit-')));
  const write=(p,b)=>{fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.writeFileSync(path.join(root,p),b);};
  const source=`${prefix}unit/source.log`,bytes=Buffer.from('PASS 31 FAIL 1 duration=15\n');
  write(source,bytes);write('docs/reference.md','[실패](release-artifacts/v4.1.0/unit/source.log#failure)\n');
  const findings={deniedArtifacts:[{file:source}],contentFindings:[],affectedFileFingerprints:[{file:source,bytes:bytes.length,sha256:digest(bytes)}]};
  try {fn({root,write,source,bytes,findings});}
  finally {fs.rmSync(root,{recursive:true});assert.equal(fs.existsSync(root),false);}
}
test('B14-M01 모든 바이트·원본 해시·실패·링크 보존 후 원본 정리',()=>fixture(({root,source,bytes,findings})=>{
  const plan=buildPlan(root,findings,[source,'docs/reference.md'],{});
  const moved=plan.find(e=>e.moved),receipt=`${prefix}unit/receipt.json.gz`;
  const result=applyPlan(root,plan,receipt,'test-source');
  assert.equal(fs.existsSync(path.join(root,source)),false);
  assert.deepEqual(fs.readFileSync(path.join(root,moved.target)),bytes);
  assert.match(fs.readFileSync(path.join(root,'docs/reference.md'),'utf8'),/public-evidence-[a-f0-9]{16}\.txt#failure/u);
  assert.equal(result.entries[0].originalSha256,digest(bytes));
  assert.deepEqual(JSON.parse(gunzipSync(fs.readFileSync(path.join(root,receipt)))),result);
}));
test('B14-M02 기존 목적지 충돌은 쓰기 없이 거부',()=>fixture(({root,write,source,bytes,findings})=>{
  const plan=buildPlan(root,findings,[source],{});write(plan[0].target,'existing');
  assert.throws(()=>buildPlan(root,findings,[source],{}),/B14_TARGET_EXISTS/u);
  assert.deepEqual(fs.readFileSync(path.join(root,source)),bytes);
}));
test('B14-M03 원본 지문 변화와 계획 후 변경은 삭제 전에 거부',()=>fixture(({root,write,source,findings})=>{
  const plan=buildPlan(root,findings,[source],{});write(source,'changed');
  assert.throws(()=>buildPlan(root,findings,[source],{}),/B14_ORIGINAL_CHANGED/u);
  assert.throws(()=>applyPlan(root,plan,`${prefix}unit/receipt.json.gz`,'test'),/B14_PLAN_SOURCE_CHANGED/u);
  assert.equal(fs.existsSync(path.join(root,plan[0].target)),false);
}));
test('B14-M04 gzip 원본은 검사 가능한 평문으로 이행',()=>fixture(({root,write,bytes,findings})=>{
  const source=`${prefix}unit/seed-result.log.gz`,compressed=gzipSync(bytes);write(source,compressed);
  findings.deniedArtifacts=[{file:source}];findings.affectedFileFingerprints=[{file:source,bytes:compressed.length,sha256:digest(compressed)}];
  const [entry]=buildPlan(root,findings,[source],{});assert.deepEqual(entry.published,bytes);assert.equal(entry.original.length,compressed.length);
}));
test('B14-M05 JSON 수치·판정·raw 해시 의미는 그대로 유지',()=>fixture(({root,write,source,findings})=>{
  const file=`${prefix}unit/manifest.json`,home=['','Users','private-user','work'].join('/');
  const input={rawPath:home,rawSha256:'a'.repeat(64),bytes:123,status:'fail',results:[1,false,null]};write(file,JSON.stringify(input));findings.contentFindings=[{file}];
  const entry=buildPlan(root,findings,[source,file],{}).find(e=>e.source===file),result=JSON.parse(entry.published);
  assert.deepEqual({...result,rawPath:home},input);assert.equal(result.rawPath,'<home>/work');
}));
test('B14-M06 위험 경로·symlink·잘못된 UTF8를 쓰기 전에 거부',()=>fixture(({root,write,source,findings})=>{
  const old=structuredClone(findings);findings.contentFindings=[{file:'src/private.cpp'}];
  assert.throws(()=>buildPlan(root,findings,[source],{}),/B14_OUTSIDE_APPROVED_CONTENT/u);
  fs.unlinkSync(path.join(root,source));fs.symlinkSync(path.join(root,'docs/reference.md'),path.join(root,source));
  assert.throws(()=>buildPlan(root,old,[source],{}),/B14_UNSAFE_SOURCE/u);
  fs.unlinkSync(path.join(root,source));const invalid=Buffer.from([255]);write(source,invalid);old.affectedFileFingerprints=[{file:source,bytes:1,sha256:digest(invalid)}];
  assert.throws(()=>buildPlan(root,old,[source],{}),/B14_INVALID_UTF8/u);
}));
test('B14-M07 외부 URL·역사적 문자열은 불변, 현재 링크만 변경',()=>{
  const source=`${prefix}unit/source.log`,target=`${prefix}unit/public-evidence-example.txt`;
  const input='[현재](release-artifacts/v4.1.0/unit/source.log) [외부](https://example.invalid/source.log) `source.log`';
  assert.equal(rewriteMarkdownLinks(input,'docs/reference.md',new Map([[source,target]])),input.replace('unit/source.log)','unit/public-evidence-example.txt)'));
});
