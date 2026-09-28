// 파일 용도: B14 원본을 읽기 전용으로 전수 대조한다. 저장소 내용은 쓰지 않는다.
import fs from 'node:fs';
import zlib from 'node:zlib';
import {spawnSync} from 'node:child_process';
import {sanitizeTranscript} from './b14-evidence-sanitizer.mjs';
import {digest,rewriteMarkdownLinks} from './b14-migrate-evidence.mjs';
const base='docs/release-artifacts/v4.1.0/s11-final-20260926';
const receipt=JSON.parse(zlib.gunzipSync(fs.readFileSync(`${base}/b14-migration-receipt.json.gz`)));
const policy=JSON.parse(fs.readFileSync('config/public_repo_policy.json'));
const mapping=new Map(receipt.entries.filter(e=>e.moved).map(e=>[e.source,e.published]));
const start=performance.now();
const batch=spawnSync('git',['cat-file','--batch'],{
  input:receipt.entries.map(e=>`${receipt.sourceCommit}:${e.source}`).join('\n')+'\n',maxBuffer:64*1024*1024});
if(batch.status!==0)throw Error('B14_BATCH_FAILED');
let offset=0;const errors=[],currentDrift=[];
for(const entry of receipt.entries){
  const end=batch.stdout.indexOf(10,offset),header=batch.stdout.subarray(offset,end).toString();
  const size=Number(header.split(' ')[2]);
  if(end<offset||!Number.isSafeInteger(size)||size<0)throw Error('B14_BATCH_HEADER');
  const original=batch.stdout.subarray(end+1,end+1+size);offset=end+size+2;
  if(digest(original)!==entry.originalSha256||original.length!==entry.originalBytes){errors.push({file:entry.source,reason:'original'});continue;}
  let text=(entry.moved&&entry.source.endsWith('.gz')?zlib.gunzipSync(original):original).toString();
  text=sanitizeTranscript(text,policy).text;
  if(entry.source.endsWith('.md'))text=rewriteMarkdownLinks(text,entry.source,mapping);
  if(entry.source==='scripts/internal/recording_current_longrun_diagnostics.test.mjs'){
    const old='docs/release-artifacts/v4.1.0/s11-recording-ui-20260923/recording-120-attempt3.log';text=text.replace(old,mapping.get(old));
  }
  if(digest(text)!==entry.publishedSha256||Buffer.byteLength(text)!==entry.publishedBytes)errors.push({file:entry.source,reason:'allowed-transform'});
  if(digest(fs.readFileSync(entry.published))!==entry.publishedSha256)currentDrift.push(entry.published);
  if(entry.moved&&fs.existsSync(entry.source))errors.push({file:entry.source,reason:'original-not-removed'});
}
// 중앙 기록의 후속 실행 결과 추가만 이행 snapshot과 별도로 허용한다.
const unexpectedDrift=currentDrift.filter(file=>file!=='docs/release-test-records.md');
const result={schema:'media-server.b14-independent-transform-audit.v1',sourceCommit:receipt.sourceCommit,
  entries:receipt.entries.length,originalAndAllowedTransformErrors:errors,currentDrift,unexpectedDrift,
  elapsedMs:performance.now()-start,home:receipt.entries.reduce((n,e)=>n+e.replacements.home,0),
  temp:receipt.entries.reduce((n,e)=>n+e.replacements.temp,0),
  interpretation:'Git 원본과 영수증 전수 대조. 허용된 root 치환·링크만 재계산. 중앙 기록의 후속 결과 추가는 이행 snapshot과 구분.'};
console.log(JSON.stringify(result,null,2));process.exitCode=errors.length||unexpectedDrift.length?1:0;
