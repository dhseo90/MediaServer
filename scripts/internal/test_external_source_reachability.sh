#!/usr/bin/env bash
# 파일 용도: 제3자 RTSP upstream 후보의 네트워크 reachability를 점검하되, 명시 설정이 없으면 advisory로만 보고한다.
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

VERIFY_CONFIG_FILE="${MEDIA_SERVER_VERIFY_CONFIG:-${ROOT_DIR}/config/codec_test_sources.json}"
PREFLIGHT_TIMEOUT_MS="${MEDIA_SERVER_RTSP_SOURCE_PREFLIGHT_TIMEOUT_MS:-1500}"
REQUIRE_EXTERNAL_SOURCE="${MEDIA_SERVER_TEST_REQUIRE_EXTERNAL_SOURCE:-0}"

split_url_list() {
  local raw="$1"
  printf '%s' "${raw}" | tr ',;' '\n' | awk '{$1=$1; if (length($0) > 0) print $0}'
}

load_config_rtsp_candidates() {
  [[ -f "${VERIFY_CONFIG_FILE}" ]] || return 0
  python3 - "${VERIFY_CONFIG_FILE}" <<'PY'
import json
import pathlib
import sys

path = pathlib.Path(sys.argv[1])
try:
    data = json.loads(path.read_text())
except Exception:
    raise SystemExit(0)

for source in data.get("sources", []):
    if source.get("source_kind") == "rtsp" and source.get("requires_network") is True:
        url = str(source.get("source", "")).strip()
        if url:
            print(url)
PY
}

URLS=()
EXPLICIT_URLS=0

if [[ -n "${MEDIA_SERVER_TEST_EXTERNAL_RTSP_URLS:-}" ]]; then
  EXPLICIT_URLS=1
  while IFS= read -r url; do
    [[ -n "${url}" ]] && URLS+=("${url}")
  done < <(split_url_list "${MEDIA_SERVER_TEST_EXTERNAL_RTSP_URLS}")
elif [[ -n "${MEDIA_SERVER_DIAG_RTSP_URL:-}" ]]; then
  EXPLICIT_URLS=1
  URLS+=("${MEDIA_SERVER_DIAG_RTSP_URL}")
else
  while IFS= read -r url; do
    [[ -n "${url}" ]] && URLS+=("${url}")
  done < <(load_config_rtsp_candidates)
fi

if [[ ${EXPLICIT_URLS} -eq 1 ]]; then
  REQUIRE_EXTERNAL_SOURCE=1
fi

echo "[정보] external_source_mode=$([[ ${REQUIRE_EXTERNAL_SOURCE} == "1" ]] && echo required || echo advisory)"
echo "[정보] preflight_timeout_ms=${PREFLIGHT_TIMEOUT_MS}"

if [[ ${#URLS[@]} -eq 0 ]]; then
  echo "[주의] 검사할 외부 RTSP 후보가 없습니다."
  echo "[안내] MEDIA_SERVER_TEST_EXTERNAL_RTSP_URLS='rtsp://...'를 설정하면 hard gate로 검증합니다."
  if [[ "${REQUIRE_EXTERNAL_SOURCE}" == "1" ]]; then
    exit 1
  fi
  exit 0
fi

PASS_COUNT=0
FAIL_COUNT=0

for url in "${URLS[@]}"; do
  echo
  echo "[검사] ${url}"
  if output="$(media_server_rtsp_preflight "${url}" "${PREFLIGHT_TIMEOUT_MS}" 2>&1)"; then
    echo "[통과] ${output}"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "[실패] ${output}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
done

echo
echo "[요약] 외부 RTSP 후보 통과=${PASS_COUNT} 실패=${FAIL_COUNT}"

if [[ ${PASS_COUNT} -gt 0 ]]; then
  exit 0
fi

if [[ "${REQUIRE_EXTERNAL_SOURCE}" == "1" ]]; then
  echo "[결론] 명시된 외부 RTSP source가 모두 실패했습니다."
  echo "[원인] outbound 554/tcp, 방화벽, upstream 상태, URL 유효성을 확인하세요."
  exit 1
fi

echo "[결론] 기본 후보는 현재 환경에서 실패했지만, 명시 URL이 아니므로 advisory로 처리합니다."
echo "[안내] 운영/실제 카메라 검증 시 MEDIA_SERVER_TEST_EXTERNAL_RTSP_URLS를 설정하면 실패를 hard gate로 처리합니다."
exit 0
