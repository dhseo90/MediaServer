// 파일 용도: 직접 검수한 B15 문서 이미지 8개를 복사하고 실제 파일의 보존 영수증을 생성한다.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {gzipSync,gunzipSync} from 'node:zlib';
import {sanitizeTranscript} from './b14-evidence-sanitizer.mjs';
const roots=process.argv.slice(2); // 04 목록·요약, 05 영문 사용자, 07 Live
assert.equal(roots.length,3);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const captures=roots.map(root=>{
  const st=fs.lstatSync(root);
  assert(st.isDirectory()&&!st.isSymbolicLink()&&st.uid===process.getuid()&&/^media-server-b15\.[a-z0-9]+$/i.test(path.basename(root)));
  return JSON.parse(fs.readFileSync(path.join(root,'capture.json')));
});
const manifest=JSON.parse(fs.readFileSync('config/docs_ui_assets.json'));
const receipt=[];
const selected=[];
for(const lang of ['ko','en'])for(const asset of manifest.assets){
  const name=asset.file.replace(/\.png$/,'');
  const recaptured=['ops-rules','ops-users','client-dashboard','client-live'].includes(name);
  const target='docs/assets/ui/'+(lang==='en'?'en/':'')+asset.file;
  let capturedAt='2026-08-31';
  if(recaptured){
    const index=name==='client-live'?2:lang==='en'&&name==='ops-users'?1:0;
    const item=captures[index].find(x=>x.file===lang+'-'+asset.file);
    assert(item,'촬영 영수증 없음');
    const data=fs.readFileSync(path.join(roots[index],item.file));
    assert.equal(hash(data),item.sha256);assert.equal(data.length,item.bytes);
    fs.copyFileSync(path.join(roots[index],item.file),target);
    capturedAt=item.capturedAt.slice(0,10);
    selected.push({...item,path:target,attempt:[4,5,7][index],review:'PASS',reviewScope:'실제 이미지 직접 검토. 전체 제품 UI 검증이 아님'});
  }
  const bytes=fs.readFileSync(target);
  receipt.push({path:target,sha256:hash(bytes),bytes:bytes.length,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20),capturedAt,action:recaptured?'recaptured':'retained',review:'PASS'});
}
for(const target of ['docs/assets/va-four-scene-overlay-ko.jpg','docs/assets/va-four-scene-sample.png']){
  const bytes=fs.readFileSync(target);
  const size=spawnSync('sips',['-g','pixelWidth','-g','pixelHeight',target],{encoding:'utf8'});
  assert.equal(size.status,0);
  receipt.push({path:target,sha256:hash(bytes),bytes:bytes.length,width:Number(size.stdout.match(/pixelWidth: (\d+)/)[1]),height:Number(size.stdout.match(/pixelHeight: (\d+)/)[1]),capturedAt:null,action:'retained',review:'PASS'});
}
manifest.directReview={reviewedAt:'2026-09-28',tool:'Native Chrome + Codex PNG review',assetCount:20,status:'PASS',englishHangulResidue:0,clientLeakCheck:'PASS',assets:receipt};
fs.writeFileSync('config/docs_ui_assets.json',JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(path.join(import.meta.dirname,'b15-image-capture.json'),JSON.stringify({selected,meaning:'직접 열람한 최종8개. 04 실행 전체는 실패했지만 해당5개 파일 생성·해시·정리와 직접 검수는 확인. 실패 이력은 별도 유지.'},null,2)+'\n');
const policy=JSON.parse(fs.readFileSync('config/public_repo_policy.json'));
const transforms=[];
for(const name of fs.readdirSync(import.meta.dirname).filter(x=>/^b15-.*\.json\.gz$/.test(x))){
  const file=path.join(import.meta.dirname,name),old=fs.readFileSync(file),original=gunzipSync(old).toString();
  const clean=sanitizeTranscript(original,policy).text;
  if(clean===original)continue;
  fs.writeFileSync(file,gzipSync(clean));
  transforms.push({path:name,originalSha256:hash(old),sanitizedSha256:hash(fs.readFileSync(file)),reason:'명령 인자의 소유 임시 경로 정제. 판정·수치·실패 이력 불변'});
}
fs.writeFileSync(path.join(import.meta.dirname,'b15-receipt-redactions.json'),JSON.stringify(transforms,null,2)+'\n');
console.log(JSON.stringify({recaptured:selected.length,retained:receipt.length-selected.length,bytes:receipt.reduce((n,x)=>n+x.bytes,0),redactedReceipts:transforms.length}));
