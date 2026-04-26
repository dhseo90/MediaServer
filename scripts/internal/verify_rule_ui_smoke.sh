#!/usr/bin/env bash
# 파일 용도: /lab/rules Rule/Profile 카테고리 UI의 기본 버튼 동작과 저장 payload를 headless browser로 확인한다.
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
RUN_ID="rule-ui-smoke-$(date +%s)-$$"
BROWSER_LOG="/tmp/media_server_${RUN_ID}_browser.json"
INVALID_RULE_FILE="/tmp/media_server_${RUN_ID}_invalid_rule.json"
INVALID_PROFILE_FILE="/tmp/media_server_${RUN_ID}_invalid_profile.json"
CAPABILITIES_FILE="/tmp/media_server_${RUN_ID}_capabilities.json"

# 검증 진행 상황을 정보 로그로 출력한다.
log_info() {
  echo "[info] $*"
}

# 성공한 검증 항목을 세고 로그로 남긴다.
log_pass() {
  echo "[pass] $*"
  PASS_COUNT=$((PASS_COUNT + 1))
}

# 실패한 검증 항목을 세고 로그로 남긴다.
log_fail() {
  echo "[fail] $*"
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

# 검증에 필요한 외부 명령이 설치되어 있는지 확인한다.
require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    log_fail "필수 도구가 없습니다: $1"
    exit 1
  fi
}

# 환경값이나 stdafx.h에서 HTTP 포트를 결정한다.
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

# 서버가 0.0.0.0/::로 listen 중이면 클라이언트 접속용 localhost로 변환한다.
client_host() {
  local value="$1"
  if [[ -z "${value}" || "${value}" == "0.0.0.0" || "${value}" == "::" ]]; then
    printf '127.0.0.1'
  else
    printf '%s' "${value}"
  fi
}

# verify-rule-ui 사용법을 출력한다.
usage() {
  cat <<'EOF_USAGE'
Rule/Profile UI smoke 검증

Usage:
  ./server.sh verify-rule-ui [options]

Options:
  --http-base <url>   기본값은 현재 HTTP listen 설정 기준
  --debug-port <port> headless Chrome remote debugging port. 기본 9245
  -h, --help          도움말 출력
EOF_USAGE
}

HTTP_PORT="$(resolve_port "${MEDIA_SERVER_HTTP_LISTEN_PORT:-}" "kHttpListenPort" "8080")"
HTTP_ADDRESS="${MEDIA_SERVER_HTTP_LISTEN_ADDRESS:-$(media_server_read_const_charp "${STD_AFX}" "kHttpListenAddress" || true)}"
HTTP_HOST="$(client_host "${MEDIA_SERVER_VERIFY_RULE_UI_HTTP_HOST:-${MEDIA_SERVER_VERIFY_HOST:-${HTTP_ADDRESS}}}")"
HTTP_BASE="${MEDIA_SERVER_VERIFY_RULE_UI_HTTP_BASE:-http://${HTTP_HOST}:${HTTP_PORT}}"
DEBUG_PORT="${MEDIA_SERVER_VERIFY_RULE_UI_DEBUG_PORT:-9245}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --http-base)
      HTTP_BASE="$2"
      shift
      ;;
    --debug-port)
      DEBUG_PORT="$2"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "알 수 없는 verify-rule-ui 옵션입니다: $1"
      echo
      usage
      exit 1
      ;;
  esac
  shift
done

require_cmd curl
require_cmd node

log_info "http_base=${HTTP_BASE}"
if ! curl -fsS --max-time 3 "${HTTP_BASE}/health" >/dev/null; then
  log_fail "HTTP health check 실패: ${HTTP_BASE}/health"
  exit 1
fi
log_pass "HTTP health ok"

if curl -fsS "${HTTP_BASE}/lab/analysis/capabilities" > "${CAPABILITIES_FILE}" &&
   node - "${CAPABILITIES_FILE}" <<'JS'
