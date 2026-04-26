#!/usr/bin/env bash
# 파일 용도: 이동 테스트 영상에서 tracker ID 유지/분절 정도를 반복/장시간 통계로 측정한다.
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
CURRENT_TAP_ID=""
TAP_IDS=()
RUN_ID="tracker-stability-$(date +%s)-$$"
SUMMARY_FILE="/tmp/media_server_${RUN_ID}_summary.ndjson"

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

usage() {
  cat <<'EOF_USAGE'
Tracker stability 검증

Usage:
  ./server.sh verify-tracker-stability [options]

Options:
  --long                  장시간 기본값 적용: duration=120s, repeat=3
  --duration <seconds>    iteration당 polling 시간. poll-count보다 우선
  --repeat <count>        반복 횟수
  --interval <seconds>    polling 간격. 기본 0.2
  --poll-count <count>    duration 미지정 시 polling 횟수
  --max-fragmentation <v> fragmentation ratio 허용 상한
  --file <token>          video root 기준 테스트 파일 token
  -h, --help              도움말 출력

환경 변수:
  MEDIA_SERVER_VERIFY_TRACKER_DURATION_S
  MEDIA_SERVER_VERIFY_TRACKER_REPEAT_COUNT
  MEDIA_SERVER_VERIFY_TRACKER_POLL_COUNT
  MEDIA_SERVER_VERIFY_TRACKER_POLL_INTERVAL_S
EOF_USAGE
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    log_fail "필수 도구가 없습니다: $1"
    exit 1
  fi
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
  if ((${#TAP_IDS[@]} > 0)); then
    for tap_id in "${TAP_IDS[@]}"; do
      curl -fsS -X DELETE "${HTTP_BASE}/lab/analysis/taps/${tap_id}" >/dev/null 2>&1 || true
    done
  fi
}
trap cleanup_runtime_documents EXIT

FILE_TOKEN="${MEDIA_SERVER_VERIFY_TRACKER_FILE:-imports/va_tracking_event_1280x720_30fps_h264.mp4}"
POLL_COUNT="${MEDIA_SERVER_VERIFY_TRACKER_POLL_COUNT:-150}"
POLL_INTERVAL_S="${MEDIA_SERVER_VERIFY_TRACKER_POLL_INTERVAL_S:-0.2}"
DURATION_S="${MEDIA_SERVER_VERIFY_TRACKER_DURATION_S:-}"
REPEAT_COUNT="${MEDIA_SERVER_VERIFY_TRACKER_REPEAT_COUNT:-1}"
MIN_SAMPLES="${MEDIA_SERVER_VERIFY_TRACKER_MIN_SAMPLES:-20}"
MIN_MAX_SIMULTANEOUS="${MEDIA_SERVER_VERIFY_TRACKER_MIN_MAX_SIMULTANEOUS:-3}"
MAX_FRAGMENTATION_RATIO="${MEDIA_SERVER_VERIFY_TRACKER_MAX_FRAGMENTATION_RATIO:-3.0}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --long)
      DURATION_S="${DURATION_S:-120}"
      REPEAT_COUNT="${REPEAT_COUNT:-3}"
      if [[ "${REPEAT_COUNT}" == "1" ]]; then
        REPEAT_COUNT=3
      fi
      ;;
    --duration)
      DURATION_S="$2"
      shift
      ;;
    --repeat)
      REPEAT_COUNT="$2"
      shift
      ;;
    --interval)
      POLL_INTERVAL_S="$2"
      shift
      ;;
    --poll-count)
      POLL_COUNT="$2"
      shift
      ;;
    --max-fragmentation)
      MAX_FRAGMENTATION_RATIO="$2"
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
      echo "알 수 없는 옵션입니다: $1"
      echo
      usage
      exit 1
      ;;
  esac
  shift
done

require_cmd curl
require_cmd python3

