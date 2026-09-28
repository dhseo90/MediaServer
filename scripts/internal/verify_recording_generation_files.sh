#!/usr/bin/env bash
# 파일 용도: B안 세대 파일 준비의 독립 정상·오류·경계 반례를 소유 임시 빌드에서 확인한다.
set -euo pipefail

b02_script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
b02_repo="$(cd "$b02_script_dir/../.." && pwd)"
b02_temp_parent="$(cd "${TMPDIR:-/tmp}" && pwd -P)"
b02_root="$(mktemp -d "$b02_temp_parent/media-server-generation-files-build.XXXXXX")"
b02_cleanup() {
  local prior=$?
  local name="${b02_root##*/}"
  if [[ -d "$b02_root" && ! -L "$b02_root" && -O "$b02_root" &&
        "${b02_root%/*}" == "$b02_temp_parent" &&
        "$name" =~ ^media-server-generation-files-build\.[A-Za-z0-9]+$ ]]; then
    rm -rf -- "$b02_root"
  fi
  if [[ -e "$b02_root" ]]; then
    echo '[cleanup] removed=false'
    return 1
  fi
  echo '[cleanup] removed=true'
  return "$prior"
}
trap b02_cleanup EXIT

read -r -a b02_cflags <<< "$(pkg-config --cflags openssl)"
read -r -a b02_libs <<< "$(pkg-config --libs openssl)"
b02_sources=(
  "$b02_repo/src/domain/strict_json.cpp"
  "$b02_repo/src/recording/recording_generation_manifest.cpp"
  "$b02_repo/src/recording/recording_generation_files.cpp"
  "$b02_script_dir/recording_generation_files_smoke.cpp"
)
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$b02_repo/include" \
  -DMEDIA_SERVER_USE_OPENSSL=1 -DMEDIA_SERVER_RECORDING_GENERATION_TESTING=1 \
  "${b02_cflags[@]}" "${b02_sources[@]}" "${b02_libs[@]}" \
  -o "$b02_root/files-crypto"
"$b02_root/files-crypto"

"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$b02_repo/include" \
  -DMEDIA_SERVER_USE_OPENSSL=0 "${b02_sources[@]}" \
  -o "$b02_root/files-no-crypto"
"$b02_root/files-no-crypto"
