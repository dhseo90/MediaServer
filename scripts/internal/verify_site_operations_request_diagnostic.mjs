#!/usr/bin/env node
// 파일 용도: 실제 격리 HTTP 서버의 두 운영 GET 진단 연결과 기본 off를 검증한다.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
if (process.argv.length !== 2) throw Error('unsupported arguments');
const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'site-request-diagnostic-')));
const sleep = ms => new Promise(r => setTimeout(r, ms));
let failed = 0, passed = 0, child, closed = true;
const ports = [];
function check(ok, name) { console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`); ok ? passed++ : failed++; }
async function port() {
  const s = net.createServer();
  await new Promise((r,j) => { s.once('error',j); s.listen(0,'127.0.0.1',r); });
  const n=s.address().port; await new Promise(r=>s.close(r)); ports.push(n); return n;
}
async function absent(n) {
  return new Promise((r,j) => { const s=net.connect(n,'127.0.0.1'); s.setTimeout(1000);
    s.once('connect',()=>{s.destroy();r(false);});
    s.once('error',e=>e.code==='ECONNREFUSED'?r(true):j(Error('port check failed')));
    s.once('timeout',()=>{s.destroy();j(Error('port check timeout'));}); });
}
async function stop() {
  if (!child) return;
  if (!closed) child.kill('SIGTERM');
  for(let i=0;i<100&&!closed;i++) await sleep(50);
  if (!closed) { child.kill('SIGKILL'); failed++; for(let i=0;i<40&&!closed;i++) await sleep(50); }
  if (!closed) throw Error('child close unconfirmed');
  check(child.exitCode===0,'SD08 server normal exit'); child=null;
}
function bytes(dir) { let n=0; for(const e of fs.readdirSync(dir,{withFileTypes:true})) {const p=path.join(dir,e.name);const s=fs.lstatSync(p);n+=e.isDirectory()?bytes(p):s.size;}return n; }
async function run(enabled) {
  const dir=path.join(root,enabled?'on':'off');fs.mkdirSync(dir);
  for(const d of ['data','events','recordings','input','tmp'])fs.mkdirSync(path.join(dir,d));
  fs.writeFileSync(path.join(dir,'data/sources.json'),'{"sources":[]}');
  fs.writeFileSync(path.join(dir,'data/views.json'),'{"views":[]}');
  const rp=await port(),hp=await port(); if(rp===hp)throw Error('port collision');
  const env={PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:path.join(dir,'tmp'),
    MEDIA_SERVER_SKIP_LOCAL_ENV:'1',MEDIA_SERVER_SKIP_BUILD:'1',MEDIA_SERVER_SKIP_ENV_CHECK:'1',
    MEDIA_SERVER_BIN_PATH:path.join(repo,'build-gst-onnx/media_server'),MEDIA_SERVER_BUILD_DIR:path.join(repo,'build-gst-onnx'),
    MEDIA_SERVER_AUTH_MODE:'off',MEDIA_SERVER_ENABLE_OPS:'1',MEDIA_SERVER_ENABLE_CLIENT:'0',MEDIA_SERVER_ENABLE_LAB:'0',
    MEDIA_SERVER_LISTEN_ADDRESS:'127.0.0.1',MEDIA_SERVER_HTTP_LISTEN_ADDRESS:'127.0.0.1',
    MEDIA_SERVER_LISTEN_PORT:String(rp),MEDIA_SERVER_HTTP_LISTEN_PORT:String(hp),
    MEDIA_SERVER_FILE_ROOT:path.join(dir,'input'),MEDIA_SERVER_DEFAULT_FILE:path.join(dir,'input/absent.mp4'),
    MEDIA_SERVER_STATE_DIR:path.join(dir,'data'),MEDIA_SERVER_AUTH_USERS_FILE:path.join(dir,'data/users.json'),
    MEDIA_SERVER_SOURCE_REGISTRY:path.join(dir,'data/sources.json'),MEDIA_SERVER_PUBLISHED_VIEWS:path.join(dir,'data/views.json'),
    MEDIA_SERVER_ANALYSIS_REGISTRY:path.join(dir,'data/analysis.json'),MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_ENABLED:'0',
    MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_PATH:path.join(dir,'events/events.jsonl'),MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED:'0',
    MEDIA_SERVER_RECORDING_ENABLED:'0',MEDIA_SERVER_RECORDING_STORAGE_ROOT:path.join(dir,'recordings'),
    MEDIA_SERVER_GST_CACHE_DIR:path.join(dir,'gst-cache'),MEDIA_SERVER_GST_PLUGIN_PROFILE:'headless',
    GST_REGISTRY:path.join(dir,'gst-registry.bin'),GST_REGISTRY_1_0:path.join(dir,'gst-registry.bin')};
  if(enabled)env.MEDIA_SERVER_SITE_OPERATIONS_REQUEST_DIAGNOSTIC='1';
  let logs='',overflow=false;
  child=spawn(path.join(repo,'server.sh'),['foreground'],{cwd:dir,env,stdio:['ignore','pipe','pipe']});closed=false;
  child.once('close',()=>closed=true);
  child.on('error',()=>{failed++;});
  const collect=b=>{if(logs.length+b.length>4*1024*1024)overflow=true;else logs+=b.toString();};
  child.stdout.on('data',collect);child.stderr.on('data',collect);
  const get=p=>fetch(`http://127.0.0.1:${hp}${p}`,{signal:AbortSignal.timeout(3000),redirect:'manual'});
  let ready=false;for(let i=0;i<150&&!closed;i++){try{const r=await get('/health');await r.text();if(r.status===200){ready=true;break;}}catch{}await sleep(100);}
  if(!ready)throw Error('server readiness failed');
  for(const p of ['impact-graph','runbook-instance-ledger']) {
    const r=await get('/ops/api/site-operations/'+p+'?diagnosticCanary=not-for-output');
    const b=await r.json();check(r.status===200&&b.ok===true,`${enabled?'SD06':'SD07'} ${p} unchanged HTTP200`);
  }
  await stop();
  check(!overflow,'SD08 bounded output');
  const lines=logs.split('\n').filter(x=>x.startsWith('[site-request-diagnostic] '));
  if(!enabled){check(lines.length===0,'SD07 default off emits no diagnostic');return;}
  check(lines.length===8,'SD06 actual runtime emits two four-phase traces');
  const rows=lines.map(l=>JSON.parse(l.slice('[site-request-diagnostic] '.length)));
  for(const route of ['impact_graph','runbook_instance_ledger']) {
    const xs=rows.filter(r=>r.route===route);
    check(xs.length===4&&xs.map(r=>r.phase).join(',')==='parsed,handler_begin,handler_end,send_end'&&
      new Set(xs.map(r=>r.requestId)).size===1&&xs.every((r,i)=>Number.isFinite(r.elapsedUs)&&r.elapsedUs>=0&&(!i||r.elapsedUs>=xs[i-1].elapsedUs))&&xs[3].sendSuccess===true,
      `SD06 ${route} ordered phases and actual send success`);
  }
  check(!lines.join('').includes('not-for-output')&&!lines.join('').includes('diagnosticCanary'),'SD03 query absent from diagnostics');
}
const started=Date.now();
try {await run(true);if(!failed)await run(false);}catch (error) {
  const code=['EPERM','EACCES','EADDRINUSE'].includes(error.code)?error.code:'SUPPRESSED';
  check(false,`integration execution error code=${code}`);
}
finally {
  try{await stop();}catch{check(false,'SD08 child cleanup failed');}
  for(const p of ports){try{check(await absent(p),`SD08 port ${p} absent`);}catch{check(false,'SD08 port check failed');}}
  if(closed){const n=bytes(root);fs.rmSync(root,{recursive:true});let gone=false;try{fs.lstatSync(root);}catch(e){gone=e.code==='ENOENT';}check(gone,'SD08 root absent');console.log(`[cleanup] ${root} bytes=${n} absent=${gone}`);}
  else check(false,'SD08 root retained because child alive');
}
console.log(JSON.stringify({passed,failed,elapsedMs:Date.now()-started,actualUi:false}));
process.exitCode=failed?1:0;
