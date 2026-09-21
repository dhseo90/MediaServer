// 파일 용도: 인증 준비 경계 자체검사. 제품 서버·네트워크는 실행하지 않는다.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {createPasswords,curlConfig,childEnvironment,cleanupOwnedRoot,setupRequired} from './recording_auth_preparation.mjs';
const directory=path.dirname(fileURLToPath(import.meta.url));
const clean={PATH:process.env.PATH};
function owned(fn){
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'media-server-auth-unit-'));fs.chmodSync(root,0o700);
  try{return fn(root);}finally{const size=fs.readdirSync(root).reduce((n,f)=>n+fs.lstatSync(path.join(root,f)).size,0);fs.rmSync(root,{recursive:true});assert(!fs.existsSync(root));console.log(`[cleanup] path=${root} bytes=${size} absent=true`);}
}
const workflow=new URL('./verify_auth_workflow.sh',import.meta.url);
test('AUTH-P06 whoami HTTP 상태와 setup JSON 조합을 함께 판정',()=>{
  for(const [body,status,expected] of [[true,200,true],[false,200,false],[false,401,false]])
    assert.equal(setupRequired({setupRequired:body},status),expected);
  for(const [body,status] of [[true,401],[false,500],[false,302],[undefined,200],['false',200],[false,undefined]])
    assert.throws(()=>setupRequired({setupRequired:body},status));
});
function shellFunction(name){
  const text=fs.readFileSync(workflow,'utf8');
  const start=text.indexOf(`${name}() {`);
  assert(start>=0,'검사할 shell 함수 없음');
  const end=text.indexOf('\n}',start);
  assert(end>start,'검사할 shell 함수 끝 없음');
  return text.slice(start,end+2);
}
test('AUTH-P03 json_quote 비밀은 Node argv에 나타나지 않는다',()=>{
  const value=randomBytes(24).toString('hex');
  const script=`${shellFunction('json_quote')}\nnode(){ for arg in "$@"; do if [[ "$arg" == "$PROBE_VALUE" ]]; then printf 'credential-argv-detected\\n' >&2; fi; done; command node "$@"; }\njson_quote "$PROBE_VALUE"`;
  const result=spawnSync('/bin/bash',['-c',script],{env:{PATH:process.env.PATH,PROBE_VALUE:value},encoding:'utf8'});
  assert.equal(result.status,0);
  assert.equal(result.stderr.includes('credential-argv-detected'),false,'비밀 인자가 child argv에 전달됨');
  assert.equal(JSON.parse(result.stdout)===value,true,'JSON 의미 보존');
});
test('AUTH-P01 실행별 5개 CSPRNG 정책·중복 및 재사용 없음',()=>{
  const a=createPasswords(),b=createPasswords();
  assert.equal(a.length,5);assert.equal(new Set([...a,...b]).size,10);
  assert.equal(a.every(v=>v.length>=32&&/[A-Z]/.test(v)&&/[a-z]/.test(v)&&/\d/.test(v)&&/[^a-zA-Z0-9]/.test(v)),true);
});
test('AUTH-P02 xtrace/allexport·inherited 값이 helper 자식에 전달되지 않음',()=>{
  const marker=randomBytes(24).toString('hex');
  const script=`set -xa\nsource "$1/recording_auth_preparation.sh"\nauth_generate_passwords\nnode -e 'process.stdout.write(JSON.stringify({password:Object.keys(process.env).some(x=>/PASSWORD|PROBE|NODE_OPTIONS|PYTHONPATH/.test(x))}))'`;
  const r=spawnSync('/bin/bash',['-c',script,'fixture',directory],{env:{...clean,PROBE_VALUE:marker,MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD:marker,PYTHONPATH:'/untrusted'},encoding:'utf8'});
  assert.equal(r.status,0);assert.equal(r.stderr.includes(marker),false);assert.equal(JSON.parse(r.stdout).password,false);
});
test('AUTH-P03 curl config 내용 보존·argv/환경에는 비밀 없음',()=>owned(root=>{
  const fake=path.join(root,'curl');
  fs.writeFileSync(fake,'#!/usr/bin/env node\nconst fs=require("fs");process.stdout.write(JSON.stringify({args:process.argv.slice(2),input:fs.readFileSync(0,"utf8"),env:process.env}));\n',{mode:0o700});
  const value=randomBytes(24).toString('hex');
  const args=['-sS','-H','Authorization: Bearer '+value,'--data-urlencode','password='+value,'--data','@/owned/file','--data-binary','a\r\nb','http://127.0.0.1:12345/invite?token='+value];
  const r=spawnSync(process.execPath,[path.join(directory,'recording_auth_preparation.mjs'),'curl'],{env:{PATH:root+path.delimiter+process.env.PATH,HTTP_PROXY:'http://invalid',MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD:value},input:args.join('\0')+'\0',encoding:'utf8'});
  assert.equal(r.status,0);const got=JSON.parse(r.stdout);
  assert.deepEqual(got.args,['-q','--config','-']);assert.equal(JSON.stringify(got.args).includes(value),false);
  assert.equal(got.input.includes('password='+value),true);assert.equal(got.input.includes('token='+value),true);
  assert.equal(got.input.includes('data = "@/owned/file"\n'),true);assert.equal(got.input.includes('data-binary = "a\\r\\nb"\n'),true);
  assert.equal(got.env.HTTP_PROXY,undefined);assert.equal(got.env.MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD,undefined);
}));
test('AUTH-P03 URL newline·외부주소·옵션주입 거부와 config escaping',()=>{
  for(const url of ['http://127.0.0.1:123/a\noutput=/bad','http://example.invalid:123/','http://u:p@127.0.0.1:123/'])assert.throws(()=>curlConfig([url]));
  assert.throws(()=>curlConfig(['--config','/outside','http://127.0.0.1:123/']));
  assert.equal(curlConfig(['--data','a"\\\nb','http://127.0.0.1:123/']), 'data = "a\\"\\\\\\nb"\nurl = "http://127.0.0.1:123/"\n');
});
test('AUTH-P04 stdin JSON quote escaping·빈값·개행',()=>{
  for(const value of ['', 'quote"slash\\line\n한글']){
    const r=spawnSync('/bin/bash',['-c',shellFunction('json_quote')+'\njson_quote "$VALUE"'],{env:{...clean,VALUE:value},encoding:'utf8'});
    assert.equal(r.status,0);assert.equal(JSON.parse(r.stdout)===value,true);
  }
});
test('AUTH-P04 Python heredoc sys.argv 의미 보존·OS argv 비노출',()=>{
  const value=randomBytes(24).toString('hex');
  const script=`source "$1/recording_auth_preparation.sh"\npython3 - "$VALUE" <<'PY'\nimport sys\nraise ValueError(sys.argv[1])\nPY`;
  const r=spawnSync('/bin/bash',['-c',script,'fixture',directory],{env:{...clean,VALUE:value},encoding:'utf8',timeout:5000});
  // 의도적 예외도 원문 인자/traceback을 출력하지 않아야 한다.
  assert.equal(r.status,1);assert.equal(r.stderr.includes(value),false);assert.match(r.stderr,/인증 Python oracle/);
  const good=spawnSync('/bin/bash',['-c',`source "$1/recording_auth_preparation.sh"\npython3 - "$VALUE" <<'PY'\nimport sys\nassert len(sys.argv)==2 and len(sys.argv[1])==48\nprint("oracle-ok")\nPY`,'fixture',directory],{env:{...clean,VALUE:value},encoding:'utf8'});
  assert.equal(good.status,0);assert.equal(good.stdout.trim(),'oracle-ok');assert.equal(good.stderr.includes(value),false);
});
test('AUTH-P05 소유 root0700/file0600·불일치 보존·정상 정리',()=>owned(parent=>{
  const root=fs.mkdtempSync(path.join(parent,'media-server-auth-child-'));fs.chmodSync(root,0o700);const f=path.join(root,'payload');fs.writeFileSync(f,'fixture',{mode:0o600});
  const s=fs.statSync(root,{bigint:true});assert.equal(Number(s.mode&0o777n),0o700);assert.equal(fs.statSync(f).mode&0o777,0o600);
  assert.throws(()=>cleanupOwnedRoot(root,'wrong'));assert(fs.existsSync(f));
  cleanupOwnedRoot(root,`${s.dev}:${s.ino}`);assert(!fs.existsSync(root));
}));
test('AUTH-P06 자식 환경의 상속 credential/provider/proxy 제거',()=>{
  assert.deepEqual(childEnvironment({PATH:'/bin',NODE_OPTIONS:'bad',PYTHONPATH:'bad',HTTP_PROXY:'bad',MEDIA_SERVER_VLM_PROVIDER:'bad',MEDIA_SERVER_VERIFY_AUTH_TEST_PASSWORD:'fixture'}),{PATH:'/bin',LANG:'C',LC_ALL:'C'});
});
test('AUTH-P07 기존 세 mode만 dispatch하며 알 수 없는 mode는 root 전에 거부',()=>{
  const r=spawnSync('/bin/bash',[fileURLToPath(workflow),'unsupported'],{env:clean,encoding:'utf8'});
  assert.equal(r.status,2);assert.match(r.stderr,/bootstrap\|users\|routes/);assert.equal(r.stdout,'');
});
test('AUTH-P08 S06 env 부재에도 기존 child 순서·메모리 auth 모드 선택',()=>{
  const text=fs.readFileSync(new URL('./verify_v410_recording_timeline.sh',import.meta.url),'utf8');
  const start=text.indexOf('  "")\n'),end=text.indexOf('\n    ;;',start);
  assert(start>0&&end>start);
  const body=text.slice(start+6,end);
  const r=spawnSync('/bin/bash',['-c','set -eu\nSCRIPT_DIR=/fixture\nbash(){ echo read-model; }; node(){ echo "$2"; };\n'+body],{env:clean,encoding:'utf8'});
  assert.equal(r.status,0);assert.deepEqual(r.stdout.trim().split('\n').slice(0,4),['read-model','--http-api','--http-auth','--http-lifecycle']);
});
test('AUTH-P09 inventory는 새 bootstrap 허용·구형 operator-env 강제 거부',()=>{
  const file=new URL('./verify_script_inventory.mjs',import.meta.url),text=fs.readFileSync(file,'utf8');
  const start=text.indexOf('check("auth verifier has no hardcoded test password defaults"'),end=text.indexOf('\n});',start)+4;
  assert(start>0&&end>start);const source=text.slice(start,end);const rootDir=path.resolve(directory,'../..');
  const context={assert,fs,path,rootDir,check:(_name,fn)=>fn(),readText:p=>fs.readFileSync(p,'utf8')};
  vm.runInNewContext(source,context);
  assert.throws(()=>vm.runInNewContext(source,{...context,readText:p=>p.endsWith('verify_auth_workflow.sh')?'require_auth_secret_env':fs.readFileSync(p,'utf8')}));
});
test('AUTH-P05 실제 cleanup 성공·oracle 실패·중단·종료 실패 전파',()=>owned(parent=>{
  for(const [initial,stop,expected,removed] of [[0,0,0,true],[7,0,7,true],[130,0,130,true],[0,1,1,false]]){
    const root=fs.mkdtempSync(path.join(parent,'media-server-auth-cleanup-'));
    const s=fs.statSync(root,{bigint:true});
    const script=`${shellFunction('cleanup')}\nTMP_DIR="$1"; AUTH_ROOT_ID="$2"; AUTH_PREPARATION_DIR="$3"; SERVER_PID=; AUTH_UDP_PID=\nstop_server(){ return ${stop}; }\ntrap cleanup EXIT\nexit ${initial}`;
    const r=spawnSync('/bin/bash',['-c',script,'fixture',root,`${s.dev}:${s.ino}`,directory],{env:clean,encoding:'utf8',timeout:5000});
    assert.equal(r.status,expected);assert.equal(!fs.existsSync(root),removed);
    if(!removed)assert.match(r.stderr,/소유 root 보존/);
  }
}));
test('AUTH-P05 실제 stop_server는 비정상 exit·HTTP/RTSP 점유를 거부',()=>owned(root=>{
  const fake=path.join(root,'node');
  fs.writeFileSync(fake,'#!/bin/bash\n[[ "$2" == port-closed ]] || exit 2\n[[ "$3" != 12346 ]]\n',{mode:0o700});
  for(const [childExit,base,port,expected] of [[0,'',12345,0],[7,'',12345,1],[0,'http://127.0.0.1:12345',12345,0],[0,'http://127.0.0.1:12346',12345,1],[0,'http://127.0.0.1:12345',12346,1]]){
    const script=`${shellFunction('stop_server')}\n(exit ${childExit}) & SERVER_PID=$!\nowned_pid=$SERVER_PID\nsleep 0.05\nAUTH_PREPARATION_DIR=/fixture; BASE='${base}'; AUTH_RTSP_PORT=${port}\nstop_server; result=$?\nif kill -0 "$owned_pid" 2>/dev/null; then exit 90; fi\necho "owned-pid=$owned_pid absent=true"\nexit "$result"`;
    const r=spawnSync('/bin/bash',['-c',script],{env:{PATH:root+path.delimiter+process.env.PATH},encoding:'utf8',timeout:5000});
    assert.equal(r.status,expected);
    assert.match(r.stdout,/owned-pid=\d+ absent=true/);
  }
}));
test('AUTH-P06 실제 start_server double은 소유 경로·off·비상속 환경을 받는다',()=>owned(root=>{
  fs.mkdirSync(path.join(root,'video'));fs.writeFileSync(path.join(root,'video/sample_h264.mp4'),'local-fixture');
  const server=path.join(root,'server.sh');
  fs.writeFileSync(server,`#!${process.execPath}\nrequire('fs').writeFileSync(process.env.HOME+'/observed.json',JSON.stringify(process.env),{mode:0o600});\n`,{mode:0o700});
  const temporary=path.join(root,'owned');fs.mkdirSync(temporary,{mode:0o700});
  const script=`${shellFunction('start_server')}\nROOT_DIR="$1"; TMP_DIR="$2"; LOG_FILE="$TMP_DIR/server.log"; MODE=bootstrap; AUTH_PREPARATION_DIR=/fixture\nUSERS_FILE="$TMP_DIR/users"; SOURCE_REGISTRY_FILE="$TMP_DIR/sources"; VIEWS_REGISTRY_FILE="$TMP_DIR/views"; ANALYSIS_REGISTRY_FILE="$TMP_DIR/analysis"\nchoose_free_port(){ echo "$1"; }; info(){ :; }; pass(){ :; }; fail(){ exit 9; }; auth_start_ice(){ AUTH_UDP_PORT=12345; }; curl(){ echo '{}'; }; verify_ice_when_ready(){ :; }\nstart_server auto\nwait "$SERVER_PID"`;
  const r=spawnSync('/bin/bash',['-c',script,'fixture',root,temporary],{env:{...clean,HTTP_PROXY:'untrusted',NODE_OPTIONS:'untrusted',MEDIA_SERVER_VLM_PROVIDER:'untrusted',MEDIA_SERVER_AUTH_USERS_FILE:'/operator'},encoding:'utf8',timeout:5000});
  assert.equal(r.status,0);const e=JSON.parse(fs.readFileSync(path.join(temporary,'observed.json'),'utf8'));
  for(const key of ['MEDIA_SERVER_STATE_DIR','MEDIA_SERVER_RECORDING_STORAGE_ROOT','MEDIA_SERVER_FILE_ROOT','MEDIA_SERVER_AUTH_USERS_FILE','MEDIA_SERVER_SOURCE_REGISTRY','MEDIA_SERVER_PUBLISHED_VIEWS','MEDIA_SERVER_ANALYSIS_REGISTRY','MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_PATH'])assert.equal(e[key].startsWith(temporary+'/'),true,key);
  for(const key of ['MEDIA_SERVER_RECORDING_ENABLED','MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_ENABLED','MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED'])assert.equal(e[key],'0');
  for(const key of ['HTTP_PROXY','NODE_OPTIONS','MEDIA_SERVER_VLM_PROVIDER'])assert.equal(e[key],undefined);
  assert.equal(e.MEDIA_SERVER_WEBRTC_STUN_SERVER,'stun://127.0.0.1:12345');assert.equal(e.MEDIA_SERVER_WEBRTC_TURN_SERVER,'');
}));
test('AUTH-P06 setup true 지연·false 실제 config 검사·잘못된 상태 거부',()=>{
  for(const [state,status,config] of [['{"setupRequired":true}\n200',0,false],['{"setupRequired":false}\n200',0,true],['{"setupRequired":false}\n401',0,true],['{}\n200',9,false],['{"setupRequired":"true"}\n200',9,false],['{"setupRequired":false}\n500',9,false],['{"setupRequired":false}',9,false]]){
    const script=`${shellFunction('verify_ice_when_ready')}\nBASE=http://127.0.0.1:12345; AUTH_UDP_PORT=12345; AUTH_PREPARATION_DIR="$1"\ninfo(){ :; }; fail(){ exit 9; }; curl(){ if [[ "$*" == */auth/whoami ]]; then printf '%s' "$STATE"; else echo config-observed >&2; printf '%s' '{"hasStun":true,"hasTurn":false,"peerConnectionConfig":{"iceServers":[{"urls":"stun:127.0.0.1:12345"}]}}'; fi; }\nverify_ice_when_ready`;
    const r=spawnSync('/bin/bash',['-c',script,'fixture',directory],{env:{...clean,STATE:state},encoding:'utf8',timeout:5000});
    assert.equal(r.status,status);assert.equal(r.stderr.includes('config-observed'),config);
  }
});
