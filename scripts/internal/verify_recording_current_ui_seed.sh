#!/usr/bin/env bash
# 파일 용도: current managed UI seed의 단기 준비/자체검사. 실제 브라우저는 실행하지 않는다.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
BUILD_DIR="$ROOT_DIR/build-gst-onnx"
node -e 'const f=require("fs"),p=require("path"),r=process.argv[1],b=process.argv[2],a=f.statSync(p.join(b,"libmedia_server_runtime.a")).mtimeMs,e=f.statSync(p.join(b,"media_server")).mtimeMs,l=f.readFileSync(p.join(b,"CMakeFiles/media_server.dir/link.txt"),"utf8"),app=new Set([...l.matchAll(/CMakeFiles\/media_server\.dir\/(src\/[^ ]+)\.o/g)].map(m=>m[1]));function check(d){for(const n of f.readdirSync(d)){const q=p.join(d,n),s=f.statSync(q);if(s.isDirectory())check(q);else if(/\.(h|hpp|cpp)$/.test(n)&&s.mtimeMs>(app.has(p.relative(r,q))?e:a))throw Error("제품 build 선수조건")}}check(p.join(r,"include"));check(p.join(r,"src"))' "$ROOT_DIR" "$BUILD_DIR"
RUN_DIR="$(mktemp -d "${TMPDIR:-/tmp}/media-server-current-ui-seed.XXXXXX")"
RUN_DIR="$(cd "$RUN_DIR" && pwd -P)"
chmod 700 "$RUN_DIR"
RUN_IDENTITY="$(node -e 'const s=require("fs").lstatSync(process.argv[1]);console.log(`${s.dev}:${s.ino}:${s.uid}`)' "$RUN_DIR")"
SECONDS=0
echo "[start] $(date -u +%Y-%m-%dT%H:%M:%SZ)"
uname -sm
"${CXX:-c++}" --version | head -1
shasum -a 256 "$SCRIPT_DIR/recording_current_ui_seed.cpp" "$SCRIPT_DIR/recording_current_ui_seed.mjs" "$SCRIPT_DIR/recording_media_test_fixture.h" "$SCRIPT_DIR/verify_recording_current_ui_seed.sh" "$BUILD_DIR/libmedia_server_runtime.a"
cleanup(){
 node -e 'const f=require("fs"),p=require("path"),r=process.argv[1],s=f.lstatSync(r);function size(x){const s=f.lstatSync(x);return s.isDirectory()?f.readdirSync(x).reduce((n,k)=>n+size(p.join(x,k)),0):s.size}if(!/^media-server-current-ui-seed\.[A-Za-z0-9]+$/.test(p.basename(r))||s.isSymbolicLink()||`${s.dev}:${s.ino}:${s.uid}`!==process.argv[3]||s.uid!==process.getuid()||p.dirname(f.realpathSync(r))!==f.realpathSync(process.argv[2]))throw Error("cleanup ownership");const bytes=size(r);f.rmSync(r,{recursive:true});console.log("[cleanup] "+JSON.stringify({path:r,bytes,removed:!f.existsSync(r)}));if(f.existsSync(r))process.exit(1)' "$RUN_DIR" "${TMPDIR:-/tmp}" "$RUN_IDENTITY"
 echo "[elapsed] seconds=$SECONDS source=bash-SECONDS actualUiPass=false"
}
trap cleanup EXIT
export MEDIA_SERVER_GST_CACHE_DIR="$RUN_DIR/gst-cache" MEDIA_SERVER_GST_PLUGIN_PROFILE=headless
export GST_REGISTRY="$RUN_DIR/registry.bin" GST_REGISTRY_1_0="$RUN_DIR/registry.bin"
source "$SCRIPT_DIR/env_common.sh"
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
 -DMEDIA_SERVER_USE_GSTREAMER=1 -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_USE_SQLITE3=1 -DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND=1 \
 "$SCRIPT_DIR/recording_current_ui_seed.cpp" "${LINK_LIBS[@]}" -o "$RUN_DIR/check"
if [[ "${1:-}" == "--self-test" ]];then
 test "$#" = 1
 "$RUN_DIR/check" "$RUN_DIR/recordings" "$RUN_DIR/manifest.json" 1789084800000 none
 node "$SCRIPT_DIR/recording_current_ui_seed.mjs" "$RUN_DIR" "$RUN_DIR/manifest.json"
 if "$RUN_DIR/check" "$RUN_DIR/recordings" "$RUN_DIR/manifest.json" 1789084800000 none >/dev/null 2>&1;then exit 1;fi
 echo 'PASS: LP26-U01-A owned initialized root and manifest refuse overwrite'
 if "$RUN_DIR/check" "$RUN_DIR/not-recordings" "$RUN_DIR/rejected.json" 1789084800000 none >/dev/null 2>&1;then exit 1;fi
 mkdir "$RUN_DIR/media-server-current-ui-seed.invalid"
 if "$RUN_DIR/check" "$RUN_DIR/media-server-current-ui-seed.invalid/recordings" "$RUN_DIR/media-server-current-ui-seed.invalid/rejected.json" invalid none >/dev/null 2>&1;then exit 1;fi
 test ! -e "$RUN_DIR/rejected.json"
 test ! -e "$RUN_DIR/not-recordings"
 test ! -e "$RUN_DIR/media-server-current-ui-seed.invalid/recordings"
 mkdir "$RUN_DIR/media-server-current-ui-seed.symlink"
 ln -s "$RUN_DIR/recordings" "$RUN_DIR/media-server-current-ui-seed.symlink/recordings"
 if "$RUN_DIR/check" "$RUN_DIR/media-server-current-ui-seed.symlink/recordings" "$RUN_DIR/media-server-current-ui-seed.symlink/rejected.json" 1789084800000 none >/dev/null 2>&1;then exit 1;fi
 test -L "$RUN_DIR/media-server-current-ui-seed.symlink/recordings"
 test ! -e "$RUN_DIR/media-server-current-ui-seed.symlink/rejected.json"
 echo 'PASS: LP26-U01-A invalid owned target rejected without new artifacts'
else
 test "$#" = 4
 "$RUN_DIR/check" "$1" "$2" "$3" "$4"
 node "$SCRIPT_DIR/recording_current_ui_seed.mjs" "$(dirname "$1")" "$2"
fi
