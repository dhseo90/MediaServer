// 파일 용도: B14 역사적 이미지의 정확한 공개 허용 경계만 검증한다. 실제 UI 검사가 아니다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { loadReviewedHistoricalAssets } from '../../../../scripts/internal/public_repo_readiness_lib.mjs';

const prefix='docs/release-artifacts/v4.1.0/s09-recording-ui-21777';
const sha=b=>createHash('sha256').update(b).digest('hex');
function fixture(run) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'media-server-b14-assets-'));
  try {
    fs.mkdirSync(path.join(root,prefix),{recursive:true});
    const bytes=Buffer.from('검토 해시 경계용 합성 바이트; 이미지/브라우저 증거 아님');
    fs.writeFileSync(path.join(root,prefix,'one.jpg'),bytes);
    const value={schema:'media-server.historical-ui-publication-review.v1',entries:[{path:prefix+'/one.jpg',bytes:bytes.length,sha256:sha(bytes),mimeType:'image/jpeg',historicalOnly:true,wholeSuitePass:false}]};
    const manifest='docs/release-artifacts/v4.1.0/review.json';
    const policy={reviewedHistoricalAssets:{manifest,sha256:'',count:1,root:prefix}};
    const save=()=>{const b=Buffer.from(JSON.stringify(value));fs.writeFileSync(path.join(root,manifest),b);policy.reviewedHistoricalAssets.sha256=sha(b);};
    save();run({root,value,policy,save,bytes});
  } finally {fs.rmSync(root,{recursive:true,force:true});assert(!fs.existsSync(root));}
}

test('B14-A01 검토 설정이 없으면 기존 허용 범위를 넓히지 않는다',()=>assert.equal(loadReviewedHistoricalAssets('.',{}).size,0));
test('B14-A02 정확한 path 크기 SHA만 허용하고 같은 폴더 신규 파일은 허용하지 않는다',()=>fixture(({root,policy})=>{
  const result=loadReviewedHistoricalAssets(root,policy);assert.equal(result.size,1);assert(result.has(prefix+'/one.jpg'));assert(!result.has(prefix+'/new.jpg'));
}));
test('B14-A03 manifest hash 불일치 거부',()=>fixture(({root,policy})=>{policy.reviewedHistoricalAssets.sha256='0'.repeat(64);assert.throws(()=>loadReviewedHistoricalAssets(root,policy),/historical-review-invalid/);}));
test('B14-A04 이미지 변조와 크기 불일치 거부',()=>fixture(({root,policy,bytes})=>{fs.writeFileSync(path.join(root,prefix,'one.jpg'),Buffer.concat([bytes,Buffer.from('x')]));assert.throws(()=>loadReviewedHistoricalAssets(root,policy),/historical-review-invalid/);}));
test('B14-A05 범위 밖 경로와 점점 경로 거부',()=>fixture(({root,policy,value,save})=>{for(const p of ['outside.jpg',prefix+'/../outside.jpg',prefix+'//one.jpg']){value.entries[0].path=p;save();assert.throws(()=>loadReviewedHistoricalAssets(root,policy),/historical-review-invalid/);}}));
test('B14-A06 중복 및 count 불일치 거부',()=>fixture(({root,policy,value,save})=>{policy.reviewedHistoricalAssets.count=2;assert.throws(()=>loadReviewedHistoricalAssets(root,policy),/historical-review-invalid/);value.entries.push({...value.entries[0]});save();assert.throws(()=>loadReviewedHistoricalAssets(root,policy),/historical-review-invalid/);}));
test('B14-A07 미완료 증거의 PASS 승격 거부',()=>fixture(({root,policy,value,save})=>{value.entries[0].wholeSuitePass=true;save();assert.throws(()=>loadReviewedHistoricalAssets(root,policy),/historical-review-invalid/);}));
test('B14-A08 이미지 symlink 거부',()=>fixture(({root,policy,bytes})=>{const p=path.join(root,prefix,'one.jpg');fs.writeFileSync(path.join(root,prefix,'other.jpg'),bytes);fs.unlinkSync(p);fs.symlinkSync('other.jpg',p);assert.throws(()=>loadReviewedHistoricalAssets(root,policy),/historical-review-invalid/);}));
test('B14-A09 manifest 탈출 및 잘못된 schema 거부',()=>fixture(({root,policy,value,save})=>{value.schema='unknown';save();assert.throws(()=>loadReviewedHistoricalAssets(root,policy),/historical-review-invalid/);policy.reviewedHistoricalAssets.manifest='../review.json';assert.throws(()=>loadReviewedHistoricalAssets(root,policy),/historical-review-invalid/);}));
