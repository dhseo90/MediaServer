#!/usr/bin/env bash
# 파일 용도: 종료 archive 복제 관측용 test adapter만 빌드한다. 제품 서버를 실행하지 않는다.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
RUN_ROOT="${1:?owned root required}"
[[ -d "$RUN_ROOT" && ! -L "$RUN_ROOT" && "$(basename "$RUN_ROOT")" == media-server-current-integration-* ]] || exit 2
source "$SCRIPT_DIR/env_common.sh"
export MEDIA_SERVER_GST_CACHE_DIR="$RUN_ROOT/gst-cache"
media_server_apply_homebrew_gst_env
BUILD_DIR="$ROOT_DIR/build-gst-onnx"
node -e 'const f=require("fs"),p=require("path"),root=process.argv[1],build=process.argv[2],archive=f.statSync(p.join(build,"libmedia_server_runtime.a")).mtimeMs,exe=f.statSync(p.join(build,"media_server")).mtimeMs,link=f.readFileSync(p.join(build,"CMakeFiles/media_server.dir/link.txt"),"utf8"),app=new Set([...link.matchAll(/CMakeFiles\/media_server\.dir\/(src\/[^ ]+)\.o/g)].map(m=>m[1]));function check(dir){for(const name of f.readdirSync(dir)){const full=p.join(dir,name),s=f.statSync(full);if(s.isDirectory())check(full);else if(/\.(h|hpp|cpp)$/.test(name)&&s.mtimeMs>(app.has(p.relative(root,full))?exe:archive))throw Error("stale-product-build")}}check(p.join(root,"include"));check(p.join(root,"src"))' "$ROOT_DIR" "$BUILD_DIR"
read -r -a ORIGINAL_LINK < "$BUILD_DIR/CMakeFiles/media_server.dir/link.txt"
LINK_LIBS=();found=0
for token in "${ORIGINAL_LINK[@]}";do
 if [[ "$token" == libmedia_server_runtime.a ]];then found=1;LINK_LIBS+=("$BUILD_DIR/$token");continue;fi
 if ((found));then LINK_LIBS+=("$token");fi
done
test "$found" = 1
read -r -a FLAGS <<<"$(pkg-config --cflags gstreamer-app-1.0 openssl sqlite3)"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$ROOT_DIR/include" "${FLAGS[@]}" \
 -DMEDIA_SERVER_USE_GSTREAMER=1 -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_USE_SQLITE3=1 -DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND=1 \
 "$SCRIPT_DIR/recording_current_archive_probe.cpp" "${LINK_LIBS[@]}" -o "$RUN_ROOT/archive-probe"