HTTP_PORT="$(resolve_port "${MEDIA_SERVER_HTTP_LISTEN_PORT:-}" "kHttpListenPort" "8080")"
HTTP_ADDRESS="${MEDIA_SERVER_HTTP_LISTEN_ADDRESS:-$(media_server_read_const_charp "${STD_AFX}" "kHttpListenAddress" || true)}"
HTTP_HOST="$(client_host "${MEDIA_SERVER_VERIFY_TRACKER_HTTP_HOST:-${MEDIA_SERVER_VERIFY_HOST:-${HTTP_ADDRESS}}}")"
HTTP_BASE="${MEDIA_SERVER_VERIFY_TRACKER_HTTP_BASE:-http://${HTTP_HOST}:${HTTP_PORT}}"
ENCODED_FILE="$(urlencode_file_token "${FILE_TOKEN}")"

if [[ -n "${DURATION_S}" ]]; then
  POLL_COUNT="$(python3 - "${DURATION_S}" "${POLL_INTERVAL_S}" <<'PY'
import math
import sys

duration = float(sys.argv[1])
interval = max(0.01, float(sys.argv[2]))
print(max(1, int(math.ceil(duration / interval))))
PY
)"
fi

log_info "http_base=${HTTP_BASE}"
log_info "file=${FILE_TOKEN}"
log_info "repeat=${REPEAT_COUNT} poll=${POLL_COUNT} interval=${POLL_INTERVAL_S}s duration=${DURATION_S:-auto}"
log_info "summary=${SUMMARY_FILE}"

if ! curl -fsS --max-time 3 "${HTTP_BASE}/health" >/dev/null; then
  log_fail "HTTP health check 실패: ${HTTP_BASE}/health"
  exit 1
fi
log_pass "HTTP health ok"

: > "${SUMMARY_FILE}"

for iteration in $(seq 1 "${REPEAT_COUNT}"); do
  CURRENT_TAP_ID=""
  SNAPSHOTS_FILE="/tmp/media_server_${RUN_ID}_iteration_${iteration}.ndjson"
  log_info "iteration ${iteration}/${REPEAT_COUNT} 시작"

  TAP_RESPONSE="$(curl -fsS -X POST "${HTTP_BASE}/lab/analysis/taps?file=${ENCODED_FILE}&va=1&fps=8&maxQueue=1&trackIds=1&trackTrails=1")"
  CURRENT_TAP_ID="$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("tapId",""))' <<<"${TAP_RESPONSE}")"
  if [[ -z "${CURRENT_TAP_ID}" ]]; then
    log_fail "analysis tap 생성 실패"
    echo "${TAP_RESPONSE}" | sed 's/^/  /'
    exit 1
  fi
  TAP_IDS+=("${CURRENT_TAP_ID}")
  log_pass "analysis tap 생성: ${CURRENT_TAP_ID}"

  : > "${SNAPSHOTS_FILE}"
  for _ in $(seq 1 "${POLL_COUNT}"); do
    sleep "${POLL_INTERVAL_S}"
    curl -fsS "${HTTP_BASE}/lab/analysis/taps/${CURRENT_TAP_ID}" >> "${SNAPSHOTS_FILE}"
    printf '\n' >> "${SNAPSHOTS_FILE}"
  done

  if python3 - \
    "${SNAPSHOTS_FILE}" \
    "${MIN_SAMPLES}" \
    "${MIN_MAX_SIMULTANEOUS}" \
    "${MAX_FRAGMENTATION_RATIO}" \
    "${iteration}" \
    "${SUMMARY_FILE}" <<'PY'
import collections
import json
import pathlib
import statistics
import sys

snapshots_file = pathlib.Path(sys.argv[1])
min_samples = int(sys.argv[2])
min_max_simultaneous = int(sys.argv[3])
max_fragmentation_ratio = float(sys.argv[4])
iteration = int(sys.argv[5])
summary_file = pathlib.Path(sys.argv[6])

samples = []
track_samples = collections.Counter()
track_labels = {}
track_first_pts = {}
track_last_pts = {}
max_simultaneous = 0
empty_detection_samples = 0
analyzed_values = []
avg_ms_values = []

