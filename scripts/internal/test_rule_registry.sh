#!/usr/bin/env bash
# 파일 용도: 선택 테스트용 profile/rule registry API smoke test를 수행한다. 기본 통합 테스트에는 포함하지 않는다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
source "${SCRIPT_DIR}/env_common.sh"
source "${SCRIPT_DIR}/numeric_id_helpers.sh"
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

BASE_ID="$(media_server_numeric_id_base \
  "rule registry id base" \
  "${MEDIA_SERVER_VERIFY_RULE_REGISTRY_ID_BASE:-}" \
  "$(( (($(date +%s) % 1000000) * 1000) + ($$ % 1000) ))")"
PROFILE_ID="$(media_server_numeric_id_at "rule registry profile id" "${BASE_ID}" 11)"
ALT_PROFILE_ID="$(media_server_numeric_id_at "rule registry alt profile id" "${BASE_ID}" 12)"
RULE_ID="$(media_server_numeric_id_at "rule registry rule id" "${BASE_ID}" 21)"
ALT_RULE_ID="$(media_server_numeric_id_at "rule registry alt rule id" "${BASE_ID}" 22)"
AUTO_TAP_ID=""
VA_FILE="${MEDIA_SERVER_VERIFY_VA_FILE:-va_four_scene_sample.mp4}"

cleanup() {
  if [[ -n "${AUTO_TAP_ID}" ]]; then
    curl -fsS -X DELETE "${HTTP_BASE}/lab/analysis/taps/${AUTO_TAP_ID}" >/dev/null 2>&1 || true
  fi
  curl -fsS -X DELETE "${HTTP_BASE}/lab/analysis/rules/${ALT_RULE_ID}" >/dev/null 2>&1 || true
  curl -fsS -X DELETE "${HTTP_BASE}/lab/analysis/rules/${RULE_ID}" >/dev/null 2>&1 || true
  curl -fsS -X DELETE "${HTTP_BASE}/lab/analysis/profiles/${ALT_PROFILE_ID}" >/dev/null 2>&1 || true
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

PROFILE_JSON="{\"id\":\"${PROFILE_ID}\",\"detector\":\"dummy\",\"fps\":5,\"maxQueue\":2,\"confidence\":0.25,\"nms\":0.45,\"adaptive\":false,\"trackingClasses\":[\"person\",\"vehicle\"]}"
ALT_PROFILE_JSON="{\"id\":\"${ALT_PROFILE_ID}\",\"detector\":\"dummy\",\"fps\":11,\"maxQueue\":1,\"confidence\":0.25,\"nms\":0.45,\"adaptive\":false,\"trackingClasses\":[\"person\",\"vehicle\"]}"
RULE_JSON="{\"id\":\"${RULE_ID}\",\"priority\":50,\"enabled\":true,\"match\":{\"sourceKind\":\"file\",\"route\":\"*\"},\"analysis\":{\"profileId\":\"${PROFILE_ID}\",\"classes\":[\"person\",\"vehicle\"]},\"event\":{\"type\":\"presence\",\"classes\":[\"person\",\"car\"]},\"region\":{\"type\":\"polygon\",\"points\":[{\"x\":0.05,\"y\":0.05},{\"x\":0.95,\"y\":0.05},{\"x\":0.95,\"y\":0.95},{\"x\":0.05,\"y\":0.95}]},\"outputs\":{\"overlay\":true},\"eventActions\":{\"highlight\":{\"enabled\":true,\"mode\":\"blink\",\"target\":\"matched-object\"},\"post\":{\"enabled\":false,\"method\":\"POST\",\"url\":\"\",\"payloadFormat\":\"media-server.va.event.v1\"}}}"
ALT_RULE_JSON="{\"id\":\"${ALT_RULE_ID}\",\"priority\":0,\"enabled\":true,\"match\":{\"sourceKind\":\"file\",\"route\":\"http\"},\"analysis\":{\"profileId\":\"${ALT_PROFILE_ID}\",\"classes\":[\"person\",\"vehicle\"]},\"event\":{\"type\":\"presence\",\"classes\":[\"person\",\"car\"]},\"region\":{\"type\":\"polygon\",\"points\":[{\"x\":0.05,\"y\":0.05},{\"x\":0.95,\"y\":0.05},{\"x\":0.95,\"y\":0.95},{\"x\":0.05,\"y\":0.95}]},\"outputs\":{\"overlay\":true},\"eventActions\":{\"highlight\":{\"enabled\":true,\"mode\":\"blink\",\"target\":\"matched-object\"},\"post\":{\"enabled\":false,\"method\":\"POST\",\"url\":\"\",\"payloadFormat\":\"media-server.va.event.v1\"}}}"

curl -fsS -X PUT "${HTTP_BASE}/lab/analysis/profiles/${PROFILE_ID}" \
  -H 'Content-Type: application/json' \
  --data "${PROFILE_JSON}" >/tmp/media_server_rule_profile_put.json
echo "[통과] profile 저장: ${PROFILE_ID}"

curl -fsS -X PUT "${HTTP_BASE}/lab/analysis/profiles/${ALT_PROFILE_ID}" \
  -H 'Content-Type: application/json' \
  --data "${ALT_PROFILE_JSON}" >/tmp/media_server_rule_alt_profile_put.json
echo "[통과] 보조 profile 저장: ${ALT_PROFILE_ID}"

curl -fsS "${HTTP_BASE}/lab/analysis/profiles/${PROFILE_ID}" >/tmp/media_server_rule_profile_get.json
python3 - "${PROFILE_ID}" /tmp/media_server_rule_profile_get.json <<'PY'
import json
import pathlib
import sys

expected = sys.argv[1]
payload = json.loads(pathlib.Path(sys.argv[2]).read_text())
payload = payload.get("profile", payload)
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

curl -fsS -X PUT "${HTTP_BASE}/lab/analysis/rules/${ALT_RULE_ID}" \
  -H 'Content-Type: application/json' \
  --data "${ALT_RULE_JSON}" >/tmp/media_server_rule_alt_put.json
echo "[통과] 보조 rule 저장: ${ALT_RULE_ID}"

curl -fsS "${HTTP_BASE}/lab/analysis/rules/${RULE_ID}" >/tmp/media_server_rule_get.json
python3 - "${RULE_ID}" "${PROFILE_ID}" /tmp/media_server_rule_get.json <<'PY'
import json
import pathlib
import sys

expected_rule = sys.argv[1]
expected_profile = sys.argv[2]
payload = json.loads(pathlib.Path(sys.argv[3]).read_text())
payload = payload.get("rule", payload)
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

ENCODED_VA_FILE="$(python3 - "${VA_FILE}" <<'PY'
import sys
import urllib.parse

print(urllib.parse.quote(sys.argv[1], safe="/._-"))
PY
)"
curl -fsS -X POST "${HTTP_BASE}/lab/analysis/taps?file=${ENCODED_VA_FILE}&va=1" \
  >/tmp/media_server_rule_auto_tap.json
