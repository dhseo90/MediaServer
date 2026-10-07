// 파일 용도: 기존 HTTP fixture의 두 seed 호출과 실패 정보를 부모 run에 정제 보존한다.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import assert from 'node:assert/strict';

const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function listing(root){
  const files=[],pending=[''];let truncated=false;
  while(pending.length&&files.length<128){
    const rel=pending.shift(),dir=path.join(root,rel);
    if(!fs.existsSync(dir))continue;
    for(const name of fs.readdirSync(dir).sort()){
      if(files.length===128){truncated=true;break;}
      const child=path.join(rel,name),s=fs.lstatSync(path.join(root,child));
      files.push({path:child,kind:s.isSymbolicLink()?'symlink':s.isDirectory()?'directory':'file',bytes:s.size});
      if(s.isDirectory()&&child.split(path.sep).length<8)pending.push(child);
    }
  }
  return {files,truncated:truncated||pending.length>0};
}
export function runReviewSeed({fixture,root,mode,repo,artifacts},launch=spawnSync){
  assert(['--seed','--confirmed-seed'].includes(mode),'unsupported seed mode');
  const label=mode.slice(2),args=[root,mode,'unused'];
  const clean=text=>text.replaceAll(root,'[owned-root]').replaceAll(repo,'[repo]')
    .replace(/(?:https?|rtsp|rtsps|stun|turn):\/\/\S+/g,'[url]')
    .replace(/\$argon2\S+/g,'[password-hash]').replace(/\/Users\/[^\s"']+/g,'[user-path]');
  const archive=path.join(repo,'build-gst-onnx/libmedia_server_runtime.a');
  const environment=Object.fromEntries(['GST_PLUGIN_PATH','GST_PLUGIN_SYSTEM_PATH','GST_PLUGIN_SCANNER','GST_REGISTRY',
    'GST_PLUGIN_PATH_1_0','GST_PLUGIN_SYSTEM_PATH_1_0','GST_PLUGIN_SCANNER_1_0','GST_REGISTRY_1_0',
    'MEDIA_SERVER_GST_CACHE_DIR','MEDIA_SERVER_GST_PLUGIN_PROFILE','DYLD_LIBRARY_PATH','LD_LIBRARY_PATH','LANG','LC_ALL']
    .filter(k=>process.env[k]!==undefined).map(k=>[k,clean(process.env[k])]));
  const record={mode,command:[fixture,...args],cwd:repo,uid:process.getuid(),fixtureSha256:sha(fs.readFileSync(fixture)),
    runtimeArchiveSha256:sha(fs.readFileSync(archive)),environment,initial:listing(root),startedAt:new Date().toISOString(),timeoutMs:10000};
  const started=performance.now();let result;
  try{result=launch(fixture,args,{cwd:repo,encoding:'buffer',timeout:10000,maxBuffer:1024*1024});}
  catch(error){result={status:null,signal:null,error};}
  record.elapsedMs=performance.now()-started;record.exitCode=result.status??null;record.signal=result.signal??null;
  record.spawnError=result.error?{code:result.error.code??null,message:clean(result.error.message)}:null;
  for(const name of ['stdout','stderr']){
    const raw=Buffer.from(result[name]||'');const bytes=Buffer.from(clean(raw.toString('utf8')));
    record[name]={...artifacts.write(label+'.'+name,bytes),originalBytes:raw.length,originalSha256:sha(raw),byteIdentical:raw.equals(bytes)};
  }
  record.final=listing(root);artifacts.write(label+'.json',JSON.stringify(record,null,2)+'\n');
  assert(record.exitCode===0&&record.signal===null&&record.spawnError===null,label+' preparation failed; see '+label+'.json');
  return record;
}
