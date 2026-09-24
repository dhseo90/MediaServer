#!/usr/bin/env bash
# 파일 용도: O29 checkpoint I/O native fixture를 소유 임시 root에서 빌드·실행·정리한다.
set -euo pipefail
o29_script="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
o29_repo="$(cd "$o29_script/../.." && pwd)"
o29_temp_parent="$(cd "${TMPDIR:-/tmp}" && pwd -P)"
o29_root="$(mktemp -d "$o29_temp_parent/media-server-immutable-ownership.XXXXXX")"
o29_cleanup(){
  local prior=$?
  local base="${o29_root##*/}"
  if [[ -d "$o29_root" && ! -L "$o29_root" && -O "$o29_root" && "${o29_root%/*}" == "$o29_temp_parent" && "$base" =~ ^media-server-immutable-ownership\.[A-Za-z0-9]+$ ]];then rm -rf -- "$o29_root";fi
  if [[ -e "$o29_root" ]];then echo '[cleanup] removed=false';return 1;fi
  echo '[cleanup] removed=true'
  return "$prior"
}
trap o29_cleanup EXIT

bash "$o29_script/recording_immutable_ownership_build.sh" "$o29_root" journal-cold
read -r -a o29_link < "$o29_repo/build-gst-onnx/CMakeFiles/media_server.dir/link.txt"
o29_libs=();o29_found=0
for o29_token in "${o29_link[@]}";do
  if [[ "$o29_token" == libmedia_server_runtime.a ]];then o29_found=1;o29_libs+=("$o29_repo/build-gst-onnx/$o29_token");continue;fi
  if ((o29_found));then o29_libs+=("$o29_token");fi
done
test "$o29_found" = 1
read -r -a o29_flags <<< "$(pkg-config --cflags gstreamer-app-1.0 openssl sqlite3)"
o29_shared=(-DLP18_SHARED_RECORDS=0);[[ -s "$o29_root/ownership_flags" ]]&&o29_shared=(-DLP18_SHARED_RECORDS=1)
o29_accepted=(-DLP18_ACCEPTED_SHARED=0);[[ -s "$o29_root/accepted_flags" ]]&&o29_accepted=(-DLP18_ACCEPTED_SHARED=1)
o29_binding=(-DLP18_BINDING_SHARED=0);[[ -s "$o29_root/binding_flags" ]]&&o29_binding=(-DLP18_BINDING_SHARED=1)
o29_job=(-DLP18_JOB_SHARED=0);[[ -s "$o29_root/job_flags" ]]&&o29_job=(-DLP18_JOB_SHARED=1)
read -r o29_location < "$o29_root/location_flags" || [[ -n "$o29_location" ]]
read -r o29_cold < "$o29_root/cold_flags" || [[ -n "$o29_cold" ]]
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$o29_root/include" -I"$o29_repo/include" -I"$o29_script" -I"$o29_repo/src/recording" \
  "${o29_flags[@]}" "${o29_shared[@]}" "${o29_accepted[@]}" "${o29_binding[@]}" "${o29_job[@]}" "$o29_location" "$o29_cold" \
  -DMEDIA_SERVER_USE_GSTREAMER=1 -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_USE_SQLITE3=1 \
  "$o29_script/recording_checkpoint_io_contract_smoke.cpp" "$o29_root/recording_journal.cpp" "$o29_root/recording_catalog.cpp" "${o29_libs[@]}" -lz -o "$o29_root/o29-check"
"$o29_root/o29-check" "$o29_root/fixture"
