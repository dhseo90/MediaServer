#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

"${SCRIPT_DIR}/stop_server.sh" || true
if "${SCRIPT_DIR}/start_server.sh"; then
  echo "[restart] start_server succeeded"
else
  START_RC=$?
  echo "[restart] start_server failed (rc=${START_RC}); running diagnostics for root-cause"
  "${SCRIPT_DIR}/diagnose_media_server.sh" || true
  exit ${START_RC}
fi

"${SCRIPT_DIR}/diagnose_media_server.sh"
