#!/usr/bin/env bash
# 파일 용도: 실제 영상 샘플에서 VA event rule 카테고리 토큰별 presence 이벤트가 발생하는지 확인한다.
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
TAP_IDS=()
RULE_IDS=()
RUN_ID="vacat-$(date +%s)-$$"
EVENTS_FILE="/tmp/media_server_${RUN_ID}_events.ndjson"
SNAPSHOT_FILE="/tmp/media_server_${RUN_ID}_snapshot.json"

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

# 현재 샘플 한계로 제외한 검증 항목을 세고 로그로 남긴다.
log_skip() {
  echo "[skip] $*"
  SKIP_COUNT=$((SKIP_COUNT + 1))
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

# 파일 토큰을 query parameter에 안전하게 넣도록 URL 인코딩한다.
urlencode_file_token() {
  python3 - "$1" <<'PY'
import sys
import urllib.parse

print(urllib.parse.quote(sys.argv[1], safe="/._-"))
PY
}

# 검증 중 생성한 tap/rule 문서를 종료 시 정리한다.
cleanup_runtime_documents() {
  for tap_id in "${TAP_IDS[@]:-}"; do
    [[ -n "${tap_id}" ]] || continue
    curl -fsS -X DELETE "${HTTP_BASE}/lab/analysis/taps/${tap_id}" >/dev/null 2>&1 || true
  done
  for rule_id in "${RULE_IDS[@]:-}"; do
    [[ -n "${rule_id}" ]] || continue
    curl -fsS -X DELETE "${HTTP_BASE}/lab/analysis/rules/${rule_id}" >/dev/null 2>&1 || true
  done
}
trap cleanup_runtime_documents EXIT

# verify-va-category-samples 사용법을 출력한다.
usage() {
  cat <<'EOF_USAGE'
VA 카테고리 영상 샘플 검증

Usage:
  ./server.sh verify-va-category-samples [options]

Options:
  --file <token>       video root 기준 샘플 파일. 기본 va_four_scene_sample.mp4
  --sports-file <token> sports category 검증용 샘플 파일. 기본 va_sports_sample.mp4
  --duration <seconds> polling 시간. 기본 20
  --interval <seconds> polling 간격. 기본 0.25
  --include-sports     sports category hard fail 검증을 켠다. 기본 켜짐
  --no-sports          sports category hard fail 검증을 끈다
  -h, --help           도움말 출력

환경 변수:
  MEDIA_SERVER_VERIFY_VA_CATEGORY_FILE
  MEDIA_SERVER_VERIFY_VA_CATEGORY_SPORTS_FILE
  MEDIA_SERVER_VERIFY_VA_CATEGORY_DURATION_S
  MEDIA_SERVER_VERIFY_VA_CATEGORY_INTERVAL_S
EOF_USAGE
}

require_cmd curl
require_cmd python3

HTTP_PORT="$(resolve_port "${MEDIA_SERVER_HTTP_LISTEN_PORT:-}" "kHttpListenPort" "8080")"
HTTP_ADDRESS="${MEDIA_SERVER_HTTP_LISTEN_ADDRESS:-$(media_server_read_const_charp "${STD_AFX}" "kHttpListenAddress" || true)}"
HTTP_HOST="$(client_host "${MEDIA_SERVER_VERIFY_VA_CATEGORY_HTTP_HOST:-${MEDIA_SERVER_VERIFY_HOST:-${HTTP_ADDRESS}}}")"
HTTP_BASE="${MEDIA_SERVER_VERIFY_VA_CATEGORY_HTTP_BASE:-http://${HTTP_HOST}:${HTTP_PORT}}"
FILE_TOKEN="${MEDIA_SERVER_VERIFY_VA_CATEGORY_FILE:-va_four_scene_sample.mp4}"
SPORTS_FILE_TOKEN="${MEDIA_SERVER_VERIFY_VA_CATEGORY_SPORTS_FILE:-va_sports_sample.mp4}"
FILE_ROOT="${MEDIA_SERVER_FILE_ROOT:-$(media_server_read_const_charp "${STD_AFX}" "kFileRootPath" || true)}"
FILE_ROOT="$(media_server_resolve_project_path "${ROOT_DIR}" "${FILE_ROOT:-video}")"
DURATION_S="${MEDIA_SERVER_VERIFY_VA_CATEGORY_DURATION_S:-20}"
INTERVAL_S="${MEDIA_SERVER_VERIFY_VA_CATEGORY_INTERVAL_S:-0.25}"
INCLUDE_SPORTS="${MEDIA_SERVER_VERIFY_VA_CATEGORY_INCLUDE_SPORTS:-1}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --file)
      FILE_TOKEN="$2"
      shift
      ;;
    --sports-file)
      SPORTS_FILE_TOKEN="$2"
      shift
      ;;
    --duration)
      DURATION_S="$2"
      shift
      ;;
    --interval)
      INTERVAL_S="$2"
      shift
      ;;
    --include-sports)
      INCLUDE_SPORTS=1
      ;;
    --no-sports)
      INCLUDE_SPORTS=0
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "알 수 없는 verify-va-category-samples 옵션입니다: $1"
      echo
      usage
      exit 1
      ;;
  esac
  shift
