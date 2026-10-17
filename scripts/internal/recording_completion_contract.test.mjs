// R146: 실제 보존 wire와 독립 producer 기대값. 제품 서버/부하는 실행하지 않는다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {validateCompletionRow,createCompletionTraceCollector} from './recording_completion_trace.mjs';
import {completionCollection} from './recording_completion_collection.mjs';
import {captureBoundedProcessLog} from './recording_longrun_progress.mjs';
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const raw=fs.readFileSync(new URL('../../test/fixtures/recording_completion_r145.jsonl',import.meta.url));
const cut=raw.indexOf(10)+1,wire=raw.subarray(0,cut),actual=JSON.parse(wire.toString().split('] ')[1]);
const line=x=>Buffer.from('[recording-completion] '+JSON.stringify(x)+'\n');
const receipt=b=>Buffer.from('[recording-completion-end] '+JSON.stringify({v:1,rows:1,bytes:b.length,lost:false,writeError:false,complete:true})+'\n');
function both(x){const b=line(x),a=createCompletionTraceCollector(),c=completionCollection();a.append(b);assert.deepEqual(a.finish(),[x]);c.append(Buffer.concat([b,receipt(b)]));assert.equal(c.finish().status,'captured');}
function reject(x){assert.throws(()=>validateCompletionRow(x));assert.throws(()=>createCompletionTraceCollector().append(line(x)));const c=completionCollection();c.append(line(x));assert.equal(c.finish().status,'incomplete');}
const timeline=(event=10,request=0)=>({...actual,event,request,reference:null,n:3,x:event===10?2:event===13?5:0,y:event===13?20:0});
test('R146 actual R145 217B row and terminal receipt: both consumers accept',()=>{
 assert.equal(wire.length,217);assert.equal(actual.reference,sha('visual-index-build'));
 assert.equal(sha(wire),'046dade16275ed144542971403163f5ba2df45a2ea8b255c6d0042038425e30d');assert.deepEqual(validateCompletionRow(actual),actual);
 const old=createCompletionTraceCollector();old.append(raw);assert.deepEqual(old.finish(),[actual]);
 const c=completionCollection();c.append(raw);const r=c.finish();assert.equal(r.status,'captured');assert.equal(r.rows,1);assert.equal(r.bytes,217);assert.equal(r.receipt.complete,true);
});
test('R146 fixed preparation labels, background/foreground contexts; identity is not request',()=>{
 for(const reference of [sha('visual-index-build'),sha('visual-search-request')])for(const request of [0,9])both({...actual,reference,request,n:1,x:12,y:23336});
});
test('R146 timeline Media/Overlap/Sort/Page: source-defined payload with or without outer request scope',()=>{
 for(const request of [0,7])for(const event of [10,11,12,13])both(timeline(event,request));
});
test('R146 existing point1..9 and timeline15 rules preserved; loss remains explicit non-success',()=>{
 for(let event=1;event<=9;event++)both({...actual,event,begin:'1',end:'1',reference:'a'.repeat(64),job:event===1?null:'b'.repeat(64),n:event===5?2:0,x:0,y:0});
 for(const n of [1,2,3,4,5,101,102,103,104,105])both({...timeline(),event:15,n,x:5,y:6});
 both({...timeline(),event:15,begin:'1',end:'1',n:106,x:5,y:6});
 const loss={v:1,event:14,begin:'0',end:'0',thread:0,request:0,reference:null,job:null,n:1,x:0,y:0};
 const old=createCompletionTraceCollector();old.append(line(loss));assert.equal(old.status().status,'loss');
 const c=completionCollection();c.append(line(loss));assert.equal(c.finish().status,'incomplete');
});
test('R146 invalid identity, context, payload, clock and schema rejected by both',()=>{
 const bad=[{...actual,reference:'x'.repeat(64)},{...actual,reference:'a'.repeat(64)},{...actual,job:'b'.repeat(64)},
 {...actual,request:-1},{...actual,request:2**32},{...actual,thread:0},{...actual,thread:2**32},
 {...actual,n:-1},{...actual,x:Number.MAX_SAFE_INTEGER+1},{...actual,y:0.5},{...actual,begin:'9',end:'8'},
 {...actual,extra:1},{...actual,n:undefined},{...timeline(),y:1},{...timeline(),x:4},
 {...timeline(11),x:1},{...timeline(12),y:1},{...timeline(13),n:21},{...timeline(13),y:0},
 {...timeline(),event:15,n:99},{...timeline(),event:15,n:106,begin:'1',end:'2'}];
 for(const event of [11,12,13])bad.push({...timeline(event),reference:actual.reference},{...timeline(event),job:'a'.repeat(64)});
 for(const x of bad)reject(x);
});
test('R146 malformed/partial/UTF8 and row caps remain fail closed',()=>{
 for(const b of [Buffer.from('[recording-completion] {bad}\n'),Buffer.from('[recording-completion] {"v":\xff}\n','latin1'),wire.subarray(0,-1)]){
  assert.throws(()=>{const old=createCompletionTraceCollector();old.append(b);old.finish();});
  const c=completionCollection();c.append(b);assert.equal(c.finish().status,'incomplete');
 }
 const big=Buffer.from('[recording-completion] '+' '.repeat(2*1024*1024)+'\n');
 assert.throws(()=>createCompletionTraceCollector().append(big));const c=completionCollection();c.append(big);assert.equal(c.finish().status,'incomplete');
 const many=Buffer.concat(Array(4097).fill(wire));assert.throws(()=>createCompletionTraceCollector().append(many));const d=completionCollection();d.append(many);assert.equal(d.finish().status,'incomplete');
});
test('R146 terminal receipt missing, mismatch, late row and process log overflow rejected',()=>{
 for(const b of [wire,Buffer.concat([wire,receipt(Buffer.alloc(1))]),Buffer.concat([raw,wire])]){const c=completionCollection();c.append(b);assert.equal(c.finish().status,'incomplete');}
 let stopped=0;const app={bytes:0};captureBoundedProcessLog(app,Buffer.alloc(4194305),b=>b.length,()=>stopped++);assert.equal(stopped,1);assert.equal(app.overflow,true);
});
