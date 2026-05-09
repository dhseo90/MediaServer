#!/usr/bin/env bash
# 파일 용도: 이동 테스트 영상으로 tracker 기반 presence/enter/exit/line-crossing 이벤트를 자동 검증한다.
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
TAP_ID=""
RULE_IDS=()
LONG_MODE=0

log_info() {
  echo "[info] $*"
}

log_pass() {
  echo "[pass] $*"
  PASS_COUNT=$((PASS_COUNT + 1))
}

log_fail() {
  echo "[fail] $*"
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

log_skip() {
  echo "[skip] $*"
  SKIP_COUNT=$((SKIP_COUNT + 1))
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    log_fail "필수 도구가 없습니다: $1"
    exit 1
  fi
}

usage() {
  cat <<'EOF_USAGE'
VA tracking event 검증

Usage:
  ./server.sh verify-va-events [options]

Options:
  --long                 장시간 검증 기본값 적용: slow long 영상, duration=120s
  --duration <seconds>   polling 시간을 초 단위로 지정. poll-count보다 우선
  --poll-count <count>   polling 횟수. 기본 180
  --interval <seconds>   polling 간격. 기본 0.2
  --file <token>         video root 기준 이동 테스트 파일 token
  -h, --help             도움말 출력

환경 변수:
  MEDIA_SERVER_VERIFY_VA_EVENTS_FILE
  MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S
  MEDIA_SERVER_VERIFY_VA_EVENTS_POLL_COUNT
  MEDIA_SERVER_VERIFY_VA_EVENTS_POLL_INTERVAL_S
EOF_USAGE
}

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

urlencode_file_token() {
  python3 - "$1" <<'PY'
import sys
import urllib.parse

print(urllib.parse.quote(sys.argv[1], safe="/._-"))
PY
}

cleanup_runtime_documents() {
  # 파일은 삭제하지 않는다. 테스트 중 서버 registry에 만든 runtime 문서/tap만 API로 정리한다.
  if [[ -n "${TAP_ID}" ]]; then
    curl -fsS -X DELETE "${HTTP_BASE}/lab/analysis/taps/${TAP_ID}" >/dev/null 2>&1 || true
  fi
  for rule_id in "${RULE_IDS[@]:-}"; do
    [[ -n "${rule_id}" ]] || continue
    curl -fsS -X DELETE "${HTTP_BASE}/lab/analysis/rules/${rule_id}" >/dev/null 2>&1 || true
  done
}
trap cleanup_runtime_documents EXIT

require_cmd curl
require_cmd python3

HTTP_PORT="$(resolve_port "${MEDIA_SERVER_HTTP_LISTEN_PORT:-}" "kHttpListenPort" "8080")"
HTTP_ADDRESS="${MEDIA_SERVER_HTTP_LISTEN_ADDRESS:-$(media_server_read_const_charp "${STD_AFX}" "kHttpListenAddress" || true)}"
HTTP_HOST="$(client_host "${MEDIA_SERVER_VERIFY_VA_HTTP_HOST:-${MEDIA_SERVER_VERIFY_HOST:-${HTTP_ADDRESS}}}")"
HTTP_BASE="${MEDIA_SERVER_VERIFY_VA_HTTP_BASE:-http://${HTTP_HOST}:${HTTP_PORT}}"
FILE_TOKEN="${MEDIA_SERVER_VERIFY_VA_EVENTS_FILE:-imports/va_tracking_event_1280x720_30fps_h264.mp4}"
FILE_ROOT="${MEDIA_SERVER_FILE_ROOT:-$(media_server_read_const_charp "${STD_AFX}" "kFileRootPath" || true)}"
FILE_ROOT="$(media_server_resolve_project_path "${ROOT_DIR}" "${FILE_ROOT:-video}")"
LOCAL_FILE="${FILE_ROOT}/${FILE_TOKEN}"
POLL_COUNT="${MEDIA_SERVER_VERIFY_VA_EVENTS_POLL_COUNT:-180}"
POLL_INTERVAL_S="${MEDIA_SERVER_VERIFY_VA_EVENTS_POLL_INTERVAL_S:-0.2}"
MIN_PRESENCE="${MEDIA_SERVER_VERIFY_VA_EVENTS_MIN_PRESENCE:-1}"
MIN_ENTER="${MEDIA_SERVER_VERIFY_VA_EVENTS_MIN_ENTER:-1}"
MIN_EXIT="${MEDIA_SERVER_VERIFY_VA_EVENTS_MIN_EXIT:-1}"
MIN_LINE="${MEDIA_SERVER_VERIFY_VA_EVENTS_MIN_LINE:-2}"
MIN_UNIQUE_TRACKS="${MEDIA_SERVER_VERIFY_VA_EVENTS_MIN_TRACKS:-3}"
RUN_ID="vaevt-$(date +%s)-$$"
RULE_ID_BASE="${MEDIA_SERVER_VERIFY_VA_EVENTS_RULE_ID_BASE:-$((9400 + ($$ % 30) * 12))}"
RULE_ID_COUNTER=0
NEXT_RULE_ID=""
RULE_MAP_FILE="/tmp/media_server_${RUN_ID}_rules.tsv"
EVENTS_FILE="/tmp/media_server_${RUN_ID}_events.ndjson"
SNAPSHOT_FILE="/tmp/media_server_${RUN_ID}_snapshot.json"
TAPS_FILE="/tmp/media_server_${RUN_ID}_taps.json"
OVERLAY_FILE="${MEDIA_SERVER_VERIFY_VA_EVENTS_OVERLAY_FILE:-/tmp/media_server_${RUN_ID}_overlay.jpg}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --long)
      LONG_MODE=1
      ;;
    --duration)
      DURATION_S="$2"
      shift
      ;;
    --poll-count)
      POLL_COUNT="$2"
      shift
      ;;
    --interval)
      POLL_INTERVAL_S="$2"
      shift
      ;;
    --file)
      FILE_TOKEN="$2"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "알 수 없는 verify-va-events 옵션입니다: $1"
      echo
      usage
      exit 1
      ;;
  esac
  shift