const fs = require("node:fs");
const payload = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const expected = ["person", "vehicle", "road", "animal", "sports", "tableware", "food", "furniture", "device", "object"];
const categories = Array.isArray(payload.trackingCategories) ? payload.trackingCategories : [];
const values = categories.map((item) => item.value);
if (JSON.stringify(values) !== JSON.stringify(expected)) {
  throw new Error(`trackingCategories mismatch: ${JSON.stringify(values)}`);
}
for (const item of categories) {
  if (!item.label || !Array.isArray(item.labels) || !Array.isArray(item.displayLabels)) {
    throw new Error(`category schema mismatch: ${JSON.stringify(item)}`);
  }
}
JS
then
  log_pass "capabilities category catalog 확인"
else
  log_fail "capabilities category catalog 확인 실패"
  sed -n '1,120p' "${CAPABILITIES_FILE}" | sed 's/^/[api] /'
fi

if node "${SCRIPT_DIR}/rule_ui_smoke_check.mjs" \
  --http-base "${HTTP_BASE}" \
  --page-path "/lab/rules" \
  --debug-port "${DEBUG_PORT}" \
  > "${BROWSER_LOG}" 2>&1; then
  log_pass "Rule/Profile UI 버튼과 payload 확인"
  sed -n '1,80p' "${BROWSER_LOG}" | sed 's/^/[browser] /'
else
  log_fail "Rule/Profile UI smoke 검증 실패"
  sed -n '1,160p' "${BROWSER_LOG}" | sed 's/^/[browser] /'
fi

invalid_rule_status="$(curl -sS -o "${INVALID_RULE_FILE}" -w '%{http_code}' \
  -X PUT "${HTTP_BASE}/lab/analysis/rules/${RUN_ID}-invalid-empty-classes" \
  -H 'Content-Type: application/json' \
  --data "{\"id\":\"${RUN_ID}-invalid-empty-classes\",\"priority\":1,\"enabled\":true,\"match\":{\"sourceKind\":\"file\",\"route\":\"http\"},\"analysis\":{\"classes\":[]},\"event\":{\"type\":\"presence\",\"minConfidence\":0.2,\"region\":{\"type\":\"polygon\",\"points\":[{\"x\":0.0,\"y\":0.0},{\"x\":1.0,\"y\":0.0},{\"x\":1.0,\"y\":1.0},{\"x\":0.0,\"y\":1.0}]}},\"eventActions\":{\"highlight\":{\"enabled\":true,\"mode\":\"blink\",\"target\":\"matched-object\",\"durationMs\":1200,\"color\":\"#ff0000\"},\"post\":{\"enabled\":false,\"method\":\"POST\",\"url\":\"\",\"payloadFormat\":\"media-server.va.event.v1\"}}}" || true)"
if [[ "${invalid_rule_status}" == "400" ]] && grep -q "analysis.classes" "${INVALID_RULE_FILE}"; then
  log_pass "빈 Rule category API 저장 차단 확인"
else
  log_fail "빈 Rule category API 저장 차단 실패: status=${invalid_rule_status}"
  sed -n '1,80p' "${INVALID_RULE_FILE}" | sed 's/^/[api] /'
fi

invalid_profile_status="$(curl -sS -o "${INVALID_PROFILE_FILE}" -w '%{http_code}' \
  -X PUT "${HTTP_BASE}/lab/analysis/profiles/${RUN_ID}-invalid-empty-tracking" \
  -H 'Content-Type: application/json' \
  --data "{\"id\":\"${RUN_ID}-invalid-empty-tracking\",\"detector\":\"dummy\",\"fps\":5,\"maxQueue\":1,\"trackingClasses\":[]}" || true)"
if [[ "${invalid_profile_status}" == "400" ]] && grep -q "trackingClasses" "${INVALID_PROFILE_FILE}"; then
  log_pass "빈 Profile tracking category API 저장 차단 확인"
else
  log_fail "빈 Profile tracking category API 저장 차단 실패: status=${invalid_profile_status}"
  sed -n '1,80p' "${INVALID_PROFILE_FILE}" | sed 's/^/[api] /'
fi

echo
echo "== Rule/Profile UI smoke 검증 요약 =="
echo "- 통과: ${PASS_COUNT}"
echo "- 실패: ${FAIL_COUNT}"
echo "- 건너뜀: ${SKIP_COUNT}"
echo "- browser log: ${BROWSER_LOG}"
echo "- capabilities: ${CAPABILITIES_FILE}"

if (( FAIL_COUNT > 0 )); then
  exit 1
fi
