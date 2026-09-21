#!/usr/bin/env bash
# 파일 용도: S10-2 순수 설계 모델만 컴파일·실행한다. 서버·포트·실제 미디어는 만들지 않는다.
set -euo pipefail
probe_source_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
probe_temp_root="${TMPDIR:-/tmp}"
probe_run_dir="$(mktemp -d "${probe_temp_root%/}/media-server-s10-policy.XXXXXX")"
cleanup() {
  local bytes=0
  if [[ -f "$probe_run_dir/probe" ]]; then
    bytes="$(wc -c < "$probe_run_dir/probe" | tr -d ' ')"
    rm -- "$probe_run_dir/probe"
  fi
  rmdir -- "$probe_run_dir"
  printf 'CLEANUP path=%s bytes=%s removed=true\n' "$probe_run_dir" "$bytes"
}
trap cleanup EXIT
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror \
  "$probe_source_dir/recording_time_policy_probe.cpp" -o "$probe_run_dir/probe"
"$probe_run_dir/probe"