done

if [[ "${LONG_MODE}" == "1" && "${FILE_TOKEN}" == "imports/va_tracking_event_1280x720_30fps_h264.mp4" ]]; then
  FILE_TOKEN="imports/va_tracking_event_slow_long_1280x720_30fps_h264.mp4"
  DURATION_S="${DURATION_S:-120}"
fi
if [[ -n "${MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S:-}" ]]; then
  DURATION_S="${MEDIA_SERVER_VERIFY_VA_EVENTS_DURATION_S}"
fi
if [[ -n "${DURATION_S:-}" ]]; then
  POLL_COUNT="$(python3 - "${DURATION_S}" "${POLL_INTERVAL_S}" <<'PY'
import math
import sys

duration = float(sys.argv[1])
interval = float(sys.argv[2])
print(max(1, int(math.ceil(duration / interval))))
PY
)"
fi
LOCAL_FILE="${FILE_ROOT}/${FILE_TOKEN}"

log_info "http_base=${HTTP_BASE}"
log_info "file=${FILE_TOKEN}"
log_info "local_file=${LOCAL_FILE}"
log_info "poll=${POLL_COUNT} interval=${POLL_INTERVAL_S}s"

if [[ ! -f "${LOCAL_FILE}" ]]; then
  log_fail "이동 이벤트 테스트 영상이 없습니다: ${LOCAL_FILE}"
  echo "  영상 생성 후 ${FILE_TOKEN} 경로에 두거나 MEDIA_SERVER_VERIFY_VA_EVENTS_FILE로 파일명을 지정하세요."
  exit 1
fi

if ! curl -fsS --max-time 3 "${HTTP_BASE}/health" >/dev/null; then
  log_fail "HTTP health check 실패: ${HTTP_BASE}/health"
  exit 1
fi
log_pass "HTTP health ok"

next_rule_id() {
  RULE_ID_COUNTER=$((RULE_ID_COUNTER + 1))
  NEXT_RULE_ID="$((RULE_ID_BASE + RULE_ID_COUNTER))"
}

create_rule() {
  local rule_id="$1"
  local body="$2"
  local alias="${3:-${rule_id}}"
  RULE_IDS+=("${rule_id}")
  printf '%s\t%s\n' "${alias}" "${rule_id}" >> "${RULE_MAP_FILE}"
  printf '%s' "${body}" > "/tmp/media_server_${RUN_ID}_${rule_id}.json"
  curl -fsS -X PUT "${HTTP_BASE}/lab/analysis/rules/${rule_id}" \
    -H 'Content-Type: application/json' \
    --data-binary "@/tmp/media_server_${RUN_ID}_${rule_id}.json" >/dev/null
  log_pass "rule 저장: ${rule_id}"
}

