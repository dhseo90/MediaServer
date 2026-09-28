#!/usr/bin/env bash
# 파일 용도: 직접 링크한 decoder와 bounded correlation을 소유 임시 경로에서 검증한다.
set -euo pipefail
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo="$(cd "$script_dir/../.." && pwd)"
temp_parent="$(cd "${TMPDIR:-/tmp}" && pwd -P)"
run="$(mktemp -d "$temp_parent/media-server-frame-correlation.XXXXXX")"
SECONDS=0
cleanup(){ node -e 'const f=require("fs"),p=require("path"),r=process.argv[1];if(p.dirname(r)!==process.argv[2]||!/^media-server-frame-correlation\.[A-Za-z0-9]+$/.test(p.basename(r))||f.lstatSync(r).isSymbolicLink())process.exit(2);function size(x){const s=f.lstatSync(x);return s.isDirectory()?f.readdirSync(x).reduce((n,k)=>n+size(p.join(x,k)),0):s.size}const bytes=size(r);f.rmSync(r,{recursive:true});console.log(`[cleanup] path=${r} bytes=${bytes} removed=${!f.existsSync(r)}`)' "$run" "$temp_parent";echo "[elapsed] seconds=$SECONDS source=bash-SECONDS"; }
trap cleanup EXIT
source "$script_dir/env_common.sh"
media_server_apply_homebrew_gst_env
read -r -a gst_flags <<<"$(pkg-config --cflags --libs gstreamer-1.0 gstreamer-app-1.0)"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -DMEDIA_SERVER_USE_GSTREAMER=1 -I"$repo/include" \
 "$script_dir/recording_frame_correlation_smoke.cpp" "$repo/src/analysis/raw_video_decoder.cpp" "${gst_flags[@]}" -o "$run/test"
"$run/test"
