// 파일 용도: 인증 검증 전용: 비밀은 stdin으로만 전달하며 자식 환경을 제한한다.
import fs from 'node:fs';
import {randomBytes} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import net from 'node:net';
import dgram from 'node:dgram';
import {assertLocalIceConfig} from './verify_local_ice_guard.mjs';

export function createPasswords(){
  const values=new Set();
  while(values.size<5)values.add('Aa1!'+randomBytes(24).toString('base64url'));
  return [...values];
}
export function setupRequired(config,status){
  if(typeof config?.setupRequired!=='boolean')throw Error('setup-state');
  if(status!==200 && !(status===401 && config.setupRequired===false))throw Error('setup-http-status');
  return config.setupRequired;
}
export function childEnvironment(env=process.env){
  const clean={PATH:env.PATH||'/usr/bin:/bin',LANG:'C',LC_ALL:'C'};
  return clean;
}
export function cleanupOwnedRoot(root,identity){
  const stat=fs.lstatSync(root,{bigint:true});
  if(!stat.isDirectory()||stat.isSymbolicLink()||`${stat.dev}:${stat.ino}`!==identity||!path.basename(root).startsWith('media-server-auth-'))throw Error('root-ownership');
  fs.rmSync(root,{recursive:true});
  if(fs.existsSync(root))throw Error('root-cleanup');
}
function quoted(value){
  if(value.includes('\0'))throw Error('invalid-value');
  return '"'+value.replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\r/g,'\\r').replace(/\n/g,'\\n').replace(/\t/g,'\\t').replace(/\v/g,'\\v')+'"';
}
export function curlConfig(args){
  const short={f:'fail',s:'silent',S:'show-error',I:'head'};
  const valueOptions={'-o':'output','-D':'dump-header','-w':'write-out','-X':'request','-H':'header','-b':'cookie','-c':'cookie-jar','-d':'data',
    '--data':'data','--data-binary':'data-binary','--data-urlencode':'data-urlencode'};
  const lines=[];let urls=0;
  for(let i=0;i<args.length;i++){
    const arg=args[i];
    if(Object.hasOwn(valueOptions,arg)){
      if(++i>=args.length)throw Error('missing-option-value');
      lines.push(valueOptions[arg]+' = '+quoted(args[i]));
    }else if(/^-[fsSI]+$/.test(arg)){
      for(const flag of arg.slice(1))lines.push(short[flag]);
    }else if(arg.startsWith('-'))throw Error('unsupported-curl-option');
    else {
      if(/[\r\n\0]/.test(arg))throw Error('invalid-url');
      const url=new URL(arg);
      if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||!url.port||url.username||url.password)throw Error('nonlocal-url');
      lines.push('url = '+quoted(arg));urls++;
    }
  }
  if(urls!==1)throw Error('url-count');
  return lines.join('\n')+'\n';
}
export function readArguments(buffer){
  if(buffer.length>16*1024*1024||buffer.at(-1)!==0)throw Error('argument-framing');
  return buffer.toString('utf8').slice(0,-1).split('\0');
}
export function runCurl(args){
  const result=spawnSync('curl',['-q','--config','-'],{input:curlConfig(args),env:childEnvironment(),maxBuffer:32*1024*1024});
  if(result.error||result.signal||result.status!==0){
    // curl 오류는 요청 URL/token을 포함할 수 있으므로 원문을 내보내지 않는다.
    process.stderr.write('[fail] 인증 HTTP transport 실패\n');return 1;
  }
  process.stdout.write(result.stdout);return 0;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
  try{
    const mode=process.argv[2];
    if(mode==='passwords')process.stdout.write(createPasswords().join('\n')+'\n');
    else if(mode==='setup-required'){
      const response=fs.readFileSync(0,'utf8'),split=response.lastIndexOf('\n');
      if(split<0||!/^\d{3}$/.test(response.slice(split+1)))throw Error('setup-http-framing');
      process.stdout.write(String(setupRequired(JSON.parse(response.slice(0,split)),Number(response.slice(split+1)))));
    }
    else if(mode==='curl')process.exitCode=runCurl(readArguments(fs.readFileSync(0)));
    else if(mode==='root-id'){const s=fs.lstatSync(process.argv[3],{bigint:true});if(!s.isDirectory()||s.isSymbolicLink())throw Error('root');process.stdout.write(`${s.dev}:${s.ino}`);}
    else if(mode==='cleanup')cleanupOwnedRoot(process.argv[3],process.argv[4]);
    else if(mode==='port-closed'){
      const port=Number(process.argv[3]);if(!Number.isInteger(port)||port<1||port>65535)throw Error('port');
      await new Promise((resolve,reject)=>{const socket=net.connect(port,'127.0.0.1');socket.setTimeout(1000);socket.once('connect',()=>{socket.destroy();reject(Error('port-open'));});socket.once('timeout',()=>{socket.destroy();reject(Error('port-unknown'));});socket.once('error',e=>e.code==='ECONNREFUSED'?resolve():reject(Error('port-unknown')));});
    }else if(mode==='ice-config')assertLocalIceConfig(JSON.parse(fs.readFileSync(0,'utf8')),Number(process.argv[3]));
    else if(mode==='owned-udp'){
      const socket=dgram.createSocket('udp4');
      socket.once('error',()=>{process.stderr.write('[fail] 인증 UDP 준비 실패\n');process.exitCode=1;socket.close();});
      socket.bind(0,'127.0.0.1',()=>{try{fs.writeFileSync(process.argv[3],String(socket.address().port),{flag:'wx',mode:0o600});}catch{socket.close();process.exitCode=1;}});
      process.once('SIGTERM',()=>socket.close());
      process.once('SIGINT',()=>socket.close());
    }
    else throw Error('unknown-mode');
  }catch{process.stderr.write('[fail] 인증 준비 입력/실행 오류\n');process.exitCode=1;}
}