create_line_rule() {
  # line-crossing direction별 판정이 같은 선분에서 any 결과를 forward/reverse로 나누는지 확인한다.
  local suffix="$1"
  local direction="$2"
  local x="$3"
  local rule_id
  next_rule_id
  rule_id="${NEXT_RULE_ID}"
  create_rule "${rule_id}" \
"{\"id\":\"${rule_id}\",\"priority\":100,\"enabled\":true,\"match\":{\"sourceKind\":\"file\",\"route\":\"http\"},\"analysis\":{\"classes\":[\"person\"]},\"event\":{\"type\":\"line-crossing\",\"minConfidence\":0.25,\"region\":{\"type\":\"line\",\"direction\":\"${direction}\",\"points\":[{\"x\":${x},\"y\":0.05},{\"x\":${x},\"y\":0.98}]}},\"eventActions\":{\"highlight\":{\"enabled\":true,\"mode\":\"blink\",\"target\":\"matched-object\",\"durationMs\":1500,\"color\":\"#ff0000\"},\"post\":{\"enabled\":false,\"method\":\"POST\",\"url\":\"\",\"payloadFormat\":\"media-server.va.event.v1\"}}}" \
    "${suffix}"
}

next_rule_id
presence_rule_id="${NEXT_RULE_ID}"
create_rule "${presence_rule_id}" \
"{\"id\":\"${presence_rule_id}\",\"priority\":100,\"enabled\":true,\"match\":{\"sourceKind\":\"file\",\"route\":\"http\"},\"analysis\":{\"classes\":[\"person\"]},\"event\":{\"type\":\"presence\",\"minConfidence\":0.25,\"region\":{\"type\":\"polygon\",\"points\":[{\"x\":0.0,\"y\":0.0},{\"x\":1.0,\"y\":0.0},{\"x\":1.0,\"y\":1.0},{\"x\":0.0,\"y\":1.0}]}},\"eventActions\":{\"highlight\":{\"enabled\":true,\"mode\":\"blink\",\"target\":\"matched-object\",\"durationMs\":1500,\"color\":\"#00ff00\"},\"post\":{\"enabled\":false,\"method\":\"POST\",\"url\":\"\",\"payloadFormat\":\"media-server.va.event.v1\"}}}" \
  "presence"

next_rule_id
presence_duration_rule_id="${NEXT_RULE_ID}"
create_rule "${presence_duration_rule_id}" \
"{\"id\":\"${presence_duration_rule_id}\",\"priority\":100,\"enabled\":true,\"match\":{\"sourceKind\":\"file\",\"route\":\"http\"},\"analysis\":{\"classes\":[\"person\"]},\"event\":{\"type\":\"presence\",\"minConfidence\":0.25,\"minDurationMs\":500,\"region\":{\"type\":\"polygon\",\"points\":[{\"x\":0.0,\"y\":0.0},{\"x\":1.0,\"y\":0.0},{\"x\":1.0,\"y\":1.0},{\"x\":0.0,\"y\":1.0}]}},\"eventActions\":{\"highlight\":{\"enabled\":true,\"mode\":\"blink\",\"target\":\"matched-object\",\"durationMs\":1500,\"color\":\"#ff0000\"},\"post\":{\"enabled\":false,\"method\":\"POST\",\"url\":\"\",\"payloadFormat\":\"media-server.va.event.v1\"}}}" \
  "presence-500ms"

next_rule_id
multi_category_rule_id="${NEXT_RULE_ID}"
create_rule "${multi_category_rule_id}" \
"{\"id\":\"${multi_category_rule_id}\",\"priority\":95,\"enabled\":true,\"match\":{\"sourceKind\":\"file\",\"route\":\"http\"},\"analysis\":{\"classes\":[\"person\",\"vehicle\",\"road\",\"animal\",\"sports\",\"tableware\",\"food\",\"furniture\",\"device\",\"object\"]},\"event\":{\"type\":\"presence\",\"minConfidence\":0.25,\"region\":{\"type\":\"polygon\",\"points\":[{\"x\":0.0,\"y\":0.0},{\"x\":1.0,\"y\":0.0},{\"x\":1.0,\"y\":1.0},{\"x\":0.0,\"y\":1.0}]}},\"eventActions\":{\"highlight\":{\"enabled\":true,\"mode\":\"blink\",\"target\":\"matched-object\",\"durationMs\":1500,\"color\":\"#ff0000\"},\"post\":{\"enabled\":false,\"method\":\"POST\",\"url\":\"\",\"payloadFormat\":\"media-server.va.event.v1\"}}}" \
  "multi-category-presence"

