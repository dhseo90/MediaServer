// 파일 용도: B15 실제 명령 영수증의 개별 결과를 전수 표로 결속한다. 실패 이력을 지우지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import {gzipSync,gunzipSync} from 'node:zlib';
const dir=import.meta.dirname;
const receipts=fs.readdirSync(dir).filter(x=>/^b15-.*\.json\.gz$/.test(x)).map(file=>({file,...JSON.parse(gunzipSync(fs.readFileSync(path.join(dir,file))))})).filter(x=>Array.isArray(x.command)).sort((a,b)=>a.startedAt.localeCompare(b.startedAt));
const esc=x=>String(x).replaceAll('|','\\|').replaceAll('\n','<br>');
const text=['# B15 개별 실행 결과','', '독자: 릴리즈 검토자. 수명: v4.1.0 cut. 정책은 AGENTS.md이며 실제 원출력은 각 json.gz다.','',
  '최초 unit-01의 개별 등록 누락은 원출력 통과와 별도로 완료 증거 무효다. unit-02만 현재 증거로 사용한다. 촬영 명령 exit0과 직접 이미지 PASS는 별개이며 최종20개만 manifest에 결속했다.','',
  '| 제목 | 테스트내용 | pass/fail | 비고(실패 후 pass됨 등을 기록) |','| --- | --- | --- | --- |'];
const commands=[];
for(const r of receipts){
  const lines=r.output.split('\n').filter(x=>/^(?:\[(?:pass|fail|PASS|FAIL)\]|\[cleanup\]|\[auth-subcheck\]|PASS:|FAIL:|✔|✖|\{\"captured\")/.test(x)).filter(x=>!(r.command.includes('--no-history')&&x.includes('git history has no high-confidence secrets')));
  text.push(`| ${r.id} | ${esc(r.command.join(' '))}; exit=${r.exit}; elapsed=${r.elapsedMs}ms | ${r.exit===0?'pass':'fail'} | 원출력: ${r.file}${/unit-01$/.test(r.id)?'; 개별 사전등록 누락으로 완료 증거 무효':''} |`);
  lines.forEach((line,index)=>text.push(`| ${r.id}-${index+1} | ${esc(line)} | ${/(?:^\[(?:fail|FAIL)\]|^FAIL:|^✖|\[cleanup\] FAIL)/.test(line)?'fail':'pass'} | 명령의 실제 하위 결과. UI 생성 성공을 시각 PASS로 확대하지 않음 |`));
  commands.push({id:r.id,file:r.file,command:r.command,exit:r.exit,elapsedMs:r.elapsedMs,items:lines.length,evidenceValid:!/unit-01$/.test(r.id),token:r.token});
}
const manifest=JSON.parse(fs.readFileSync('config/docs_ui_assets.json'));
text.push('','## 직접 이미지 전수','', '| 제목 | 테스트내용 | pass/fail | 비고(실패 후 pass됨 등을 기록) |','| --- | --- | --- | --- |');
for(const a of manifest.directReview.assets)text.push(`| ${a.path} | ${a.width}×${a.height}; ${a.bytes}B; SHA ${a.sha256}; 직접 이미지 열람 | pass | ${a.action}; 촬영=${a.capturedAt??'과거 정확한 시각 미확인'}; 검토=${manifest.directReview.reviewedAt}. 제품 UI전수 PASS가 아님 |`);
const cleanup=JSON.parse(fs.readFileSync(path.join(dir,'b15-cleanup.json')));
text.push('','## 소유 임시자료 정리','', '| 경로 | 종류 | 삭제 전 크기 | 조치 | 삭제/보존 결과 | 근거 |','| --- | --- | --- | --- | --- | --- |');
for(const r of cleanup)text.push(`| ${esc(r.path)} | ${r.kind} | ${r.bytes} | ${r.action} | ${r.removed?'부재 확인':'미확인'} | b15-cleanup.json |`);
fs.writeFileSync(path.join(dir,'b15-items.md.gz'),gzipSync(text.join('\n')+'\n'));
fs.writeFileSync(path.join(dir,'b15-summary.json'),JSON.stringify({commands,images:manifest.directReview.assets.length,cleanupRoots:cleanup.length,cleanupRemoved:cleanup.every(x=>x.removed),sourceProductChanged:false,externalReleaseStatus:'cut 동결 이후 실제 PR/Release 기록으로 확인',token:{start:null,end:null,consumed:null,source:'개별 실제 집계 도구 미제공'}},null,2)+'\n');
console.log(JSON.stringify({commands:commands.length,commandFailures:commands.filter(x=>x.exit!==0).map(x=>x.id),individualItems:commands.reduce((n,x)=>n+x.items,0),images:20,cleanupRoots:cleanup.length}));
