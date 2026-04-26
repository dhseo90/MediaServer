#!/usr/bin/env bash
# 파일 용도: /lab/import 실험실 import UI와 jobs API의 기본 상태를 smoke 검증한다.
# 동작 요약: 서버가 실행 중인 상태에서 HTML 필수 요소와 /lab/import/jobs JSON 응답 구조를 확인한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
source "${SCRIPT_DIR}/env_common.sh"
media_server_apply_homebrew_gst_env

ENV_FILE="${SCRIPTS_DIR}/.media_server.env"
if [[ -f "${ENV_FILE}" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "${ENV_FILE}"
  set +a
fi

STD_AFX="${ROOT_DIR}/include/stdafx.h"
PASS_COUNT=0
FAIL_COUNT=0
SKIP_COUNT=0
RUN_ID="lab-import-ui-$(date +%s)-$$"
HTML_FILE="/tmp/media_server_${RUN_ID}_lab_import.html"
JOBS_FILE="/tmp/media_server_${RUN_ID}_jobs.json"

# 성공/실패/스킵 카운터를 같은 형식으로 남긴다.
log_pass() { echo "[pass] $*"; PASS_COUNT=$((PASS_COUNT + 1)); }
log_fail() { echo "[fail] $*"; FAIL_COUNT=$((FAIL_COUNT + 1)); }
log_skip() { echo "[skip] $*"; SKIP_COUNT=$((SKIP_COUNT + 1)); }
log_info() { echo "[info] $*"; }

# 환경값 또는 stdafx.h에서 HTTP 포트를 결정한다.
resolve_port() {
  local env_value="$1"
  local const_name="$2"
  local fallback="$3"
  if [[ -n "${env_value}" ]]; then
    printf '%s' "${env_value}"
    return
  fi
  local parsed
  parsed="$(sed -nE "s/.*${const_name} = ([0-9]+).*/\\1/p" "${STD_AFX}" | head -n1)"
  printf '%s' "${parsed:-${fallback}}"
}

# wildcard listen address를 로컬 검증용 loopback으로 바꾼다.
client_host() {
  local value="$1"
  if [[ -z "${value}" || "${value}" == "0.0.0.0" || "${value}" == "::" ]]; then
    printf '127.0.0.1'
  else
    printf '%s' "${value}"
  fi
}

# verify-lab-import-ui 사용법을 출력한다.
usage() {
  cat <<'EOF_USAGE'
Lab import UI smoke 검증

Usage:
  ./server.sh verify-lab-import-ui [--http-base URL]

환경 변수:
  MEDIA_SERVER_VERIFY_LAB_IMPORT_HTTP_BASE
  MEDIA_SERVER_VERIFY_LAB_IMPORT_HTTP_HOST
EOF_USAGE
}

HTTP_PORT="$(resolve_port "${MEDIA_SERVER_HTTP_LISTEN_PORT:-}" "kHttpListenPort" "8080")"
HTTP_ADDRESS="${MEDIA_SERVER_HTTP_LISTEN_ADDRESS:-$(media_server_read_const_charp "${STD_AFX}" "kHttpListenAddress" || true)}"
HTTP_HOST="$(client_host "${MEDIA_SERVER_VERIFY_LAB_IMPORT_HTTP_HOST:-${MEDIA_SERVER_VERIFY_HOST:-${HTTP_ADDRESS}}}")"
HTTP_BASE="${MEDIA_SERVER_VERIFY_LAB_IMPORT_HTTP_BASE:-http://${HTTP_HOST}:${HTTP_PORT}}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --http-base)
      HTTP_BASE="${2:-}"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "알 수 없는 옵션입니다: $1"
      usage
      exit 1
      ;;
  esac
  shift
done
HTTP_BASE="${HTTP_BASE%/}"

log_info "http_base=${HTTP_BASE}"

if ! curl -fsS --max-time 3 "${HTTP_BASE}/health" >/dev/null; then
  log_fail "HTTP health check 실패: ${HTTP_BASE}/health"
  exit 1
fi
log_pass "HTTP health ok"

if curl -fsS "${HTTP_BASE}/lab/import?embed=1" > "${HTML_FILE}"; then
  python3 - "${HTML_FILE}" <<'PY'
import pathlib
import sys

html = pathlib.Path(sys.argv[1]).read_text(encoding="utf-8")
required = [
    "실험실 가져오기",
    "providerInput",
    "urlInput",
    "targetFileInput",
    "createBtn",
    "jobsList",
    "detailBox",
    "파일 다운로드",
    "직접 표출",
]
missing = [token for token in required if token not in html]
if missing:
    raise SystemExit("missing import UI tokens: " + ", ".join(missing))
PY
  log_pass "/lab/import HTML 필수 요소 확인"
else
  log_fail "/lab/import HTML 조회 실패"
fi

if curl -fsS "${HTTP_BASE}/lab/import/jobs" > "${JOBS_FILE}"; then
  python3 - "${JOBS_FILE}" <<'PY'
import json
import pathlib
import sys

payload = json.loads(pathlib.Path(sys.argv[1]).read_text())
jobs = payload.get("jobs")
if not isinstance(jobs, list):
    raise SystemExit("jobs field is not a list")
for job in jobs:
    for key in ("jobId", "provider", "sourceUrl", "status", "createdAtMs", "updatedAtMs"):
        if key not in job:
            raise SystemExit(f"job field missing: {key}")
print("job_count=", len(jobs))
PY
  log_pass "/lab/import/jobs 응답 구조 확인"
else
  log_fail "/lab/import/jobs 조회 실패"
fi

echo
echo "== Lab import UI smoke 검증 요약 =="
echo "- 통과: ${PASS_COUNT}"
echo "- 실패: ${FAIL_COUNT}"
echo "- 건너뜀: ${SKIP_COUNT}"
echo "- html: ${HTML_FILE}"
echo "- jobs: ${JOBS_FILE}"

if (( FAIL_COUNT > 0 )); then
  exit 1
fi