AUTO_TAP_ID="$(python3 - /tmp/media_server_rule_auto_tap.json <<'PY'
import json
import pathlib
import sys

payload = json.loads(pathlib.Path(sys.argv[1]).read_text())
tap_id = payload.get("tapId")
if not tap_id:
    raise SystemExit("tapId missing")
print(tap_id)
PY
)"
sleep 2
curl -fsS "${HTTP_BASE}/lab/analysis/taps/${AUTO_TAP_ID}" >/tmp/media_server_rule_auto_snapshot.json
curl -fsS "${HTTP_BASE}/lab/analysis/taps" >/tmp/media_server_rule_auto_taps.json
python3 - "${PROFILE_ID}" "${RULE_ID}" "${AUTO_TAP_ID}" /tmp/media_server_rule_auto_snapshot.json /tmp/media_server_rule_auto_taps.json <<'PY'
import json
import pathlib
import sys

expected_profile = sys.argv[1]
expected_rule = sys.argv[2]
expected_tap = sys.argv[3]
payload = json.loads(pathlib.Path(sys.argv[4]).read_text())
list_payload = json.loads(pathlib.Path(sys.argv[5]).read_text())
tap = payload.get("tap") or {}
profile_key = tap.get("profileKey", "")
if not profile_key.startswith(expected_profile + ":"):
    raise SystemExit(f"auto profile not applied: {profile_key}")
if tap.get("detectorType") != "dummy":
    raise SystemExit(f"auto profile detector mismatch: {tap.get('detectorType')}")
if tap.get("targetFps") != 5:
    raise SystemExit(f"auto profile fps mismatch: {tap.get('targetFps')}")
if tap.get("maxQueueSize") != 2:
    raise SystemExit(f"auto profile queue mismatch: {tap.get('maxQueueSize')}")
selection = tap.get("profileSelection") or {}
if selection.get("source") != "rule":
    raise SystemExit(f"profile selection source mismatch: {selection}")
if selection.get("ruleId") != expected_rule:
    raise SystemExit(f"profile selection rule mismatch: {selection}")
if selection.get("priority") != 50:
    raise SystemExit(f"profile selection priority mismatch: {selection}")
if not any((item.get("tapId") == expected_tap and item.get("profileKey", "").startswith(expected_profile + ":"))
           for item in list_payload.get("taps", [])):
    raise SystemExit("active taps list does not include the auto profile tap")
PY
echo "[통과] priority 기반 profile 자동 선택 및 active tap 목록 검증"

curl -fsS -X DELETE "${HTTP_BASE}/lab/analysis/taps/${AUTO_TAP_ID}" >/dev/null
AUTO_TAP_ID=""
echo "[통과] analysis tap 삭제"

curl -fsS -X DELETE "${HTTP_BASE}/lab/analysis/rules/${ALT_RULE_ID}" >/dev/null
echo "[통과] 보조 rule 삭제"

curl -fsS -X DELETE "${HTTP_BASE}/lab/analysis/rules/${RULE_ID}" >/dev/null
echo "[통과] rule 삭제"

curl -fsS -X DELETE "${HTTP_BASE}/lab/analysis/profiles/${ALT_PROFILE_ID}" >/dev/null
echo "[통과] 보조 profile 삭제"

curl -fsS -X DELETE "${HTTP_BASE}/lab/analysis/profiles/${PROFILE_ID}" >/dev/null
echo "[통과] profile 삭제"

trap - EXIT
echo "[완료] profile/rule registry 선택 테스트 통과"
