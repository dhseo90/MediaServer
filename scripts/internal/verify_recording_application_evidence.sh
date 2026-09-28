#!/usr/bin/env bash
# 파일 용도: application evidence 실제 adapter를 runtime archive와 동일 ABI로 검사한다.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
RUN_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/media-server-application-evidence.XXXXXX")"
RUN_ROOT="$(cd "$RUN_ROOT" && pwd -P)"
cleanup(){ local original=$?; trap - EXIT; node -e 'const f=require("fs"),p=require("path"),r=process.argv[1];function size(x){const s=f.lstatSync(x);return s.isDirectory()?f.readdirSync(x).reduce((n,v)=>n+size(p.join(x,v)),0):s.size}const bytes=size(r);if(!p.basename(r).startsWith("media-server-application-evidence.")||f.lstatSync(r).isSymbolicLink())throw Error("ownership");f.rmSync(r,{recursive:true});console.log(`[cleanup] path=${r} bytes=${bytes} absent=${!f.existsSync(r)}`);if(f.existsSync(r))process.exit(1)' "$RUN_ROOT" || original=1; exit "$original"; }
trap cleanup EXIT
source "$SCRIPT_DIR/env_common.sh"
export MEDIA_SERVER_GST_CACHE_DIR="$RUN_ROOT/gst-cache"
media_server_apply_homebrew_gst_env
BUILD_DIR="$ROOT_DIR/build-gst-onnx"
node -e 'const f=require("fs"),p=require("path"),r=process.argv[1],b=process.argv[2],a=f.statSync(p.join(b,"libmedia_server_runtime.a")).mtimeMs,e=f.statSync(p.join(b,"media_server")).mtimeMs,l=f.readFileSync(p.join(b,"CMakeFiles/media_server.dir/link.txt"),"utf8"),app=new Set([...l.matchAll(/CMakeFiles\/media_server\.dir\/(src\/[^ ]+)\.o/g)].map(m=>m[1]));function walk(d){for(const n of f.readdirSync(d)){const x=p.join(d,n),s=f.statSync(x);if(s.isDirectory())walk(x);else if(/\.(h|hpp|cpp)$/.test(n)&&s.mtimeMs>(app.has(p.relative(r,x))?e:a))throw Error("stale-product-build")}}walk(p.join(r,"include"));walk(p.join(r,"src"))' "$ROOT_DIR" "$BUILD_DIR"
read -r -a ORIGINAL_LINK < "$BUILD_DIR/CMakeFiles/media_server.dir/link.txt"
LINK_LIBS=();found=0
for token in "${ORIGINAL_LINK[@]}";do
 if [[ "$token" == libmedia_server_runtime.a ]];then found=1;LINK_LIBS+=("$BUILD_DIR/$token");continue;fi
 if ((found));then LINK_LIBS+=("$token");fi
done
test "$found" = 1
read -r -a FLAGS <<<"$(pkg-config --cflags gstreamer-app-1.0 openssl sqlite3)"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$ROOT_DIR/include" -I"$ROOT_DIR/src/ingress" "${FLAGS[@]}" \
 -DMEDIA_SERVER_USE_GSTREAMER=1 -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_USE_SQLITE3=1 \
 "$SCRIPT_DIR/recording_application_evidence_smoke.cpp" "${LINK_LIBS[@]}" -o "$RUN_ROOT/check"
MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_ENABLED=0 MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_HOOK_ENABLED=0 MEDIA_SERVER_ANALYSIS_EVENT_CLIP_HOOK_ENABLED=0 MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED=0 "$RUN_ROOT/check"