for line in snapshots_file.read_text().splitlines():
    if not line.strip():
        continue
    payload = json.loads(line)
    tap = payload.get("tap") or {}
    latest = tap.get("latestResult") or {}
    tracks = latest.get("tracks") or []
    detections = latest.get("detections") or []
    analyzed_values.append(int(tap.get("analyzedPackets") or 0))
    avg_ms_values.append(float(tap.get("averageAnalysisMs") or 0.0))
    if not detections:
        empty_detection_samples += 1
    max_simultaneous = max(max_simultaneous, len(tracks))
    for track in tracks:
        track_id = int(track.get("trackId") or 0)
        if track_id <= 0:
            continue
        track_samples[track_id] += 1
        track_labels.setdefault(track_id, track.get("label") or "")
        pts = int(track.get("lastSeenPts") or latest.get("pts") or 0)
        track_first_pts.setdefault(track_id, pts)
        track_last_pts[track_id] = pts
    samples.append(tap)

unique_tracks = len(track_samples)
fragmentation_ratio = unique_tracks / max(1, max_simultaneous)
lifetimes = list(track_samples.values())
median_lifetime = statistics.median(lifetimes) if lifetimes else 0
short_tracks = sum(1 for value in lifetimes if value <= 2)
final_analyzed = max(analyzed_values) if analyzed_values else 0
avg_ms = avg_ms_values[-1] if avg_ms_values else 0.0
summary = {
    "iteration": iteration,
    "samples": len(samples),
    "uniqueTracks": unique_tracks,
    "maxSimultaneousTracks": max_simultaneous,
    "fragmentationRatio": round(fragmentation_ratio, 3),
    "shortTracksLe2Samples": short_tracks,
    "medianTrackLifetimeSamples": median_lifetime,
    "emptyDetectionSamples": empty_detection_samples,
    "finalAnalyzedPackets": final_analyzed,
    "averageAnalysisMs": round(avg_ms, 3),
    "trackSummary": [
        {
            "id": track_id,
            "label": track_labels.get(track_id, ""),
            "samples": count,
            "firstPts": track_first_pts.get(track_id, 0),
            "lastPts": track_last_pts.get(track_id, 0),
        }
        for track_id, count in sorted(track_samples.items())
    ],
}
print("tracker_iteration_summary=", summary)
with summary_file.open("a") as handle:
    handle.write(json.dumps(summary, ensure_ascii=False) + "\n")

errors = []
if len(samples) < min_samples:
    errors.append(f"snapshot sample 부족: {len(samples)} < {min_samples}")
if max_simultaneous < min_max_simultaneous:
    errors.append(f"동시 track 수 부족: {max_simultaneous} < {min_max_simultaneous}")
if fragmentation_ratio > max_fragmentation_ratio:
    errors.append(
        f"track fragmentation ratio 초과: {fragmentation_ratio:.3f} > {max_fragmentation_ratio:.3f}"
    )
if final_analyzed <= 0:
    errors.append("분석 packet이 증가하지 않음")

if errors:
    for error in errors:
        print("ERROR:", error)
    raise SystemExit(1)
PY
  then
    log_pass "tracker stability iteration ${iteration} 통계 기준 통과"
  else
    log_fail "tracker stability iteration ${iteration} 통계 기준 실패"
  fi

  curl -fsS -X DELETE "${HTTP_BASE}/lab/analysis/taps/${CURRENT_TAP_ID}" >/dev/null 2>&1 || true
  CURRENT_TAP_ID=""
done

python3 - "${SUMMARY_FILE}" <<'PY'
import json
import pathlib
import statistics
import sys

items = [json.loads(line) for line in pathlib.Path(sys.argv[1]).read_text().splitlines() if line.strip()]
if not items:
    raise SystemExit(0)
ratios = [float(item["fragmentationRatio"]) for item in items]
print("tracker_repeat_count=", len(items))
print("fragmentation_ratio_min=", min(ratios))
print("fragmentation_ratio_max=", max(ratios))
print("fragmentation_ratio_avg=", round(statistics.mean(ratios), 3))
PY
log_pass "tracker stability 반복 요약 생성"

echo
echo "== tracker stability 검증 요약 =="
echo "- 통과: ${PASS_COUNT}"
echo "- 실패: ${FAIL_COUNT}"
echo "- 건너뜀: ${SKIP_COUNT}"
echo "- summary log: ${SUMMARY_FILE}"

if (( FAIL_COUNT > 0 )); then
  exit 1
fi
