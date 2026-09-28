#!/usr/bin/env bash
# 파일 용도: 실제 파생 job 서비스의 격리 파일·원장 lifecycle을 검사한다.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$SCRIPT_DIR/env_common.sh"
BUILD_DIR="$ROOT_DIR/build-gst-onnx"
# 공유 ABI가 다른 object/archive를 섞지 않는다. 제품 변경 뒤 ./server.sh build가 선수조건이다.
node -e 'const f=require("fs"),p=require("path"),root=process.argv[1],archive=process.argv[2],stamp=f.statSync(archive).mtimeMs;function check(dir){for(const name of f.readdirSync(dir)){const full=p.join(dir,name),s=f.statSync(full);if(s.isDirectory())check(full);else if(/\.(h|hpp|cpp)$/.test(name)&&s.mtimeMs>stamp)throw Error("제품 archive가 오래됨: ./server.sh build 선수조건; "+full)}}check(p.join(root,"include"));check(p.join(root,"src"))' "$ROOT_DIR" "$BUILD_DIR/libmedia_server_runtime.a"
RUN_DIR="$(mktemp -d "${TMPDIR:-/tmp}/media-server-native-derived.XXXXXX")"
RUN_DIR="$(cd "$RUN_DIR" && pwd -P)"
SECONDS=0
cleanup() {
 node -e 'const f=require("fs"),p=require("path"),r=process.argv[1];function size(x){const s=f.lstatSync(x);return s.isDirectory()?f.readdirSync(x).reduce((n,k)=>n+size(p.join(x,k)),0):s.size}if(!p.basename(r).startsWith("media-server-native-derived.")||f.lstatSync(r).isSymbolicLink()||p.dirname(f.realpathSync(r))!==f.realpathSync(process.argv[2]))throw Error("cleanup containment");const bytes=size(r);f.rmSync(r,{recursive:true});console.log(`[cleanup] path=${r} bytes=${bytes} removed=${!f.existsSync(r)}`);if(f.existsSync(r))process.exit(1)' "$RUN_DIR" "${TMPDIR:-/tmp}"
 echo "[elapsed] seconds=$SECONDS source=bash-SECONDS"
}
trap cleanup EXIT
export GST_REGISTRY="$RUN_DIR/registry.bin"
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
 "$SCRIPT_DIR/recording_native_derived_smoke.cpp" \
 "${LINK_LIBS[@]}" -o "$RUN_DIR/check"
"$RUN_DIR/check" "$RUN_DIR" "$@"
