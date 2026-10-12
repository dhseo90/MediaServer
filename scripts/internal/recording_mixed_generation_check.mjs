// 파일 용도: R99 source-bound generation/copy 복구의 부모 수집·공간 보호. 제품 기본 설정에 접근하지 않는다.
import fs from 'node:fs';
import {resourceTraceCollector,collectResourceTrace,finishResourceTrace} from './recording_resource_trace.mjs';
import {snapshotTree,copyVerified} from './recording_archive_diagnostic_profile.mjs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {collectProcess} from './recording_foundation_observer.mjs';
import {verifyCurrentCyclicProgress,admitWorkspaceSnapshot,createWorkspaceFailureCapture,measureCurrentCopy,measureCurrentRootStable} from './recording_current_observer.mjs';
const [root,binary,collector]=process.argv.slice(2),repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
if(!root||fs.realpathSync(root)!==root||!/^\/private\/tmp\/media-server-|^\/tmp\/media-server-/.test(root))throw Error('owned-run');
const rs=fs.lstatSync(root);if(rs.uid!==process.getuid()||(rs.mode&511)!==448)throw Error('run-owner');
const capture=createWorkspaceFailureCapture(root),baseline={fixedBytes:0,capBytes:448*1024**2};
const data=path.join(root,'live'),copy=path.join(root,'copy');fs.mkdirSync(data,{mode:0o700});
let first=null,sampleCount=0,summary={schema:'r99-generation-cyclic-v1',status:'RUNNING',cyclicRecoveryPass:false,spacePass:false,sourceHead:spawnSync('git',['rev-parse','HEAD'],{cwd:repo,encoding:'utf8'}).stdout.trim(),sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(repo,'scripts/internal/recording_mixed_generation_fixture.h'))).digest('hex')};
const measure=dir=>{const s=fs.lstatSync(dir);return measureCurrentCopy(dir,{dev:s.dev,ino:s.ino});};
const samples=fs.openSync(path.join(root,'space.jsonl'),'wx',0o600);
function named(){
  const measurementStartedAt=performance.now(),live=measureCurrentRootStable(data),recovery=fs.existsSync(copy)?measureCurrentRootStable(copy).totalBytes:0;
  let parentBytes=0;for(const name of fs.readdirSync(root)){if(name==='live'||name==='copy')continue;const s=fs.lstatSync(path.join(root,name));if(!s.isFile()||s.isSymbolicLink()||s.nlink!==1||s.uid!==process.getuid())throw Error('parent-output-file');parentBytes+=s.size;}
  return {totalBytes:live.totalBytes+parentBytes,copyBytes:recovery,parentBytes,categories:live.categories,measurementStartedAt,measurementCompletedAt:performance.now()};
}
function tree(dir){let rows=[];const walk=d=>{for(const name of fs.readdirSync(d).sort()){const f=path.join(d,name),s=fs.lstatSync(f);if(s.isDirectory())walk(f);else {if(!s.isFile()||s.nlink!==1||s.isSymbolicLink())throw Error('tree-file');rows.push([path.relative(dir,f),s.size,crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')]);}}};walk(dir);return crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex');}
async function run(mode,dir,isCopy){
  const raw=fs.openSync(path.join(root,mode.slice(2)+'.log'),'wx',0o600);
  let child;try{child=spawn('python3',[path.join(repo,'scripts/internal/recording_native_isolation.py'),dir,'--',binary,dir,mode],{cwd:repo,stdio:['pipe','pipe','pipe'],detached:true});}catch(e){fs.closeSync(raw);throw e;}
  let bytes=0,pid=null,identity=null,phase='spawn',pending='',observing=false,primary=null,closed=false,seen=0,stderrText='',killTimer=null;const phases=[],baselines={},progress=[];let cut=null;
  const stop=e=>{primary??=e;try{process.kill(-child.pid,'SIGTERM');}catch(x){if(x.code!=='ESRCH')primary??=x;}if(!killTimer)killTimer=setTimeout(()=>{try{process.kill(-child.pid,'SIGKILL');}catch(e){if(e.code!=='ESRCH')primary??=e;}},1000);};
  const interrupt=()=>stop(Error('native-interrupted'));process.once('SIGTERM',interrupt);process.once('SIGINT',interrupt);
  async function observe(ack=false){if(observing||!pid||closed)return;observing=true;try{
    const begin=performance.now(),m=await collectProcess(collector,pid);if(closed&&!ack&&!m.valid)return;if(!m.valid||m.error!==null||m.rssBytes>4*1024**3)throw Error('native-metric-budget');
    identity??=m.startIdentity;const storage=named();const decision=admitWorkspaceSnapshot({storage,baseline,metrics:{...m,measurementStartedAt:begin,measurementCompletedAt:performance.now()},expectedPid:pid,expectedStart:identity,anonymousInCopy:isCopy,context:{kind:'r99-generation',phase,sampleIndex:++sampleCount}},capture);
    const row=JSON.stringify({phase,pid,measurementStartedAt:begin,measurementCompletedAt:performance.now(),metrics:m,decision})+'\n';if(fs.fstatSync(samples).size+Buffer.byteLength(row)>4*1024**2)throw Error('space-log-cap');if(fs.writeSync(samples,row)!==Buffer.byteLength(row))throw Error('space-log-short-write');++seen;
    if(ack){if(phase==='baseline'){const bytes=fs.readFileSync(path.join(dir,'recordings/recording-generation.json'));const manifest=JSON.parse(bytes);if(!manifest.storeId||!Number.isSafeInteger(manifest.cutOrdinal))throw Error('baseline-manifest');cut={storeId:manifest.storeId,generation:manifest.generation,cutOrdinal:manifest.cutOrdinal,manifestSha256:crypto.createHash('sha256').update(bytes).digest('hex'),observedAt:performance.now()};}child.stdin.write('observed\n');}
  }catch(e){capture.capture(e,{phase,pid});stop(e);}finally{observing=false;}}
  function collect(b,stderr){try{bytes+=b.length;if(bytes>4*1024**2){stop(Error('native-log-cap'));return;}if(fs.writeSync(raw,b)!==b.length)throw Error('native-log-short-write');if(stderr){stderrText+=b.toString();return;}
    pending+=b.toString();if(pending.length>65536){stop(Error('native-line-cap'));return;}let end;
    while((end=pending.indexOf('\n'))>=0){const line=pending.slice(0,end);pending=pending.slice(end+1);const match=/^\[R99-phase\] ([a-z-]+) (\d+)$/.exec(line);
      if(line.startsWith('[R99-baseline] ')){
        const fields=line.slice(15).trim().split(' '),channel=fields.shift(),values=Object.fromEntries(fields.map(v=>v.split('=')));
        if(baselines[channel]||!['9101','9201'].includes(channel))throw Error('baseline-duplicate');
        baselines[channel]={channel,count:Number(values.count),bytes:Number(values.bytes),order:Number(values.order)};
      }
      if(line.startsWith('[R99-progress] ')){
        const values=Object.fromEntries(line.slice(15).trim().split(' ').map(v=>v.split('='))),current=Object.fromEntries(Object.entries(values).map(([k,v])=>[k,k==='channel'?v:Number(v)]));
        if(!cut||progress.some(p=>p.progress.channel===current.channel))throw Error('progress-cut');
        progress.push(verifyCurrentCyclicProgress(baselines[current.channel],current));
      }
      if(match){phase=match[1];phases.push(phase);if(pid&&pid!==Number(match[2])){stop(Error('native-pid-change'));return;}pid=Number(match[2]);const ack=()=>{if(closed)return;if(observing)setTimeout(ack,10);else void observe(true);};ack();}
    }
  }catch(e){capture.capture(e,{kind:'native-collection',phase,pid});stop(e);}}
  child.stdout.on('data',b=>collect(b,false));child.stderr.on('data',b=>collect(b,true));child.on('error',stop);child.stdin.on('error',e=>{if(!closed)stop(e);});
  const timer=setTimeout(()=>stop(Error('native-timeout')),isCopy?15000:180000),poll=setInterval(()=>void observe(),500);
  const result=await new Promise(resolve=>child.on('close',(code,signal)=>{closed=true;resolve({code,signal});}));clearTimeout(timer);clearInterval(poll);process.removeListener('SIGTERM',interrupt);process.removeListener('SIGINT',interrupt);while(observing)await new Promise(r=>setTimeout(r,10));try{fs.closeSync(raw);}catch(e){primary??=e;}
  // 부모 wrapper 종료가 같은 process group의 모든 후손 종료를 뜻하지는 않는다.
  const groupAlive=()=>{try{process.kill(-child.pid,0);return true;}catch(e){if(e.code==='ESRCH')return false;throw e;}};
  let cleanupError=null;
  try{if(groupAlive()){primary??=Error('native-group-remains');process.kill(-child.pid,'SIGKILL');
    const until=performance.now()+1000;while(groupAlive()&&performance.now()<until)await new Promise(r=>setTimeout(r,10));
    if(groupAlive())cleanupError='native-group-cleanup-failed';}}
  catch(e){cleanupError=e.message;}finally{clearTimeout(killTimer);}
  if(cleanupError){capture.capture(Error(cleanupError),{kind:'cleanup',primary:primary?.message??null});if(primary)primary.cleanupError=cleanupError;else primary=Error(cleanupError);}
  if(primary)throw primary;if(pending||!stderrText.endsWith('\n'))throw Error('native-partial-output');if(result.code!==0||result.signal||seen===0)throw Error('native-child-failed:'+JSON.stringify(result));
  try{process.kill(-child.pid,0);throw Error('native-group-remains');}catch(e){if(e.code!=='ESRCH')throw e;}
  const trace=resourceTraceCollector(pid);collectResourceTrace(trace,Buffer.from(stderrText));const owner=finishResourceTrace(trace);
  const required=isCopy?['copy-opened','copy-released']:['opened','baseline','cyclic','cyclic','checkpoint','released'];if(JSON.stringify(phases.filter(p=>p!=='prestate-progress'))!==JSON.stringify(required))throw Error('native-phase-missing');
  if(!isCopy&&(progress.length!==2||!cut))throw Error('cyclic-baseline-incomplete');
  return {...result,samples:seen,bytes,phases,owner,cut,progress};
}
try{
  summary.live=await run('--mixed-generation',data,false);
  const before=tree(data);admitWorkspaceSnapshot({storage:{...named(),copyBytes:measure(data).bytes},baseline,context:{kind:'r99-copy-admission'}},capture);
  const snapshot=snapshotTree(data),storage=named();copyVerified(data,copy,snapshot,n=>admitWorkspaceSnapshot({storage:{...storage,copyBytes:n},baseline,context:{kind:'r99-copy-write'}},capture));
  if(tree(copy)!==before)throw Error('copy-bytes');summary.recovery=await run('--mixed-generation-reopen',copy,true);
  if(tree(data)!==before)throw Error('original-changed');summary.originalUnchanged=true;summary.cyclicRecoveryPass=true;summary.spacePass=true;summary.status='PASS';
}catch(e){first=e;summary.status='FAIL';summary.error=e.message;summary.cleanupError=e.cleanupError??null;}
finally{fs.closeSync(samples);try{capture.close();}catch(e){first??=e;summary.status='FAIL';summary.error??=e.message;}summary.workspace=capture.summary();summary.sampleCount=sampleCount;summary.observationLimit='sequential 500ms samples and paused boundary samples; not instantaneous peak';fs.writeFileSync(path.join(root,'result.json'),JSON.stringify(summary,null,2)+'\n',{flag:'wx'});}
console.log(JSON.stringify(summary));if(first)process.exitCode=1;
