#!/usr/bin/env bash
# 파일 용도: B-03 예약 이력 값 코덱의 정상·오류·경계 반례를 독립 빌드로 확인한다.
set -euo pipefail

b03_script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
b03_repo="$(cd "$b03_script_dir/../.." && pwd)"
b03_temp_parent="$(cd "${TMPDIR:-/tmp}" && pwd -P)"
b03_root="$(mktemp -d "$b03_temp_parent/media-server-order-snapshot-build.XXXXXX")"
b03_cleanup() {
  local prior=$?
  local name="${b03_root##*/}"
  if [[ -d "$b03_root" && ! -L "$b03_root" && -O "$b03_root" &&
        "${b03_root%/*}" == "$b03_temp_parent" &&
        "$name" =~ ^media-server-order-snapshot-build\.[A-Za-z0-9]+$ ]]; then
    rm -rf -- "$b03_root"
  fi
  if [[ -e "$b03_root" ]]; then
    echo '[cleanup] removed=false'
    return 1
  fi
  echo '[cleanup] removed=true'
  return "$prior"
}
trap b03_cleanup EXIT

read -r -a b03_cflags <<< "$(pkg-config --cflags openssl)"
read -r -a b03_libs <<< "$(pkg-config --libs openssl)"
b03_sources=(
  "$b03_repo/src/domain/strict_json.cpp"
  "$b03_repo/src/recording/recording_contracts.cpp"
  "$b03_repo/src/recording/recording_order_history_snapshot.cpp"
  "$b03_script_dir/recording_order_history_snapshot_smoke.cpp"
)
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$b03_repo/include" \
  -DMEDIA_SERVER_USE_OPENSSL=1 "${b03_cflags[@]}" "${b03_sources[@]}" "${b03_libs[@]}" \
  -o "$b03_root/order-crypto"
"$b03_root/order-crypto"

"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -I"$b03_repo/include" \
  -DMEDIA_SERVER_USE_OPENSSL=0 "${b03_sources[@]}" \
  -o "$b03_root/order-no-crypto"
"$b03_root/order-no-crypto"
