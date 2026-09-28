#!/usr/bin/env bash
# 파일 용도: 기존 runtime archive와 실제 managed media fixture의 파생 경계를 검사한다.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
source "$SCRIPT_DIR/env_common.sh"
BUILD_DIR="$ROOT_DIR/build-gst-onnx"
RUN_DIR="$(mktemp -d "${TMPDIR:-/tmp}/media-server-derived-remux.XXXXXX")"
RUN_DIR="$(cd "$RUN_DIR" && pwd -P)"
SECONDS=0
cleanup() {
  node -e 'const f=require("fs"),p=require("path"),r=process.argv[1];function size(x){const s=f.lstatSync(x);return s.isDirectory()?f.readdirSync(x).reduce((n,k)=>n+size(p.join(x,k)),0):s.size}if(!p.basename(r).startsWith("media-server-derived-remux.")||f.lstatSync(r).isSymbolicLink()||p.dirname(f.realpathSync(r))!==f.realpathSync(process.argv[2]))throw Error("cleanup containment");const bytes=size(r);f.rmSync(r,{recursive:true});console.log(`[cleanup] path=${r} bytes=${bytes} removed=${!f.existsSync(r)}`);if(f.existsSync(r))process.exit(1)' "$RUN_DIR" "${TMPDIR:-/tmp}"
  echo "[elapsed] seconds=$SECONDS source=bash-SECONDS"
}
trap cleanup EXIT
export GST_REGISTRY="$RUN_DIR/registry.bin"
media_server_apply_homebrew_gst_env
read -r -a ORIGINAL_LINK < "$BUILD_DIR/CMakeFiles/media_server.dir/link.txt"
LINK_LIBS=();found=0
for token in "${ORIGINAL_LINK[@]}"; do
  if [[ "$token" == libmedia_server_runtime.a ]]; then found=1;LINK_LIBS+=("$BUILD_DIR/$token");continue;fi
  if ((found));then LINK_LIBS+=("$token");fi
done
test "$found" = 1
read -r -a GST_CFLAGS <<< "$(pkg-config --cflags gstreamer-app-1.0)"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$ROOT_DIR/include" "${GST_CFLAGS[@]}" \
  "$SCRIPT_DIR/recording_derived_remux_budget_smoke.cpp" -DMEDIA_SERVER_USE_GSTREAMER=1 "${LINK_LIBS[@]}" -o "$RUN_DIR/budget-check"
"$RUN_DIR/budget-check"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$ROOT_DIR/include" "${GST_CFLAGS[@]}" \
  "$SCRIPT_DIR/recording_derived_remux_smoke.cpp" "$ROOT_DIR/src/recording/recording_derived_remux.cpp" \
  -DMEDIA_SERVER_USE_GSTREAMER=1 "${LINK_LIBS[@]}" -o "$RUN_DIR/check"
"$RUN_DIR/check" "$RUN_DIR"
