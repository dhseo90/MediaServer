#!/usr/bin/env bash
# 파일 용도: 실제 파생 job 서비스의 격리 파일·원장 lifecycle을 검사한다.
set -euo pipefail
DIAGNOSTIC=0
if [[ "${1:-}" == --diagnostic-evidence && "$#" == 1 ]]; then DIAGNOSTIC=1
elif [[ "$#" != 0 ]]; then exit 2; fi
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$SCRIPT_DIR/env_common.sh"
BUILD_DIR="$ROOT_DIR/build-gst-onnx"
# 공유 ABI가 다른 object/archive를 섞지 않는다. 제품 변경 뒤 ./server.sh build가 선수조건이다.
node -e 'const f=require("fs"),p=require("path"),root=process.argv[1],archive=process.argv[2],stamp=f.statSync(archive).mtimeMs;function check(dir){for(const name of f.readdirSync(dir)){const full=p.join(dir,name),s=f.statSync(full);if(s.isDirectory())check(full);else if(/\.(h|hpp|cpp)$/.test(name)&&s.mtimeMs>stamp)throw Error("제품 archive가 오래됨: ./server.sh build 선수조건; "+full)}}check(p.join(root,"include"));check(p.join(root,"src"))' "$ROOT_DIR" "$BUILD_DIR/libmedia_server_runtime.a"
RUN_DIR="$(mktemp -d "${TMPDIR:-/tmp}/media-server-checkpoint-reproduction.XXXXXX")"
RUN_DIR="$(cd "$RUN_DIR" && pwd -P)"
SECONDS=0
cleanup() {
 node -e 'const f=require("fs"),p=require("path"),r=process.argv[1];function size(x){const s=f.lstatSync(x);return s.isDirectory()?f.readdirSync(x).reduce((n,k)=>n+size(p.join(x,k)),0):s.size}if(!p.basename(r).startsWith("media-server-checkpoint-reproduction.")||f.lstatSync(r).isSymbolicLink()||p.dirname(f.realpathSync(r))!==f.realpathSync(process.argv[2]))throw Error("cleanup containment");const bytes=size(r);f.rmSync(r,{recursive:true});console.log(`[cleanup] path=${r} bytes=${bytes} removed=${!f.existsSync(r)}`);if(f.existsSync(r))process.exit(1)' "$RUN_DIR" "${TMPDIR:-/tmp}"
 echo "[elapsed] seconds=$SECONDS source=bash-SECONDS"
}
trap cleanup EXIT
mkdir -p "$RUN_DIR/gst-cache" "$RUN_DIR/tmp" "$RUN_DIR/home"
chmod 700 "$RUN_DIR/gst-cache" "$RUN_DIR/tmp" "$RUN_DIR/home"
export MEDIA_SERVER_GST_CACHE_DIR="$RUN_DIR/gst-cache"
export GST_REGISTRY="$RUN_DIR/gst-cache/registry.bin"
export GST_REGISTRY_1_0="$RUN_DIR/gst-cache/registry.bin"
media_server_apply_homebrew_gst_env
read -r -a ORIGINAL_LINK < "$BUILD_DIR/CMakeFiles/media_server.dir/link.txt"
LINK_LIBS=();found=0
for token in "${ORIGINAL_LINK[@]}";do
 if [[ "$token" == libmedia_server_runtime.a ]];then found=1;LINK_LIBS+=("$BUILD_DIR/$token");continue;fi
 if ((found));then LINK_LIBS+=("$token");fi
done
test "$found" = 1
read -r -a FLAGS <<<"$(pkg-config --cflags gstreamer-app-1.0 openssl sqlite3)"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$ROOT_DIR/include" "${FLAGS[@]}" \
 -DMEDIA_SERVER_USE_GSTREAMER=1 -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_USE_SQLITE3=1 \
 "$SCRIPT_DIR/recording_checkpoint_reproduction_smoke.cpp" \
 "${LINK_LIBS[@]}" -o "$RUN_DIR/check"
node - "$RUN_DIR" "$DIAGNOSTIC" <<'NODE'
const fs=require('fs'),path=require('path'),{spawn}=require('child_process');
const root=process.argv[2],diagnostic=process.argv[3]==='1';let count=0,limit=false;
for(const name of ['home','tmp','gst-cache'])fs.mkdirSync(path.join(root,name),{mode:0o700,recursive:true});
const child=spawn(path.join(root,'check'),[root],{env:{...process.env,HOME:path.join(root,'home'),TMPDIR:path.join(root,'tmp'),GST_REGISTRY:path.join(root,'gst-cache/registry.bin'),GST_REGISTRY_1_0:path.join(root,'gst-cache/registry.bin'),MEDIA_SERVER_CHECKPOINT_DIAGNOSTIC:diagnostic?'1':'0'},stdio:['ignore','pipe','pipe']});
function size(p){const s=fs.lstatSync(p);return s.isDirectory()?fs.readdirSync(p).reduce((n,k)=>n+size(path.join(p,k)),0):s.size;}
let outputBytes=0,force;
function stop(){limit=true;if(child.exitCode===null&&child.signalCode===null)child.kill('SIGTERM');if(!force)force=setTimeout(()=>{if(child.exitCode===null&&child.signalCode===null)child.kill('SIGKILL');},2000);}
for(const stream of [child.stdout,child.stderr]){let buffered='';stream.setEncoding('utf8');stream.on('data',x=>{outputBytes+=Buffer.byteLength(x);if(outputBytes>4*1024*1024){stop();return;}process.stdout.write(x);buffered+=x;let i;while((i=buffered.indexOf('\n'))>=0){const line=buffered.slice(0,i);buffered=buffered.slice(i+1);if(line==='[checkpoint-committed] count=1')count++;}});}
const cap=setInterval(()=>{try{if(size(root)>128*1024*1024)stop();}catch{stop();}},200);
const timeout=setTimeout(stop,60000);
child.on('error',()=>{limit=true;});
child.on('close',(code,signal)=>{clearInterval(cap);clearTimeout(timeout);clearTimeout(force);console.log('[bounded] '+JSON.stringify({pid:child.pid,code,signal,limit,outputBytes,diagnostic,automaticCheckpoints:diagnostic?count:null}));process.exitCode=code===0&&!limit&&(!diagnostic||count>0)?0:1;});
NODE