done

LOCAL_FILE="${FILE_ROOT}/${FILE_TOKEN}"
SPORTS_LOCAL_FILE="${FILE_ROOT}/${SPORTS_FILE_TOKEN}"
POLL_COUNT="$(python3 - "${DURATION_S}" "${INTERVAL_S}" <<'PY'
import math
import sys

duration = float(sys.argv[1])
interval = float(sys.argv[2])
print(max(1, int(math.ceil(duration / interval))))
PY
)"

log_info "http_base=${HTTP_BASE}"
log_info "file=${FILE_TOKEN}"
log_info "local_file=${LOCAL_FILE}"
if [[ "${INCLUDE_SPORTS}" == "1" ]]; then
  log_info "sports_file=${SPORTS_FILE_TOKEN}"
  log_info "sports_local_file=${SPORTS_LOCAL_FILE}"
fi
log_info "poll=${POLL_COUNT} interval=${INTERVAL_S}s"

if [[ ! -f "${LOCAL_FILE}" ]]; then
  log_fail "VA 카테고리 샘플 영상이 없습니다: ${LOCAL_FILE}"
  exit 1
fi
if [[ "${INCLUDE_SPORTS}" == "1" && ! -f "${SPORTS_LOCAL_FILE}" ]]; then
  log_fail "VA sports 카테고리 샘플 영상이 없습니다: ${SPORTS_LOCAL_FILE}"
  exit 1
fi

if ! curl -fsS --max-time 3 "${HTTP_BASE}/health" >/dev/null; then
  log_fail "HTTP health check 실패: ${HTTP_BASE}/health"
  exit 1
fi
log_pass "HTTP health ok"

# category token별 presence rule을 임시로 저장한다.
create_category_rule() {
  local category="$1"
  local rule_id="${RUN_ID}-${category}"
  RULE_IDS+=("${rule_id}")
  curl -fsS -X PUT "${HTTP_BASE}/lab/analysis/rules/${rule_id}" \
    -H 'Content-Type: application/json' \
    --data "{\"id\":\"${rule_id}\",\"priority\":80,\"enabled\":true,\"match\":{\"sourceKind\":\"file\",\"route\":\"http\"},\"analysis\":{\"classes\":[\"${category}\"]},\"event\":{\"type\":\"presence\",\"minConfidence\":0.20,\"region\":{\"type\":\"polygon\",\"points\":[{\"x\":0.0,\"y\":0.0},{\"x\":1.0,\"y\":0.0},{\"x\":1.0,\"y\":1.0},{\"x\":0.0,\"y\":1.0}]}},\"eventActions\":{\"highlight\":{\"enabled\":true,\"mode\":\"blink\",\"target\":\"matched-object\",\"durationMs\":1200,\"color\":\"#ff0000\"},\"post\":{\"enabled\":false,\"method\":\"POST\",\"url\":\"\",\"payloadFormat\":\"media-server.va.event.v1\"}}}" \
    >/dev/null
  log_pass "category rule 저장: ${category}"
}

CATEGORIES=(person vehicle road animal tableware food furniture device object)
if [[ "${INCLUDE_SPORTS}" == "1" ]]; then
  CATEGORIES+=(sports)