create_line_rule "line-left" "any" "0.25"
create_line_rule "line-left-forward" "forward" "0.25"
create_line_rule "line-left-reverse" "reverse" "0.25"
create_line_rule "line-right" "any" "0.75"
create_line_rule "line-right-forward" "forward" "0.75"
create_line_rule "line-right-reverse" "reverse" "0.75"

next_rule_id
enter_rule_id="${NEXT_RULE_ID}"
create_rule "${enter_rule_id}" \
"{\"id\":\"${enter_rule_id}\",\"priority\":100,\"enabled\":true,\"match\":{\"sourceKind\":\"file\",\"route\":\"http\"},\"analysis\":{\"classes\":[\"person\"]},\"event\":{\"type\":\"enter\",\"minConfidence\":0.25,\"region\":{\"type\":\"polygon\",\"points\":[{\"x\":0.35,\"y\":0.25},{\"x\":0.65,\"y\":0.25},{\"x\":0.65,\"y\":0.98},{\"x\":0.35,\"y\":0.98}]}},\"eventActions\":{\"highlight\":{\"enabled\":true,\"mode\":\"blink\",\"target\":\"matched-object\",\"durationMs\":1500,\"color\":\"#ff0000\"},\"post\":{\"enabled\":false,\"method\":\"POST\",\"url\":\"\",\"payloadFormat\":\"media-server.va.event.v1\"}}}" \
  "enter-center"

next_rule_id
exit_rule_id="${NEXT_RULE_ID}"
create_rule "${exit_rule_id}" \
"{\"id\":\"${exit_rule_id}\",\"priority\":100,\"enabled\":true,\"match\":{\"sourceKind\":\"file\",\"route\":\"http\"},\"analysis\":{\"classes\":[\"person\"]},\"event\":{\"type\":\"exit\",\"minConfidence\":0.25,\"region\":{\"type\":\"polygon\",\"points\":[{\"x\":0.35,\"y\":0.25},{\"x\":0.65,\"y\":0.25},{\"x\":0.65,\"y\":0.98},{\"x\":0.35,\"y\":0.98}]}},\"eventActions\":{\"highlight\":{\"enabled\":true,\"mode\":\"blink\",\"target\":\"matched-object\",\"durationMs\":1500,\"color\":\"#ff0000\"},\"post\":{\"enabled\":false,\"method\":\"POST\",\"url\":\"\",\"payloadFormat\":\"media-server.va.event.v1\"}}}" \
  "exit-center"

ENCODED_FILE="$(urlencode_file_token "${FILE_TOKEN}")"
TAP_RESPONSE="$(curl -fsS -X POST "${HTTP_BASE}/lab/analysis/taps?file=${ENCODED_FILE}&va=1&fps=8&maxQueue=1&trackIds=1&trackTrails=1")"
TAP_ID="$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("tapId",""))' <<<"${TAP_RESPONSE}")"
if [[ -z "${TAP_ID}" ]]; then
  log_fail "analysis tap 생성 실패"
  echo "${TAP_RESPONSE}" | sed 's/^/  /'
  exit 1
fi
log_pass "analysis tap 생성: ${TAP_ID}"

: > "${EVENTS_FILE}"
for _ in $(seq 1 "${POLL_COUNT}"); do
  sleep "${POLL_INTERVAL_S}"
  curl -fsS "${HTTP_BASE}/lab/analysis/taps/${TAP_ID}/events" >> "${EVENTS_FILE}"
  printf '\n' >> "${EVENTS_FILE}"
done
curl -fsS "${HTTP_BASE}/lab/analysis/taps/${TAP_ID}" > "${SNAPSHOT_FILE}"
curl -fsS "${HTTP_BASE}/lab/analysis/taps" > "${TAPS_FILE}"
curl -fsS "${HTTP_BASE}/lab/analysis/taps/${TAP_ID}/overlay.jpg?quality=88&thickness=4&drawLabels=1&labelLang=ko&trackIds=1&trackTrails=1" \
  -o "${OVERLAY_FILE}"

