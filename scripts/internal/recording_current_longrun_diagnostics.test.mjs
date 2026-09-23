// 파일 용도: LP26-O09 관측 간격의 결정적 경계·실패 자원 보존 검증.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as progress from './recording_longrun_progress.mjs';
const sample=(at=0)=>({pid:42,startIdentity:'linux:1',phaseAt:at,sampledAt:100+at,rssBytes:1024,threadCount:2,fdCount:3,mutationCount:1});
test('LP26-O09-A01 15초 첫/중간 경계와 즉시 실패',()=>{
  assert.equal(typeof progress.assertSampleStep,'function');
  progress.assertSampleStep(null,sample(15000),0,42);
  progress.assertSampleStep(sample(),sample(15000),0,42);
  assert.throws(()=>progress.assertSampleStep(null,sample(15001),0,42),/sample-gap/);
  assert.throws(()=>progress.assertSampleStep(sample(),sample(15001),0,42),/sample-gap/);
});
test('LP26-O09-A02 identity·clock·pid 불일치',()=>{
  assert.equal(typeof progress.assertSampleStep,'function');
  for(const value of [sample(),sample(-1),{...sample(1),pid:43},{...sample(1),startIdentity:'linux:2'},sample(NaN)])
    assert.throws(()=>progress.assertSampleStep(sample(),value,0,42),/sample-/);
});
test('LP26-O09-A03 보존 attempt3의 초과5건 중 첫 간격에서 실패',()=>{
  const text=fs.readFileSync(new URL('../../docs/release-artifacts/v4.1.0/s11-recording-ui-20260923/recording-120-attempt3.log',import.meta.url),'utf8');
  const rows=text.split('\n').filter(l=>l.startsWith('[current-observation] ')).map(l=>JSON.parse(l.slice('[current-observation] '.length)));
  const failures=rows.slice(1).map((r,i)=>r.phaseAt-rows[i].phaseAt>15000?i+1:-1).filter(i=>i>=0);
  assert.equal(failures.length,5);let visited=0;
  assert.throws(()=>{for(let i=0;i<rows.length;i++){visited=i;progress.assertSampleStep(rows[i-1],rows[i],rows[0].phaseAt,rows[0].pid);}},/sample-gap/);
  assert.equal(visited,failures[0]);assert(visited<rows.length-1);
});
test('LP26-O09-D01 실패 표본도 자원 요약에 보존하고 PASS 금지',()=>{
  assert.equal(typeof progress.summarizeAvailableSamples,'function');
  const value=progress.summarizeAvailableSamples([sample(),sample(16000)]);
  assert.equal(value.sampleCount,2);assert.equal(value.groups[0].maxGapMs,16000);assert.equal(value.resourceTrendPass,false);
});
test('LP26-O09-D02 부족 표본과 잘못된 표본은 명시 상태',()=>{
  assert.equal(typeof progress.summarizeAvailableSamples,'function');
  for(const samples of [[],[sample()]])assert.equal(progress.summarizeAvailableSamples(samples).status,'insufficient');
  assert.equal(progress.summarizeAvailableSamples([sample(),{...sample(1),rssBytes:-1}]).status,'invalid');
});
test('LP26-O09-C02 slow 숫자행·완료/미완료·비밀 거부',()=>{
  const row={k:0,o:1,s:1,l:100,m:1,t:1,r:0,b:0,a:0,e:10000000,n:1,w:0,h:10000000,x:0,y:10000000};
  const log=(r=row,s={seen:1,retained:1,thresholdNs:10000000})=>'[recording-latency] '+JSON.stringify(r)+'\n[recording-slow-summary] '+JSON.stringify(s)+'\n';
  assert.equal(progress.slowTraceSummary(log(),true).status,'captured');
  assert.equal(progress.slowTraceSummary(log(),false).status,'incomplete');
  for(const text of ['',log({...row,secret:'DO_NOT_REPORT'}),log(row,{seen:2,retained:2,thresholdNs:10000000}),log()+log(),log().repeat(65)]){
    const value=progress.slowTraceSummary(text,true);assert.equal(value.status,'unavailable');assert(!JSON.stringify(value).includes('DO_NOT_REPORT'));
  }
});