else
  log_skip "sports category 영상 샘플 검증을 옵션으로 제외했습니다."
fi

for category in "${CATEGORIES[@]}"; do
  create_category_rule "${category}"
done

: > "${EVENTS_FILE}"

# 지정된 영상 token으로 analysis tap을 생성하고 이벤트를 누적 수집한다.
collect_category_events() {
  local file_token="$1"
  local encoded_file
  local tap_response
  local tap_id
  encoded_file="$(urlencode_file_token "${file_token}")"
  tap_response="$(curl -fsS -X POST "${HTTP_BASE}/lab/analysis/taps?file=${encoded_file}&va=1&fps=5&maxQueue=1&tracking=1&trackingClasses=$(urlencode_file_token "*")")"
  tap_id="$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("tapId",""))' <<<"${tap_response}")"
  if [[ -z "${tap_id}" ]]; then
    log_fail "analysis tap 생성 실패: ${file_token}"
    echo "${tap_response}" | sed 's/^/  /'
    exit 1
  fi
  TAP_IDS+=("${tap_id}")
  log_pass "analysis tap 생성: ${tap_id} (${file_token})"

  for _ in $(seq 1 "${POLL_COUNT}"); do
    sleep "${INTERVAL_S}"
    curl -fsS "${HTTP_BASE}/lab/analysis/taps/${tap_id}/events" >> "${EVENTS_FILE}"
    printf '\n' >> "${EVENTS_FILE}"
  done
  curl -fsS "${HTTP_BASE}/lab/analysis/taps/${tap_id}" > "${SNAPSHOT_FILE}"
  curl -fsS -X DELETE "${HTTP_BASE}/lab/analysis/taps/${tap_id}" >/dev/null 2>&1 || true
}

collect_category_events "${FILE_TOKEN}"
if [[ "${INCLUDE_SPORTS}" == "1" ]]; then
  collect_category_events "${SPORTS_FILE_TOKEN}"
fi

python3 - "${EVENTS_FILE}" "${SNAPSHOT_FILE}" "${RUN_ID}" "${CATEGORIES[@]}" <<'PY'
import collections
import json
import pathlib
import sys

events_file = pathlib.Path(sys.argv[1])
snapshot_file = pathlib.Path(sys.argv[2])
run_id = sys.argv[3]
categories = sys.argv[4:]
counts = collections.Counter()
labels_by_category = collections.defaultdict(set)

for line in events_file.read_text().splitlines():
    if not line.strip():
        continue
    payload = json.loads(line)
    for event in payload.get("events", []):
        rule_id = str(event.get("ruleId") or "")
        if not rule_id.startswith(run_id + "-"):
            continue
        category = rule_id.removeprefix(run_id + "-")
        obj = event.get("object") or {}
        counts[category] += 1
        if obj.get("label"):
            labels_by_category[category].add(str(obj.get("label")))

snapshot = json.loads(snapshot_file.read_text()).get("tap") or {}
latest = snapshot.get("latestResult") or {}
print("category_event_counts=", dict(counts))
print("category_labels=", {key: sorted(value) for key, value in labels_by_category.items()})
print("snapshot_detections=", len(latest.get("detections") or []), "analyzed=", snapshot.get("analyzedPackets", 0))

errors = []
for category in categories:
    if counts.get(category, 0) <= 0:
        errors.append(f"{category} category presence 이벤트가 없습니다")
if snapshot.get("analyzedPackets", 0) <= 0:
    errors.append("analysis tap이 frame을 분석하지 못했습니다")

if errors:
    for error in errors:
        print("[fail]", error)
    raise SystemExit(1)
PY
log_pass "카테고리별 presence 이벤트 확인"
log_info "events_log=${EVENTS_FILE}"

echo
echo "== VA 카테고리 영상 샘플 검증 요약 =="
echo "- 통과: ${PASS_COUNT}"
echo "- 실패: ${FAIL_COUNT}"
echo "- 건너뜀: ${SKIP_COUNT}"
echo "- events: ${EVENTS_FILE}"
echo "- snapshot: ${SNAPSHOT_FILE}"

if (( FAIL_COUNT > 0 )); then
  exit 1
fi
