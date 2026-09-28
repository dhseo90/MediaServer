#!/usr/bin/env bash
# 파일 용도: 실제 core 수명 회귀를 별도 bounded 프로세스로 실행하고 임시 binary를 정리한다.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
BUILD_DIR=$(mktemp -d "${TMPDIR:-/tmp}/media-server-lifecycle.XXXXXX")
cleanup() {
  find "$BUILD_DIR" -type f -exec wc -c {} \; | awk '{bytes+=$1;files+=1} END {printf "[cleanup] files=%d bytes=%.0f\n",files,bytes}'
  rm -rf -- "$BUILD_DIR"
  test ! -e "$BUILD_DIR" && test ! -L "$BUILD_DIR"
  echo "[cleanup] absent=$BUILD_DIR"
}
trap cleanup EXIT
"${CXX:-c++}" -std=c++17 -Wall -Wextra -Werror -pthread -DMEDIA_SERVER_USE_GSTREAMER=0 -I"$ROOT_DIR/include" \
 "$SCRIPT_DIR/stream_shutdown_lifecycle_smoke.cpp" \
 "$ROOT_DIR/src/core/session_manager.cpp" "$ROOT_DIR/src/core/shared_stream.cpp" \
 "$ROOT_DIR/src/core/stream_registry.cpp" "$ROOT_DIR/src/core/resource_guard.cpp" \
 "$ROOT_DIR/src/core/source_request_parser.cpp" "$ROOT_DIR/src/core/stream_key.cpp" \
 "$ROOT_DIR/src/app_config.cpp" -o "$BUILD_DIR/lifecycle-smoke"
failed=0
for scenario in LC01 LC02 LC03 LC04 LC05 LC06; do
  if "$BUILD_DIR/lifecycle-smoke" "$scenario"; then :; else failed=$((failed+1)); fi
done
echo "[summary] scenarios=6 failed=$failed"
test "$failed" -eq 0
