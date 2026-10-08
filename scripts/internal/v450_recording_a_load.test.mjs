// 파일 용도: A 혼합 부하의 단일 in-flight와 밀린 기회 비적체를 제품/모델 없이 확인한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import {AOpportunities,requireMixedWindows} from './v450_recording_a_load.mjs';
test('fixed opportunities; no catchup or duplicate admission',()=>{
 const s=new AOpportunities(100,7200000);assert.equal(s.take(100,false).slot,0);assert.equal(s.take(101,false),null);
 assert.equal(s.take(60100,true),null);assert.equal(s.rows[1].state,'waiting-previous');
 assert.equal(s.take(240100,false).slot,4);assert.deepEqual(s.rows.slice(2,4).map(x=>x.state),['missed','missed']);
 assert.equal(s.take(240101,false),null);assert.equal(s.take(7200100,false),null);
});
test('short preparation cannot claim 120 opportunities',()=>{const s=new AOpportunities(0,30000);assert.equal(s.take(0,false).slot,0);assert.equal(s.take(20000,false),null);assert.throws(()=>new AOpportunities(0,60000));});
test('120 slots bound and skipped inflight not submitted later',()=>{const s=new AOpportunities(0,7200000);for(let n=0;n<120;n++)s.take(n*60000,n%2===1);assert.equal(s.rows.length,120);assert.equal(s.rows.filter(r=>r.state==='admitting').length,60);assert.equal(s.take(7199999,false),null);});

test('one successful phase cannot replace three mixed phases',()=>{const valid=Array.from({length:3},()=>({structured:1,visual:1,evidence:1,visualEvidence:1}));requireMixedWindows(valid);for(let i=0;i<3;i++)for(const key of Object.keys(valid[i])){const bad=structuredClone(valid);bad[i][key]=0;assert.throws(()=>requireMixedWindows(bad));}assert.throws(()=>requireMixedWindows(valid.slice(1)));});

test('frame diagnostic is exactly ten opportunities, no 120-minute label',()=>{const s=new AOpportunities(0,600000);for(let n=0;n<10;n++)s.take(n*60000,false);assert.equal(s.maximum,10);assert.equal(s.rows.length,10);assert.equal(s.take(600000,false),null);for(const n of [599999,600001,720001])assert.throws(()=>new AOpportunities(0,n));});
