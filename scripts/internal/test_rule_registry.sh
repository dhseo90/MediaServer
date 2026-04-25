#!/usr/bin/env bash
# 파일 용도: 선택 테스트용 profile/rule registry API smoke test를 수행한다. 기본 통합 테스트에는 포함하지 않는다.
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

client_host() {
  local value="$1"
  if [[ -z "${value}" || "${value}" == "0.0.0.0" || "${value}" == "::" ]]; then
    printf '127.0.0.1'
  else
    printf '%s' "${value}"
  fi
}

HTTP_PORT="$(resolve_port "${MEDIA_SERVER_HTTP_LISTEN_PORT:-}" "kHttpListenPort" "8080")"
HTTP_ADDRESS="${MEDIA_SERVER_HTTP_LISTEN_ADDRESS:-$(media_server_read_const_charp "${STD_AFX}" "kHttpListenAddress" || true)}"
HTTP_HOST="$(client_host "${MEDIA_SERVER_TEST_HTTP_HOST:-${HTTP_ADDRESS}}")"
HTTP_BASE="${MEDIA_SERVER_TEST_HTTP_BASE:-http://${HTTP_HOST}:${HTTP_PORT}}"

PROFILE_ID="test-profile-$(date +%s)-$$"
RULE_ID="test-rule-$(date +%s)-$$"

cleanup() {
  curl -fsS -X DELETE "${HTTP_BASE}/lab/analysis/rules/${RULE_ID}" >/dev/null 2>&1 || true
  curl -fsS -X DELETE "${HTTP_BASE}/lab/analysis/profiles/${PROFILE_ID}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "[실패] 필수 도구가 없습니다: $1"
    exit 1
  fi
}

require_cmd curl
require_cmd python3

echo "[정보] HTTP_BASE=${HTTP_BASE}"

if ! curl -fsS --max-time 3 "${HTTP_BASE}/health" >/dev/null; then
  echo "[실패] HTTP health check 실패: ${HTTP_BASE}/health"
  exit 1
fi
echo "[통과] HTTP health ok"

PROFILE_JSON="{\"id\":\"${PROFILE_ID}\",\"detector\":\"dummy\",\"fps\":5,\"maxQueue\":2,\"confidence\":0.25,\"nms\":0.45,\"adaptive\":true}"
RULE_JSON="{\"id\":\"${RULE_ID}\",\"enabled\":true,\"match\":{\"sourceKind\":\"file\",\"route\":\"*\"},\"analysis\":{\"profileId\":\"${PROFILE_ID}\"},\"event\":{\"type\":\"presence\",\"classes\":[\"person\",\"car\"]},\"region\":{\"type\":\"polygon\",\"points\":[{\"x\":0.05,\"y\":0.05},{\"x\":0.95,\"y\":0.05},{\"x\":0.95,\"y\":0.95},{\"x\":0.05,\"y\":0.95}]},\"outputs\":{\"overlay\":true},\"eventActions\":{\"highlight\":{\"enabled\":true,\"mode\":\"blink\",\"target\":\"matched-object\"},\"post\":{\"enabled\":false,\"method\":\"POST\",\"url\":\"\",\"payloadFormat\":\"media-server.va.event.v1\"}}}"

curl -fsS -X PUT "${HTTP_BASE}/lab/analysis/profiles/${PROFILE_ID}" \
  -H 'Content-Type: application/json' \
  --data "${PROFILE_JSON}" >/tmp/media_server_rule_profile_put.json
echo "[통과] profile 저장: ${PROFILE_ID}"

curl -fsS "${HTTP_BASE}/lab/analysis/profiles/${PROFILE_ID}" >/tmp/media_server_rule_profile_get.json
python3 - "${PROFILE_ID}" /tmp/media_server_rule_profile_get.json <<'PY'
import json
import pathlib
import sys

expected = sys.argv[1]
payload = json.loads(pathlib.Path(sys.argv[2]).read_text())
if payload.get("id") != expected:
    raise SystemExit(f"profile id mismatch: {payload.get('id')} != {expected}")
if payload.get("detector") != "dummy":
    raise SystemExit("profile detector mismatch")
PY
echo "[통과] profile 조회 검증"

curl -fsS -X PUT "${HTTP_BASE}/lab/analysis/rules/${RULE_ID}" \
  -H 'Content-Type: application/json' \
  --data "${RULE_JSON}" >/tmp/media_server_rule_put.json
echo "[통과] rule 저장: ${RULE_ID}"

curl -fsS "${HTTP_BASE}/lab/analysis/rules/${RULE_ID}" >/tmp/media_server_rule_get.json
python3 - "${RULE_ID}" "${PROFILE_ID}" /tmp/media_server_rule_get.json <<'PY'
import json
import pathlib
import sys

expected_rule = sys.argv[1]
expected_profile = sys.argv[2]
payload = json.loads(pathlib.Path(sys.argv[3]).read_text())
if payload.get("id") != expected_rule:
    raise SystemExit(f"rule id mismatch: {payload.get('id')} != {expected_rule}")
if not payload.get("enabled", False):
    raise SystemExit("rule is not enabled")
analysis = payload.get("analysis") or {}
if analysis.get("profileId") != expected_profile:
    raise SystemExit("rule profileId mismatch")
event = payload.get("event") or {}
if event.get("type") != "presence":
    raise SystemExit("rule event type mismatch")
actions = payload.get("eventActions") or {}
highlight = actions.get("highlight") or {}
post = actions.get("post") or {}
if highlight.get("mode") != "blink":
    raise SystemExit("rule highlight mode mismatch")
if post.get("payloadFormat") != "media-server.va.event.v1":
    raise SystemExit("rule POST payload format mismatch")
PY
echo "[통과] rule 조회 검증"

curl -fsS -X DELETE "${HTTP_BASE}/lab/analysis/rules/${RULE_ID}" >/dev/null
echo "[통과] rule 삭제"

curl -fsS -X DELETE "${HTTP_BASE}/lab/analysis/profiles/${PROFILE_ID}" >/dev/null
echo "[통과] profile 삭제"

trap - EXIT
echo "[완료] profile/rule registry 선택 테스트 통과"