python3 - \
  "${EVENTS_FILE}" \
  "${SNAPSHOT_FILE}" \
  "${TAPS_FILE}" \
  "${TAP_ID}" \
  "${RUN_ID}" \
  "${RULE_MAP_FILE}" \
  "${MIN_PRESENCE}" \
  "${MIN_ENTER}" \
  "${MIN_EXIT}" \
  "${MIN_LINE}" \
  "${MIN_UNIQUE_TRACKS}" <<'PY'
import collections
import json
import pathlib
import sys

events_file = pathlib.Path(sys.argv[1])
snapshot_file = pathlib.Path(sys.argv[2])
taps_file = pathlib.Path(sys.argv[3])
tap_id = sys.argv[4]
run_id = sys.argv[5]
rule_map_file = pathlib.Path(sys.argv[6])
min_presence = int(sys.argv[7])
min_enter = int(sys.argv[8])
min_exit = int(sys.argv[9])
min_line = int(sys.argv[10])
min_tracks = int(sys.argv[11])

rule_id_by_alias = {}
rule_alias_by_id = {}
for line in rule_map_file.read_text().splitlines():
    if not line.strip():
        continue
    alias, rule_id = line.split("\t", 1)
    rule_id_by_alias[alias] = rule_id
    rule_alias_by_id[rule_id] = alias

def rule_count(alias):
    return counts.get(rule_id_by_alias.get(alias, ""), 0)

def rule_colors(alias):
    return highlight_colors_by_rule.get(rule_id_by_alias.get(alias, ""), set())

def rule_durations(alias):
    return highlight_durations_by_rule.get(rule_id_by_alias.get(alias, ""), set())

counts = collections.Counter()
tracks_by_type = collections.defaultdict(set)
tracks_by_rule = collections.defaultdict(set)
highlight_colors_by_rule = collections.defaultdict(set)
highlight_durations_by_rule = collections.defaultdict(set)
samples = []
for line in events_file.read_text().splitlines():
    if not line.strip():
        continue
    payload = json.loads(line)
    for event in payload.get("events", []):
        rule_id = event.get("ruleId", "")
        if rule_id not in rule_alias_by_id:
            continue
        event_type = event.get("type", "")
        obj = event.get("object") or {}
        action = event.get("action") or {}
        highlight = action.get("highlight") or {}
        track_id = obj.get("trackId", 0)
        color = str(highlight.get("color") or "").lower()
        duration_ms = highlight.get("durationMs")
        counts[event_type] += 1
        counts[rule_id] += 1
        tracks_by_type[event_type].add(track_id)
        tracks_by_rule[rule_id].add(track_id)
        if color:
            highlight_colors_by_rule[rule_id].add(color)
        if isinstance(duration_ms, int):
            highlight_durations_by_rule[rule_id].add(duration_ms)
        if len(samples) < 12:
            samples.append({
                "rule": rule_alias_by_id.get(rule_id, rule_id),
                "ruleId": rule_id,
                "type": event_type,
                "track": track_id,
                "score": round(float(obj.get("score", 0.0)), 3),
                "highlight": color,
                "durationMs": duration_ms,
            })

snapshot = json.loads(snapshot_file.read_text()).get("tap") or {}
latest = snapshot.get("latestResult") or {}
tap_list = json.loads(taps_file.read_text())
listed = any(item.get("tapId") == tap_id for item in tap_list.get("taps", []))
unique_tracks = {
    track
    for values in tracks_by_type.values()
    for track in values
    if isinstance(track, int) and track > 0
}

print("event_counts=", dict(counts))
print("event_tracks=", {k: sorted(v) for k, v in tracks_by_type.items()})
print("rule_tracks=", {k: sorted(v) for k, v in tracks_by_rule.items()})
print("highlight_colors=", {k: sorted(v) for k, v in highlight_colors_by_rule.items()})
print("highlight_durations=", {k: sorted(v) for k, v in highlight_durations_by_rule.items()})
print("samples=", samples)
print("snapshot_track_count=", latest.get("trackCount", 0), "listed=", listed)
print("analyzed=", snapshot.get("analyzedPackets", 0), "avgMs=", snapshot.get("averageAnalysisMs", 0))

