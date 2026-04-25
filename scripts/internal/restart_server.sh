#!/usr/bin/env bash
# 파일 용도: media_server를 중지한 뒤 동일 설정으로 다시 시작한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"${SCRIPT_DIR}/stop_server.sh" || true
if "${SCRIPT_DIR}/start_server.sh"; then
  echo "[restart] start succeeded"
else
  START_RC=$?
  echo "[restart] start failed (rc=${START_RC}); running diagnostics for root-cause"
  "${SCRIPT_DIR}/diagnose_media_server.sh" || true
  exit ${START_RC}
fi

"${SCRIPT_DIR}/diagnose_media_server.sh"
