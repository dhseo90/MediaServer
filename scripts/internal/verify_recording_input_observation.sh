#!/usr/bin/env bash
# 파일 용도: 포트 없는 Gst 입력 관측과 실제 cache 전달 focused 검증을 실행한다.
set -euo pipefail
input_script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
input_repo="$(cd "$input_script_dir/../.." && pwd)"
input_run="$(mktemp -d "${TMPDIR:-/tmp}/media-server-input-observation.XXXXXX")"
cleanup() {
  local bytes=0
  if [[ -f "$input_run/probe" ]]; then
    bytes="$(wc -c < "$input_run/probe" | tr -d ' ')"
    rm -- "$input_run/probe"
  fi
  rmdir -- "$input_run"
  printf '[cleanup] path=%s bytes=%s removed=true\n' "$input_run" "$bytes"
}
trap cleanup EXIT
source "$input_script_dir/env_common.sh"
media_server_apply_homebrew_gst_env
read -r -a input_gst <<< "$(pkg-config --cflags --libs gstreamer-1.0 gstreamer-app-1.0)"
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -DMEDIA_SERVER_USE_GSTREAMER=1 \
  -I"$input_repo/include" "$input_script_dir/recording_input_observation_smoke.cpp" \
  "$input_repo/src/core/shared_stream.cpp" "$input_repo/src/app_config.cpp" \
  "${input_gst[@]}" -o "$input_run/probe"
"$input_run/probe"
