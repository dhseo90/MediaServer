// 파일 용도: 녹화 검사 프로세스의 정상 종료·강제 종료·포트 정리 판정을 검증한다.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as cleanup from './recording_process_cleanup.mjs';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {stopServer} from './verify_v410_recording_ui_contract.mjs';
import fs from 'node:fs';
import vm from 'node:vm';
import {EventEmitter} from 'node:events';
const ports=[{kind:'http',port:12345},{kind:'rtsp',port:12346}];

function vlmLifecycleContext() {
  let nextTimer=0; const timers=new Map(), signals=[];
  const child=id=>{const c=new EventEmitter();Object.assign(c,{pid:id,exitCode:null,signalCode:null,verificationPorts:{http:12345,rtsp:12346}});
    c.kill=signal=>{signals.push([id,signal]);queueMicrotask(()=>{c.exitCode=signal==='SIGTERM'?0:null;c.signalCode=signal==='SIGTERM'?null:signal;c.emit('exit',c.exitCode,c.signalCode);});return true;};return c;};
  const context=vm.createContext({console:{log(){}},serverProcess:child(1),setTimeout:fn=>{timers.set(++nextTimer,fn);return nextTimer;},clearTimeout:id=>timers.delete(id),assertPortClosed:async()=>{},AbortSignal});
  return {context,timers,signals,child,fire:async()=>{for(const [id,fn] of [...timers]){timers.delete(id);fn();}await Promise.resolve();await Promise.resolve();}};
}
test('VLM 종료의 과거 전역 타이머가 다음 기동을 죽이는 반례',async()=>{
  const f=vlmLifecycleContext();
  // 출처: 772d6810:scripts/internal/verify_v390_vlm_incident_rule_provenance.mjs stopServer.
  vm.runInContext(`async function oldStop(){if(!serverProcess||serverProcess.exitCode!==null)return;serverProcess.kill('SIGTERM');await Promise.race([new Promise(resolve=>serverProcess.once('exit',resolve)),new Promise(resolve=>setTimeout(resolve,5000)).then(()=>{if(serverProcess.exitCode===null)serverProcess.kill('SIGKILL');})]);}`,f.context);
  await f.context.oldStop();f.context.serverProcess=f.child(2);await f.fire();
  assert.deepEqual(f.signals,[[1,'SIGTERM'],[2,'SIGKILL']]);
});
test('VLM 현행 종료는 이전 타이머를 없애고 다음 기동을 보호',async()=>{
  const f=vlmLifecycleContext();
  const helper=fs.readFileSync(new URL('./verify_v410_recording_ui_contract.mjs',import.meta.url),'utf8');
  vm.runInContext(helper.slice(helper.indexOf('function observedChildExit('),helper.indexOf('export async function assertPortClosed(')).replace('export async function stopServer(','async function stopOwnedServer('),f.context);
  const source=fs.readFileSync(new URL('./verify_v390_vlm_incident_rule_provenance.mjs',import.meta.url),'utf8');
  vm.runInContext(source.slice(source.indexOf('async function stopServer()'),source.indexOf('async function request(')),f.context);
  await f.context.stopServer();assert.equal(f.timers.size,0);f.context.serverProcess=f.child(2);await f.fire();
  assert.deepEqual(f.signals,[[1,'SIGTERM']]);assert.equal(f.context.serverProcess.exitCode,null);
});
test('VLM signal 종료는 health timeout까지 기다리거나 fetch하지 않음',async()=>{
  const f=vlmLifecycleContext();f.context.serverProcess.signalCode='SIGKILL';let fetches=0;f.context.fetch=async()=>{fetches++;return {ok:true};};
  const source=fs.readFileSync(new URL('./verify_v390_vlm_incident_rule_provenance.mjs',import.meta.url),'utf8');
  vm.runInContext(source.slice(source.indexOf('async function waitForHealth('),source.indexOf('async function stopServer()')),f.context);
  await assert.rejects(f.context.waitForHealth('http://127.0.0.1'),/signal=SIGKILL/);assert.equal(fetches,0);
});
function fixture(overrides={}){const child={pid:123,exitCode:null,signalCode:null};let stops=0,checks=0;const stop=cleanup.createProcessCleanup({child,ports,stopServer:async c=>{stops++;if(overrides.stop)return overrides.stop(c);c.exitCode=0;return {forced:false};},assertPortClosed:async p=>{checks++;if(overrides.port)return overrides.port(p);return {closed:true};}});return {child,stop,counts:()=>({stops,checks})};}
test('LP14-D01 종료 관측 helper 존재',()=>assert.equal(typeof cleanup.createProcessCleanup,'function'));
test('LP14-D01 정상 exit0·두port·중복/동시호출 최초결과',async()=>{const f=fixture(),[a,b]=await Promise.all([f.stop(),f.stop()]);assert.equal(a,b);assert(a.normalExitPass&&a.normalShutdownPass&&a.archiveSafe);assert.equal(a.stopCode,'complete');assert.equal(a.forcedTermination,'not-used');assert.deepEqual(f.counts(),{stops:1,checks:2});assert(Object.isFrozen(a)&&Object.isFrozen(a.ports));assert.deepEqual(cleanup.processStartEvidence(f.child,ports),{pid:123,ports});});
for(const [name,exitCode,signalCode] of [['exit7',7,null],['signal',null,'SIGTERM']])test(`LP14-D02 ${name} FAIL과archiveSafe 분리`,async()=>{const f=fixture({stop:c=>{Object.assign(c,{exitCode,signalCode});throw Error(`서버 비정상 종료(exit=${exitCode}, signal=${signalCode})`);}});const r=await f.stop();assert.equal(r.stopCode,'abnormal-exit');assert.equal(r.forcedTermination,'unknown');assert.equal(r.normalExitPass,false);assert.equal(r.archiveSafe,true);assert.deepEqual(f.counts(),{stops:1,checks:2});});
test('LP14-D02 forced SIGKILL은실패지만관측종료/port확인 보존',async()=>{const f=fixture({stop:c=>{c.signalCode='SIGKILL';throw Error('서버 강제 종료(SIGKILL) 사용(exit=null, signal=SIGKILL)');}});const r=await f.stop();assert.equal(r.forcedTermination,'used');assert.equal(r.stopCode,'forced-termination');assert.equal(r.archiveSafe,true);assert.equal(r.normalShutdownPass,false);});
test('LP14-D02 미관측 timeout·중복stop 무한재시도금지',async()=>{const f=fixture({stop:()=>{throw Error('서버 강제 종료(SIGKILL) 후 exit 관찰 시간 초과');}});const a=await f.stop();assert.equal(a,await f.stop());assert.equal(a.stopCode,'forced-exit-timeout');assert.equal(a.archiveSafe,false);assert(a.ports.every(p=>p.status==='not-run'&&p.closed===null));assert.deepEqual(f.counts(),{stops:1,checks:0});});
for(const kind of ['http','rtsp'])test(`LP14-D03 ${kind} port실패에도다른port독립검사`,async()=>{const target=ports.find(p=>p.kind===kind).port;const f=fixture({port:p=>{if(p===target)throw Error(`cleanup 뒤에도 port ${p}가 열려 있음`);}});const r=await f.stop();assert.equal(r.normalExitPass,true);assert.equal(r.normalShutdownPass,false);assert.equal(r.archiveSafe,false);assert.equal(r.ports.find(p=>p.kind===kind).code,'port-open');assert.equal(r.ports.find(p=>p.kind!==kind).closed,true);assert.equal(f.counts().checks,2);});
test('LP14-D03 canary원문미노출·최초실패유지·종료뒤port오류별도보존',async()=>{const primary=Error('http-header-timeout');const f=fixture({stop:c=>{c.exitCode=7;throw Error('private-canary https://private/?token=canary');},port:()=>{throw Error('private-canary');}});const r=await f.stop();assert.equal(primary.message,'http-header-timeout');assert.equal(r.stopCode,'stop-error');assert(r.ports.every(p=>p.code==='port-check-error'));assert(!JSON.stringify(r).includes('canary'));assert.equal(r.archiveSafe,false);});
for(const message of ['서버 SIGTERM 전달 실패','서버 SIGKILL 전달 실패'])test(`LP14-D03 ${message} 고정코드`,async()=>{const r=await fixture({stop:()=>{throw Error(message);}}).stop();assert.equal(r.stopCode,message.includes('SIGTERM')?'term-send-failed':'kill-send-failed');assert.equal(r.forcedTermination,'unknown');assert.equal(r.archiveSafe,false);});
test('LP14-D03 porttimeout 및 비표준 signal원문거부',async()=>{const f=fixture({stop:c=>{c.exitCode=0;return {forced:false};},port:p=>{throw Error(`port ${p} 부재 확인 timeout`);}});assert((await f.stop()).ports.every(p=>p.code==='port-timeout'));const g=fixture({stop:c=>{c.signalCode='private-canary';throw Error('private-canary');}});const r=await g.stop();assert.equal(r.exitedObserved,false);assert.equal(r.signalCode,null);assert(!JSON.stringify(r).includes('canary'));});
for(const exitCode of [0,7])test(`LP14-D04 소유실제Node자식 SIGTERM→exit${exitCode}`,async()=>{const child=spawn(process.execPath,['-e',`process.on('SIGTERM',()=>process.exit(${exitCode}));process.stdout.write('ready\\n');setInterval(()=>{},1000);`],{stdio:['ignore','pipe','pipe'],env:{PATH:process.env.PATH}});let result;try{await once(child.stdout,'data');const stop=cleanup.createProcessCleanup({child,ports,stopServer,assertPortClosed:async()=>({closed:true})});result=await stop();assert.equal(result.exitCode,exitCode);assert.equal(result.archiveSafe,true);assert.equal(result.normalShutdownPass,exitCode===0);assert.equal(await stop(),result);}finally{if(child.exitCode===null&&child.signalCode===null){const exited=once(child,'exit');child.kill('SIGKILL');await exited;}assert(child.exitCode!==null||child.signalCode!==null);console.log('[child-cleanup] '+JSON.stringify({pid:child.pid,exitCode:child.exitCode,signalCode:child.signalCode,exited:true,ports:'injected-no-listeners',tempFiles:'none'}));}});
