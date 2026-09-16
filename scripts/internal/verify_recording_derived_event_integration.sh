#!/usr/bin/env bash
# 파일 용도: 실제 H264 이벤트와 opt-in 파생 worker의 격리 통합을 검사한다.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$SCRIPT_DIR/env_common.sh"
MODE="${1:-}"
[[ $# -le 1 && ( -z "$MODE" || "$MODE" == --diagnostics-only || "$MODE" == --diagnostics-no-crypto ) ]] || exit 2
BUILD_DIR="$ROOT_DIR/build-gst-onnx"
# 공유 ABI가 다른 object/archive를 섞지 않는다. 제품 변경 뒤 ./server.sh build가 선수조건이다.
node -e 'const f=require("fs"),p=require("path"),root=process.argv[1],build=process.argv[2],archive=f.statSync(p.join(build,"libmedia_server_runtime.a")).mtimeMs,executable=f.statSync(p.join(build,"media_server")).mtimeMs,link=f.readFileSync(p.join(build,"CMakeFiles/media_server.dir/link.txt"),"utf8"),app=new Set([...link.matchAll(/CMakeFiles\/media_server\.dir\/(src\/[^ ]+)\.o/g)].map(m=>m[1]));function check(dir){for(const name of f.readdirSync(dir)){const full=p.join(dir,name),s=f.statSync(full);if(s.isDirectory())check(full);else if(/\.(h|hpp|cpp)$/.test(name)&&s.mtimeMs>(app.has(p.relative(root,full))?executable:archive))throw Error("제품 build가 오래됨: ./server.sh build 선수조건; "+full)}}check(p.join(root,"include"));check(p.join(root,"src"))' "$ROOT_DIR" "$BUILD_DIR"
RUN_DIR="$(mktemp -d "${TMPDIR:-/tmp}/media-server-derived-event-integration.XXXXXX")"
RUN_DIR="$(cd "$RUN_DIR" && pwd -P)"
SECONDS=0
cleanup() {
 node -e 'const f=require("fs"),p=require("path"),r=process.argv[1];function size(x){const s=f.lstatSync(x);return s.isDirectory()?f.readdirSync(x).reduce((n,k)=>n+size(p.join(x,k)),0):s.size}if(!p.basename(r).startsWith("media-server-derived-event-integration.")||f.lstatSync(r).isSymbolicLink()||p.dirname(f.realpathSync(r))!==f.realpathSync(process.argv[2]))throw Error("cleanup containment");const bytes=size(r);f.rmSync(r,{recursive:true});console.log(`[cleanup] path=${r} bytes=${bytes} removed=${!f.existsSync(r)}`);if(f.existsSync(r))process.exit(1)' "$RUN_DIR" "${TMPDIR:-/tmp}"
 echo "[elapsed] seconds=$SECONDS source=bash-SECONDS"
}
trap cleanup EXIT
export MEDIA_SERVER_GST_CACHE_DIR="$RUN_DIR/gst-cache" MEDIA_SERVER_GST_PLUGIN_PROFILE=headless
unset GST_REGISTRY GST_REGISTRY_1_0 MEDIA_SERVER_GST_MANAGED_REGISTRY
media_server_apply_homebrew_gst_env
read -r -a ORIGINAL_LINK < "$BUILD_DIR/CMakeFiles/media_server.dir/link.txt"
LINK_LIBS=();found=0
for token in "${ORIGINAL_LINK[@]}";do
 if [[ "$token" == libmedia_server_runtime.a ]];then found=1;LINK_LIBS+=("$BUILD_DIR/$token");continue;fi
 if ((found));then LINK_LIBS+=("$token");fi
done
test "$found" = 1
read -r -a FLAGS <<<"$(pkg-config --cflags gstreamer-app-1.0 openssl sqlite3)"
CRYPTO=1;EXTRA_SOURCES=()
if [[ "$MODE" == --diagnostics-no-crypto ]];then
 CRYPTO=0
 EXTRA_SOURCES+=("$ROOT_DIR/src/recording/recording_derived_event_worker.cpp")
fi
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$ROOT_DIR/include" "${FLAGS[@]}" \
 -DMEDIA_SERVER_USE_GSTREAMER=1 -DMEDIA_SERVER_USE_OPENSSL="$CRYPTO" -DMEDIA_SERVER_USE_SQLITE3=1 \
 "$SCRIPT_DIR/recording_derived_event_integration_smoke.cpp" \
 ${EXTRA_SOURCES[@]+"${EXTRA_SOURCES[@]}"} \
 "${LINK_LIBS[@]}" -o "$RUN_DIR/check"
if [[ "$MODE" == --diagnostics-only ]];then "$RUN_DIR/check" "$RUN_DIR" diagnostics;exit $?;fi
if [[ "$MODE" == --diagnostics-no-crypto ]];then "$RUN_DIR/check" "$RUN_DIR" diagnostics-no-crypto;exit $?;fi
"$RUN_DIR/check" "$RUN_DIR"
"$RUN_DIR/check" "$RUN_DIR" hooks-managed
"$RUN_DIR/check" "$RUN_DIR" hooks-legacy
set +e
"$RUN_DIR/check" "$RUN_DIR" ready-child
child_exit=$?
set -e
echo "[process] ReadyDurable child exit=$child_exit expected=23"
test "$child_exit" = 23
"$RUN_DIR/check" "$RUN_DIR" ready-parent
"$RUN_DIR/check" "$RUN_DIR" cancel
"$RUN_DIR/check" "$RUN_DIR" caps
