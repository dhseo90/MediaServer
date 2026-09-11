#!/usr/bin/env bash
# 파일 용도: 독립 운영 GET 진단 C++ smoke를 임시 경로에서 컴파일·실행·정리한다.
set -euo pipefail
if [[ $# -ne 0 ]]; then exit 2; fi
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
RUN_DIR="$(mktemp -d "${TMPDIR:-/tmp}/site-request-diagnostic-unit.XXXXXX")"
completed=0
cleanup() {
  local result=$? size
  size=$(du -sk "$RUN_DIR" | awk '{print $1}')
  if ! rm -r "$RUN_DIR"; then result=1; fi
  if [[ -e "$RUN_DIR" || -L "$RUN_DIR" ]]; then result=1; fi
  printf '[cleanup] %s kib=%s absent=%s\n' "$RUN_DIR" "$size" "$([[ ! -e "$RUN_DIR" && ! -L "$RUN_DIR" ]] && echo true || echo false)"
  if [[ $completed -ne 1 && $result -eq 0 ]]; then result=1; fi
  trap - EXIT
  exit "$result"
}
trap cleanup EXIT
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -I"$ROOT_DIR/src" "$SCRIPT_DIR/site_operations_request_diagnostic_smoke.cpp" -o "$RUN_DIR/smoke"
"$RUN_DIR/smoke"
completed=1