errors = []
if counts.get("presence", 0) < min_presence:
    errors.append(f"presence 이벤트 부족: {counts.get('presence', 0)} < {min_presence}")
if rule_count("presence-500ms") < min_presence:
    errors.append(f"minDuration presence 이벤트 부족: {rule_count('presence-500ms')} < {min_presence}")
if rule_count("multi-category-presence") < min_presence:
    errors.append(f"다중 카테고리 presence 이벤트 부족: {rule_count('multi-category-presence')} < {min_presence}")
if counts.get("enter", 0) < min_enter:
    errors.append(f"enter 이벤트 부족: {counts.get('enter', 0)} < {min_enter}")
if counts.get("exit", 0) < min_exit:
    errors.append(f"exit 이벤트 부족: {counts.get('exit', 0)} < {min_exit}")
if counts.get("line-crossing", 0) < min_line:
    errors.append(f"line-crossing 이벤트 부족: {counts.get('line-crossing', 0)} < {min_line}")
for rule_suffix in ("enter-center", "exit-center", "line-left", "line-right"):
    if rule_count(rule_suffix) <= 0:
        errors.append(f"{rule_suffix} rule 이벤트가 없습니다")
directed_line_total = 0
for side in ("left", "right"):
    any_count = rule_count(f"line-{side}")
    forward_count = rule_count(f"line-{side}-forward")
    reverse_count = rule_count(f"line-{side}-reverse")
    directed_line_total += forward_count + reverse_count
    if any_count > 0 and forward_count + reverse_count != any_count:
        errors.append(
            f"line-{side} direction 분할 불일치: any={any_count}, "
            f"forward={forward_count}, reverse={reverse_count}"
        )
if directed_line_total <= 0:
    errors.append("forward/reverse line-crossing 이벤트가 없습니다")
for event_type in ("enter", "exit", "line-crossing"):
    bad_tracks = [track for track in tracks_by_type.get(event_type, set()) if not isinstance(track, int) or track <= 0]
    if bad_tracks:
        errors.append(f"{event_type} 이벤트에 유효하지 않은 trackId가 있습니다: {bad_tracks}")
if len(unique_tracks) < min_tracks:
    errors.append(f"이벤트 trackId 종류 부족: {len(unique_tracks)} < {min_tracks}")
if not listed:
    errors.append("/lab/analysis/taps 목록에 생성한 tap이 없습니다")
if latest.get("trackCount", 0) < min_tracks:
    errors.append(f"snapshot trackCount 부족: {latest.get('trackCount', 0)} < {min_tracks}")
for rule_id, colors in highlight_colors_by_rule.items():
    unexpected = {color for color in colors if color != "#ff0000"}
    if unexpected:
        errors.append(f"{rule_id} highlight color가 빨간색 고정이 아님: {sorted(unexpected)}")
for rule_id, durations in highlight_durations_by_rule.items():
    unexpected = {duration for duration in durations if duration != 1500}
    if unexpected:
        errors.append(f"{rule_id} highlight durationMs가 1500으로 유지되지 않음: {sorted(unexpected)}")
if "#ff0000" not in rule_colors("presence"):
    errors.append("커스텀 highlight 입력을 빨간색으로 고정한 이벤트가 없습니다")
if 1500 not in rule_durations("presence"):
    errors.append("presence rule blink durationMs=1500 이벤트가 없습니다")

if errors:
    for error in errors:
        print("[fail]", error)
    raise SystemExit(1)
PY
log_pass "presence/enter/exit/line-crossing 이벤트 검증"
log_pass "trackId 기반 이벤트 및 active tap 목록 검증"
log_pass "다중 카테고리 presence 이벤트 검증"
log_pass "이벤트 blink highlight 색상/시간 검증"
log_info "overlay=${OVERLAY_FILE}"
log_info "events_log=${EVENTS_FILE}"

echo
echo "== VA tracking event 검증 요약 =="
echo "- 통과: ${PASS_COUNT}"
echo "- 실패: ${FAIL_COUNT}"
echo "- 건너뜀: ${SKIP_COUNT}"
if [[ ${FAIL_COUNT} -gt 0 ]]; then
  exit 1
fi
exit 0
