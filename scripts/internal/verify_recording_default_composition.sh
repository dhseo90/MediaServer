#!/usr/bin/env bash
# 파일 용도: 기본 녹화 구성의 관리 identity·실제 생산·복구·증거 수명을 격리 검증한다.
set -euo pipefail
MODE="${1:-all}"
[[ "$MODE" == all || "$MODE" == --recovery-only ]] || { echo "usage: $0 [--recovery-only]" >&2; exit 2; }
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$SCRIPT_DIR/env_common.sh"
media_server_apply_homebrew_gst_env
BUILD_DIR="$ROOT_DIR/build-gst-onnx"
# 공유 ABI가 다른 object/archive를 섞지 않는다. 제품 변경 뒤 ./server.sh build가 선수조건이다.
node -e 'const f=require("fs"),p=require("path"),root=process.argv[1],build=process.argv[2],archive=f.statSync(p.join(build,"libmedia_server_runtime.a")).mtimeMs,executable=f.statSync(p.join(build,"media_server")).mtimeMs,link=f.readFileSync(p.join(build,"CMakeFiles/media_server.dir/link.txt"),"utf8"),app=new Set([...link.matchAll(/CMakeFiles\/media_server\.dir\/(src\/[^ ]+)\.o/g)].map(m=>m[1]));function check(dir){for(const name of f.readdirSync(dir)){const full=p.join(dir,name),s=f.statSync(full);if(s.isDirectory())check(full);else if(/\.(h|hpp|cpp)$/.test(name)&&s.mtimeMs>(app.has(p.relative(root,full))?executable:archive))throw Error("제품 build가 오래됨: ./server.sh build 선수조건; "+full)}}check(p.join(root,"include"));check(p.join(root,"src"))' "$ROOT_DIR" "$BUILD_DIR"
RUN_DIR="$(mktemp -d "${TMPDIR:-/tmp}/media-server-default-composition.XXXXXX")"
RUN_DIR="$(cd "$RUN_DIR" && pwd -P)"
SECONDS=0
cleanup() {
 node -e 'const f=require("fs"),p=require("path"),r=process.argv[1];function size(x){const s=f.lstatSync(x);return s.isDirectory()?f.readdirSync(x).reduce((n,k)=>n+size(p.join(x,k)),0):s.size}if(!p.basename(r).startsWith("media-server-default-composition.")||f.lstatSync(r).isSymbolicLink()||p.dirname(f.realpathSync(r))!==f.realpathSync(process.argv[2]))throw Error("cleanup containment");const bytes=size(r);f.rmSync(r,{recursive:true});console.log(`[cleanup] path=${r} bytes=${bytes} removed=${!f.existsSync(r)}`);if(f.existsSync(r))process.exit(1)' "$RUN_DIR" "${TMPDIR:-/tmp}"
 echo "[elapsed] seconds=$SECONDS source=bash-SECONDS"
}
trap cleanup EXIT
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
 "$SCRIPT_DIR/recording_default_composition_smoke.cpp" \
 "${LINK_LIBS[@]}" -o "$RUN_DIR/check"
if [[ "$MODE" == all ]];then
"$RUN_DIR/check" "$RUN_DIR"
MEDIA_SERVER_FILE_ROOT="$RUN_DIR/source-runtime/input" MEDIA_SERVER_DEFAULT_FILE="$RUN_DIR/source-runtime/input/identity.mp4" \
MEDIA_SERVER_STATE_DIR="$RUN_DIR/source-runtime/state" MEDIA_SERVER_SOURCE_REGISTRY="$RUN_DIR/source-runtime/state/sources.json" \
MEDIA_SERVER_PUBLISHED_VIEWS="$RUN_DIR/source-runtime/state/views.json" MEDIA_SERVER_ANALYSIS_REGISTRY="$RUN_DIR/source-runtime/state/analysis.json" \
MEDIA_SERVER_IDLE_GRACE_MS=0 MEDIA_SERVER_AUTH_MODE=off MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_ENABLED=0 \
MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_HOOK_ENABLED=0 MEDIA_SERVER_ANALYSIS_EVENT_CLIP_HOOK_ENABLED=0 \
MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED=0 "$RUN_DIR/check" "$RUN_DIR" source-runtime
MEDIA_SERVER_ANALYSIS_EVENT_STORAGE_ENABLED=0 MEDIA_SERVER_ANALYSIS_EVENT_SNAPSHOT_HOOK_ENABLED=0 \
MEDIA_SERVER_ANALYSIS_EVENT_CLIP_HOOK_ENABLED=0 MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED=0 \
MEDIA_SERVER_ANALYSIS_EVENT_PRE_EVENT_MS=5000 MEDIA_SERVER_ANALYSIS_EVENT_POST_EVENT_MS=5000 \
"$RUN_DIR/check" "$RUN_DIR" default-budget
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$ROOT_DIR/include" -DMEDIA_SERVER_USE_OPENSSL=0 \
 "$SCRIPT_DIR/recording_auto_identity_crypto_off_smoke.cpp" "$ROOT_DIR/src/recording/recording_journal.cpp" \
 "$ROOT_DIR/src/recording/recording_contracts.cpp" "$ROOT_DIR/src/domain/strict_json.cpp" -lz -o "$RUN_DIR/crypto-off"
"$RUN_DIR/crypto-off" "$RUN_DIR/crypto-off-store"
"$RUN_DIR/check" "$RUN_DIR" provider-locks
fi
for mode in committed blocked;do
 set +e
 "$RUN_DIR/check" "$RUN_DIR" "recovery-$mode-child"
 child_exit=$?
 set -e
 echo "[process] $mode child exit=$child_exit expected=23"
 test "$child_exit" = 23
 "$RUN_DIR/check" "$RUN_DIR" "recovery-$mode-parent"
done
"$RUN_DIR/check" "$RUN_DIR" recovery-intent
