// 파일 용도: 녹화 완료 추적의 활성화 조건·식별자 해시·안전한 출력 판정을 검증한다.
import test,{before,after} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createCompletionTraceCollector,summarizeCompletion,validateCompletionRow} from './recording_completion_trace.mjs';
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');let root,binary;
before(()=>{
  root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'media-server-completion-')));fs.chmodSync(root,0o700);binary=path.join(root,'smoke');
  const flags=spawnSync('pkg-config',['--cflags','--libs','openssl'],{encoding:'utf8',timeout:5000});assert.equal(flags.status,0);
  const built=spawnSync(process.env.CXX||'c++',['-std=c++17','-Wall','-Wextra','-Werror','-pthread','-DMEDIA_SERVER_USE_OPENSSL=1','-I'+path.join(repo,'include'),path.join(repo,'scripts/internal/recording_completion_trace_smoke.cpp'),...flags.stdout.trim().split(/\s+/),'-o',binary],{encoding:'utf8',timeout:30000});
  assert.equal(built.status,0,built.stderr);
});
after(()=>{if(root){const bytes=fs.readdirSync(root).reduce((n,p)=>n+fs.statSync(path.join(root,p)).size,0);fs.rmSync(root,{recursive:true});assert(!fs.existsSync(root));console.log('[cleanup] '+JSON.stringify({root,bytes,removed:true}));}});
const ref='a'.repeat(64),job='b'.repeat(64);
const row=(event=1,at='10')=>({v:1,event,begin:at,end:at,thread:1,request:0,reference:ref,job:event===1?null:job,n:0,x:0,y:0});
const line=x=>'[recording-completion] '+JSON.stringify(x)+'\n';
function run(mode,env='1'){
  const result=spawnSync(binary,[mode],{encoding:'utf8',timeout:10000,maxBuffer:3*1024*1024,env:{PATH:process.env.PATH,...(env===null?{}:{MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE:env})}});assert.equal(result.status,0);assert.equal(result.stderr,'');return result.stdout;
}
test('LP22-T01 trace off and invalid environment emit nothing',()=>{for(const env of [null,'','0','true','01','1 '])assert.equal(run('normal',env),'');});
test('LP22-T02 trace hashes canary identity and rejects unknown raw fields',()=>{const raw=run('normal');assert(!raw.includes('CANARY'));const c=createCompletionTraceCollector();c.append(raw);assert.equal(c.finish()[0].reference,crypto.createHash('sha256').update('CANARY_REFERENCE').digest('hex'));assert.throws(()=>validateCompletionRow({...row(),raw:'CANARY'}));});
test('LP22-T02 trace count and byte caps emit one explicit loss',()=>{for(const mode of ['cap','bytes']){const raw=run(mode),c=createCompletionTraceCollector();assert(Buffer.byteLength(raw)<=2*1024*1024);c.append(raw);const rows=c.finish();assert(rows.length<=4096);assert.equal(rows.filter(x=>x.event===14).length,1);assert.equal(c.status().status,'loss');}});
test('LP22-T03 partial lines and malformed clocks fail closed',()=>{const c=createCompletionTraceCollector();c.append(line(row()).slice(0,-1));assert.throws(()=>c.finish(),/partial/);assert.throws(()=>validateCompletionRow({...row(),begin:'20',end:'10'}));const real=createCompletionTraceCollector();real.append(run('clock'));assert.equal(real.finish()[0].request,7);});
test('LP26-O13 진행 중 snapshot은 완결된 행만 반환하고 finish는 부분 행을 거부',()=>{const c=createCompletionTraceCollector();const complete=line(row());c.append(complete+complete.slice(0,-1));assert.equal(c.snapshot().length,1);assert.throws(()=>c.finish(),/partial/);});
test('LP22-T03 delayed emission retains event chronology across four references',()=>{const rows=[];for(const c of ['a','c','d','e'])for(const [i,e] of [1,2,3,4,6,7,8,5].entries())rows.push({...row(e,String(i+10)),reference:c.repeat(64)});rows.reverse();for(const c of ['a','c','d','e']){const s=summarizeCompletion(rows,c.repeat(64));assert.equal(s.status,'terminal-observed');assert.equal(s.terminal[0].atNs,'16');}});
test('LP22-T04 invalid durable transitions and missing observation remain distinct',()=>{assert.throws(()=>summarizeCompletion([row(8)],ref),/transition/);assert.equal(summarizeCompletion([row()],ref).status,'terminal-not-observed');assert.equal(summarizeCompletion([],ref).status,'observation-missing');});
