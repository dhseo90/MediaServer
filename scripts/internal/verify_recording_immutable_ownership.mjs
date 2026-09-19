// LP18 단기 공유 소유 검사: 기존 bounded guard를 재사용하고 원출력/정리를 보존한다.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {runBounded,treeBytes,limits} from './recording_catalog_comparison_guard.mjs';

const here=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(here,'../..');
const [mode,id,suite='envelope',...extra]=process.argv.slice(2);
if(!['red','green'].includes(mode)||!['envelope','accepted'].includes(suite)||!id||!/^[a-z0-9-]{1,40}$/.test(id)||extra.length)throw Error('LP18_ARGUMENTS');
const output=path.join(repo,'docs/release-artifacts/v4.1.0/s11-preparation-mapping',`lp18-ownership-${mode}-${id}.txt`);
const log=fs.openSync(output,'wx',0o600),start=Date.now();let root=null,bytes=0,clean=true,ok=false;
const names=['include/recording/recording_catalog.h','include/recording/recording_journal.h','src/recording/recording_catalog.cpp','src/recording/recording_journal.cpp','src/recording/recording_checkpoint_validation.h','scripts/internal/recording_immutable_ownership_smoke.cpp','scripts/internal/recording_immutable_ownership_build.sh','scripts/internal/verify_recording_immutable_ownership.mjs'];
const manifest=()=>names.map(name=>({name,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(repo,name))).digest('hex')}));
let before=null;
function emit(value){let text=typeof value==='string'?value:JSON.stringify(value);if(root)text=text.split(root).join('<owned-root>');text=text.split(repo).join('<repo>');if(!text.endsWith('\n'))text+='\n';const b=Buffer.from(text);if(bytes+b.length>limits.output)throw Error('LP18_LOG_CAP');fs.writeSync(log,b);process.stdout.write(b);bytes+=b.length;}
function env(){const e={};for(const n of ['PATH','LANG','LC_ALL','TMPDIR','SDKROOT','DEVELOPER_DIR','MACOSX_DEPLOYMENT_TARGET','PKG_CONFIG_PATH','CXX'])if(process.env[n])e[n]=process.env[n];const prefix=['/opt/homebrew','/usr/local'].find(p=>fs.existsSync(path.join(p,'lib/gstreamer-1.0')));if(prefix)e.HOMEBREW_PREFIX=prefix;return {...e,MEDIA_SERVER_SKIP_LOCAL_ENV:'1',MEDIA_SERVER_GST_PLUGIN_PROFILE:'headless',MEDIA_SERVER_GST_CACHE_DIR:path.join(root,'gst-cache'),GST_REGISTRY:path.join(root,'registry.bin'),GST_REGISTRY_1_0:path.join(root,'registry.bin'),MEDIA_SERVER_VERIFY_RECORDING_LATENCY_TRACE:'0'};}
async function phase(label,command,args){
 emit({kind:'command',label,command,args,seconds:60});
 const r=await runBounded({root,command:'/bin/bash',args:['-c','set -euo pipefail; source "$1"; shift; media_server_apply_homebrew_gst_env; exec "$@"','lp18',path.join(here,'env_common.sh'),command,...args],env:env(),seconds:60});
 clean&&=r.groupClean;emit(r.stdout);emit(r.stderr);emit({kind:'phase',label,exit:r.code,signal:r.signal,stopReason:r.stopReason,cleanup:r.groupClean,elapsedMs:r.elapsedMs,groupPeakRssBytes:r.groupPeakRssBytes});
 if(!r.groupClean||r.signal||r.stopReason)throw Error('LP18_PHASE_GUARD');return r;
}
try{
 root=fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()),'media-server-immutable-ownership.'));fs.chmodSync(root,0o700);
 before=manifest();emit({kind:'start',utc:new Date().toISOString(),mode,id,suite,source:before,tokenStart:null,tokenEnd:null,tokenConsumed:null,tokenSource:'unavailable'});
 const built=await phase('build','bash',[path.join(here,'recording_immutable_ownership_build.sh'),root]);if(built.code!==0)throw Error('LP18_BUILD');
 const run=await phase('focused',path.join(root,'check'),suite==='accepted'?[root,'accepted']:[root]);
 const failures=run.stdout.split('\n').filter(l=>l.startsWith('[fail] ')).map(l=>l.slice(7));
 const expected=suite==='accepted'?['LP18-O07 append accepted shares journal envelope','LP18-O07 checkpoint accepted shares live journal envelope','LP18-O08 reopen accepted shares journal envelope sqlite','LP18-O08 reopen accepted shares journal envelope fallback',...['schema','type','id','entity','time','payload'].map(field=>'LP18-O09 supplied envelope mismatch rejected '+field),'LP18-O09 supplied exact envelope is retained']:['LP18-O01 shared journal original candidate envelopes','LP18-O01 retained prefix shares journal envelope','LP18-O02 only transformed receipts own new envelopes'];
 const summary=run.stdout.match(/^\[summary\] LP18 pass=(\d+) fail=(\d+)$/gm)||[];
 const expectedSummary=suite==='accepted'?(mode==='red'?'[summary] LP18 pass=40 fail=11':'[summary] LP18 pass=55 fail=0'):(mode==='red'?'[summary] LP18 pass=20 fail=3':'[summary] LP18 pass=34 fail=0');
 ok=summary.length===1&&summary[0]===expectedSummary&&(mode==='red'?run.code===1&&JSON.stringify(failures)===JSON.stringify(expected):run.code===0&&failures.length===0);
 emit({kind:'oracle',mode,expectedRed:mode==='red'&&ok,productPass:mode==='green'&&ok,matched:ok});
}catch(e){emit({kind:'failure',code:['LP18_LOG_CAP','LP18_PHASE_GUARD','LP18_BUILD'].includes(e?.message)?e.message:'LP18_PREPARATION_OR_ORACLE'});ok=false;}
finally{
 if(before){const unchanged=JSON.stringify(before)===JSON.stringify(manifest());emit({kind:'source-unchanged',unchanged});ok&&=unchanged;}
 if(root&&clean){try{const stat=fs.lstatSync(root);if(path.dirname(root)!==fs.realpathSync(os.tmpdir())||!/^media-server-immutable-ownership\.[A-Za-z0-9]+$/.test(path.basename(root))||!stat.isDirectory()||stat.isSymbolicLink()||stat.uid!==process.getuid()||fs.realpathSync(root)!==root)throw Error('owner');const size=treeBytes(root);fs.rmSync(root,{recursive:true});clean=!fs.existsSync(root);emit({kind:'cleanup',bytes:size,removed:clean});}catch{clean=false;emit({kind:'cleanup',removed:false});}}
 else if(root)emit({kind:'cleanup',removed:false,reason:'group-unconfirmed'});
 ok&&=clean;emit({kind:'result',utc:new Date().toISOString(),mode,matched:ok,productPass:mode==='green'&&ok,elapsedMs:Date.now()-start});fs.closeSync(log);process.exitCode=ok?0:1;
}
