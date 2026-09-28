#!/usr/bin/env bash
# 파일 용도: 녹화 runtime 세대 연결 smoke의 빌드·실행·정리를 수행한다.
# 기본 B 구성의 파일/복구 집중 검사. 실제 서버·포트·브라우저를 실행하지 않는다.
set -euo pipefail
runtime_script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
runtime_repo="$(cd "$runtime_script/../.." && pwd)"
runtime_build="$runtime_repo/build-gst-onnx"
runtime_mode="${1:-all}"
[[ "$runtime_mode" == all || "$runtime_mode" == --red ]] || { echo 'usage: verify_recording_runtime_generation.sh [--red]' >&2; exit 2; }
runtime_parent="$(cd "${TMPDIR:-/tmp}" && pwd -P)"
runtime_root="$(mktemp -d "$runtime_parent/media-server-runtime-generation.XXXXXX")"
runtime_identity="$(node -e 'const f=require("fs"),s=f.lstatSync(process.argv[1]);console.log(JSON.stringify({dev:s.dev,ino:s.ino,uid:s.uid}))' "$runtime_root")"
runtime_cleanup() {
 local prior=$?
 node -e '
const f=require("fs"),p=require("path"),r=process.argv[1],parent=process.argv[2],expected=JSON.parse(process.argv[3]),s=f.lstatSync(r);
if(p.dirname(r)!==parent||!/^media-server-runtime-generation\.[A-Za-z0-9]+$/.test(p.basename(r))||!s.isDirectory()||s.isSymbolicLink()||s.uid!==process.getuid()||s.dev!==expected.dev||s.ino!==expected.ino||f.realpathSync(r)!==r)throw Error("cleanup owner");
function size(name){const t=f.lstatSync(name);return t.isDirectory()?f.readdirSync(name).reduce((n,k)=>n+size(p.join(name,k)),0):t.size;}
const bytes=size(r);f.rmSync(r,{recursive:true});if(f.existsSync(r))throw Error("cleanup remains");console.log(`[cleanup] path=${r} bytes=${bytes} removed=true`);' "$runtime_root" "$runtime_parent" "$runtime_identity" || return 1
 return "$prior"
}
trap runtime_cleanup EXIT
date -u '+[start] %Y-%m-%dT%H:%M:%SZ'
uname -srm
"${CXX:-c++}" --version | head -1
read -r -a runtime_link < "$runtime_build/CMakeFiles/media_server.dir/link.txt"
runtime_libs=();runtime_found=0
for token in "${runtime_link[@]}";do
 if [[ "$token" == libmedia_server_runtime.a ]];then runtime_found=1;runtime_libs+=("$runtime_build/$token");continue;fi
 if ((runtime_found));then runtime_libs+=("$token");fi
done
test "$runtime_found" = 1
cd "$runtime_repo"
node -e 'const f=require("fs"),p=require("path"),root=process.argv[1],build=process.argv[2],archive=f.statSync(p.join(build,"libmedia_server_runtime.a")).mtimeMs,exe=f.statSync(p.join(build,"media_server")).mtimeMs,link=f.readFileSync(p.join(build,"CMakeFiles/media_server.dir/link.txt"),"utf8"),app=new Set([...link.matchAll(/CMakeFiles\/media_server\.dir\/(src\/[^ ]+)\.o/g)].map(m=>m[1]));function check(dir){for(const name of f.readdirSync(dir)){const full=p.join(dir,name),s=f.statSync(full);if(s.isDirectory())check(full);else if(/\.(h|hpp|cpp)$/.test(name)&&s.mtimeMs>(app.has(p.relative(root,full))?exe:archive))throw Error("matching product build required: "+p.relative(root,full));}}check(p.join(root,"src"));check(p.join(root,"include"));' "$runtime_repo" "$runtime_build"
shasum -a 256 src/recording/recording_runtime_composition.cpp include/recording/recording_runtime_composition.h \
 src/recording/recording_catalog.cpp include/recording/recording_catalog.h src/recording/recording_journal.cpp include/recording/recording_journal.h \
 src/recording/recording_catalog_cutover_candidate.cpp src/recording/recording_generation_transaction.cpp \
 src/ingress/recording_application_service.cpp scripts/internal/recording_runtime_generation_smoke.cpp \
 scripts/internal/verify_recording_runtime_generation.sh "$runtime_build/libmedia_server_runtime.a"
read -r -a runtime_flags <<< "$(pkg-config --cflags gstreamer-app-1.0 openssl sqlite3)"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -Iinclude "${runtime_flags[@]}" \
 -DMEDIA_SERVER_USE_GSTREAMER=1 -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_USE_SQLITE3=1 \
 -DMEDIA_SERVER_ENABLE_RECORDING_GENERATION_BACKEND=1 -DMEDIA_SERVER_RECORDING_GENERATION_TESTING=1 \
 scripts/internal/recording_runtime_generation_smoke.cpp "${runtime_libs[@]}" -o "$runtime_root/check"
if [[ "$runtime_mode" == --red ]];then "$runtime_root/check" "$runtime_root/fixtures" --red;
else "$runtime_root/check" "$runtime_root/fixtures";fi
date -u '+[end] %Y-%m-%dT%H:%M:%SZ'
