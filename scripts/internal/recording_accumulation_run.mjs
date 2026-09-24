// 파일 용도: LP26-O10 bounded 단회 측정과 관측기 독립 oracle. 실제 longrun이 아니다.
import fs from 'node:fs';import path from 'node:path';import {spawn,spawnSync} from 'node:child_process';
import {CurrentRecordingObserver,normalizeCurrentRows} from './recording_current_observer.mjs';
import {casePlan,assertDrain,assertRotation,stageTracker} from './recording_accumulation_plan.mjs';
const root=process.argv[2],binary=path.join(root,'probe'),normalizer=path.join(root,'normalize'),metrics=path.join(root,'metrics');
if(!/^media-server-catalog-cost\.[A-Za-z0-9]+$/.test(path.basename(root))||fs.realpathSync(root)!==root||(fs.statSync(root).mode&0o777)!==0o700)throw Error('owned-root');
const start=performance.now();let bytes=0;const readers=[];
const selected=process.argv[3];if(selected!==undefined&&!['16','1020','2049'].includes(selected))throw Error('selected-case');
function size(p){const s=fs.lstatSync(p);return s.isDirectory()?fs.readdirSync(p).reduce((n,k)=>n+size(path.join(p,k)),0):s.size;}
function resources(){const diskBytes=size(root),rssBytes=process.memoryUsage().rss;if(diskBytes>=448*1024*1024||rssBytes>1073741824)throw Error('resource-cap');return {diskBytes,parentRssBytes:rssBytes};}
function run(args,timeoutMs){return new Promise((resolve,reject)=>{
  const child=spawn(binary,args,{stdio:['ignore','pipe','pipe'],detached:true});let stopped=null,force,peakRssBytes=0,metricsUnavailable=0;
  const catalog=args[0]==='--catalog';let stageTimer,pending='';
  const begin=performance.now();
  const stop=reason=>{stopped??=reason;try{process.kill(-child.pid,'SIGTERM');}catch{}if(!force)force=setTimeout(()=>{try{process.kill(-child.pid,'SIGKILL');}catch{}},2000);};
  const stageWatch=catalog?stageTracker(event=>{clearTimeout(stageTimer);if(event.state==='begin'&&!stopped)stageTimer=setTimeout(()=>stop('stage-time-cap'),15000);}):null;
  const technicalCapMs=catalog?65000:timeoutMs;
  const timer=setTimeout(()=>stop(catalog?'technical-process-cap':'time-cap'),technicalCapMs);
  const memory=setInterval(()=>{try{resources();const r=spawnSync(metrics,[String(child.pid)],{encoding:'utf8',timeout:1000,maxBuffer:16384});
    if(r.status===0){const m=JSON.parse(r.stdout);if(m.valid&&m.rssBytes>0){peakRssBytes=Math.max(peakRssBytes,m.rssBytes);if(m.rssBytes>1073741824)stop('rss-cap');}else metricsUnavailable++;}else metricsUnavailable++;
  }catch{stop('resource-observer');}},250);
  for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{bytes+=chunk.length;if(bytes>4*1024*1024){stop('output-cap');return;}process.stdout.write(chunk);
    if(stream===child.stdout&&stageWatch&&!stopped){pending+=chunk.toString();let at;while((at=pending.indexOf('\n'))>=0){const line=pending.slice(0,at);pending=pending.slice(at+1);try{stageWatch.line(line);}catch{stop('stage-oracle');break;}}if(pending.length>65536)stop('stage-line-cap');}});
  child.on('error',()=>stop('spawn-error'));
  child.on('close',(exit,signal)=>{clearTimeout(timer);clearTimeout(stageTimer);clearTimeout(force);clearInterval(memory);
    if(stageWatch&&!stopped&&exit===0&&!signal)try{stageWatch.finish();}catch{stopped='stage-incomplete';}
    console.log('[probe-process] '+JSON.stringify({mode:args[0],exit,signal,stopped,elapsedMs:performance.now()-begin,peakObservedRssBytes:peakRssBytes||null,metricsUnavailable,stageLimitMs:catalog?15000:null,technicalCapMs,...resources()}));
    if(exit!==0||signal||stopped)reject(Error(stopped??'native-stage-failed'));else resolve();});
});}
function drain(observer,count,phase){const begin=performance.now(),before=resources();let result,fresh=0,polls=0;
  try{do{if(++polls>128)throw Error('observer-backlog-cap');result=observer.poll();fresh+=result.rows.length;resources();}while(result.backlog);
    assertDrain(result,count);if(phase==='rotated')assertRotation({fresh,rotations:result.rotations});else if(fresh!==4*count)throw Error('fresh-count');
    if(performance.now()-begin>15000)throw Error('observation-gap');
    console.log('[pass] LP26-O10-B '+count+' '+phase+' exact-count-prefix');return result;
  }finally{console.log('[probe-drain] '+JSON.stringify({sources:count,phase,elapsedMs:performance.now()-begin,polls,fresh,rotations:result?.rotations??null,before,after:resources(),nativeTimeoutMs:3000,observationLimitMs:15000,performancePass:false}));}}
try{
  if(!selected)await run(['--bounds'],15000);await run(['--generate',root,...(selected?[selected]:[])],60000);
  for(const {sources} of casePlan().filter(item=>!selected||item.sources===Number(selected))){
    const dir=path.join(root,'case-'+sources),file=path.join(dir,'recording-v2-mutations.jsonl'),observer=new CurrentRecordingObserver(dir,normalizer);readers.push(observer);
    drain(observer,sources,'initial');const before=fs.statSync(file).ino;
    await run(['--catalog',dir,String(sources)],15000);
    const actualCheckpointRotation=fs.statSync(file).ino!==before;
    if(!actualCheckpointRotation){fs.copyFileSync(file,file+'.owned-copy',fs.constants.COPYFILE_EXCL);fs.renameSync(file+'.owned-copy',file);}
    console.log('[probe-rotation] '+JSON.stringify({sources,actualCheckpointRotation,identicalBytesReplacement:!actualCheckpointRotation}));drain(observer,sources,'rotated');
    if(sources===2049)await run(['--automatic',dir,String(sources)],30000);
    if(sources===2049)await run(['--automatic-full',dir,String(sources)],30000);
    if(sources===2049)await run(['--automatic-full-reopen',dir,String(sources)],30000);
    observer.close();
  }
  let rejected=false;try{normalizeCurrentRows(normalizer,['{"schema":"invalid"}']);}catch(error){rejected=error.message==='observer-native-rejected';}
  if(!rejected)throw Error('corrupt-oracle');console.log('[pass] LP26-O10-E01 malformed mutation rejected');
  console.log('[summary] '+JSON.stringify({completed:true,elapsedMs:performance.now()-start,...resources(),performancePass:false,longrunPass:false,uiPass:false,tokenStart:null,tokenEnd:null,tokenConsumed:null,tokenSource:'전용 집계 없음'}));
}catch(error){console.log('[fail] LP26-O10 '+(/^[a-z-]+$/.test(error.message)?error.message:'redacted-stage-error'));process.exitCode=1;}
finally{for(const observer of readers)observer.close();console.log('[probe-reader-cleanup] '+JSON.stringify({readers:readers.length,closed:true,elapsedMs:performance.now()-start,...resources()}));}
