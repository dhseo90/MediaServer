#!/usr/bin/env bash
# 파일 용도: 이동 테스트 영상에서 tracker ID 유지/분절 정도를 통계로 측정한다.
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
RUN_ID="tracker-stability-$(date +%s)-$$"
SNAPSHOTS_FILE="/tmp/media_server_${RUN_ID}_snapshots.ndjson"

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
  if [[ -n "${TAP_ID}" ]]; then
    curl -fsS -X DELETE "${HTTP_BASE}/lab/analysis/taps/${TAP_ID}" >/dev/null 2>&1 || true
  fi
}
trap cleanup_runtime_documents EXIT

require_cmd curl
require_cmd python3

HTTP_PORT="$(resolve_port "${MEDIA_SERVER_HTTP_LISTEN_PORT:-}" "kHttpListenPort" "8080")"
HTTP_ADDRESS="${MEDIA_SERVER_HTTP_LISTEN_ADDRESS:-$(media_server_read_const_charp "${STD_AFX}" "kHttpListenAddress" || true)}"
HTTP_HOST="$(client_host "${MEDIA_SERVER_VERIFY_TRACKER_HTTP_HOST:-${MEDIA_SERVER_VERIFY_HOST:-${HTTP_ADDRESS}}}")"
HTTP_BASE="${MEDIA_SERVER_VERIFY_TRACKER_HTTP_BASE:-http://${HTTP_HOST}:${HTTP_PORT}}"
FILE_TOKEN="${MEDIA_SERVER_VERIFY_TRACKER_FILE:-imports/va_tracking_event_1280x720_30fps_h264.mp4}"
POLL_COUNT="${MEDIA_SERVER_VERIFY_TRACKER_POLL_COUNT:-150}"
POLL_INTERVAL_S="${MEDIA_SERVER_VERIFY_TRACKER_POLL_INTERVAL_S:-0.2}"
MIN_SAMPLES="${MEDIA_SERVER_VERIFY_TRACKER_MIN_SAMPLES:-20}"
MIN_MAX_SIMULTANEOUS="${MEDIA_SERVER_VERIFY_TRACKER_MIN_MAX_SIMULTANEOUS:-3}"
MAX_FRAGMENTATION_RATIO="${MEDIA_SERVER_VERIFY_TRACKER_MAX_FRAGMENTATION_RATIO:-3.0}"
ENCODED_FILE="$(urlencode_file_token "${FILE_TOKEN}")"

log_info "http_base=${HTTP_BASE}"
log_info "file=${FILE_TOKEN}"
log_info "poll=${POLL_COUNT} interval=${POLL_INTERVAL_S}s"

if ! curl -fsS --max-time 3 "${HTTP_BASE}/health" >/dev/null; then
  log_fail "HTTP health check 실패: ${HTTP_BASE}/health"
  exit 1
fi
log_pass "HTTP health ok"

TAP_RESPONSE="$(curl -fsS -X POST "${HTTP_BASE}/lab/analysis/taps?file=${ENCODED_FILE}&va=1&fps=8&maxQueue=1&trackIds=1&trackTrails=1")"
TAP_ID="$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("tapId",""))' <<<"${TAP_RESPONSE}")"
if [[ -z "${TAP_ID}" ]]; then
  log_fail "analysis tap 생성 실패"
  echo "${TAP_RESPONSE}" | sed 's/^/  /'
  exit 1
fi
log_pass "analysis tap 생성: ${TAP_ID}"

: > "${SNAPSHOTS_FILE}"
for _ in $(seq 1 "${POLL_COUNT}"); do
  sleep "${POLL_INTERVAL_S}"
  curl -fsS "${HTTP_BASE}/lab/analysis/taps/${TAP_ID}" >> "${SNAPSHOTS_FILE}"
  printf '\n' >> "${SNAPSHOTS_FILE}"
done

python3 - \
  "${SNAPSHOTS_FILE}" \
  "${MIN_SAMPLES}" \
  "${MIN_MAX_SIMULTANEOUS}" \
  "${MAX_FRAGMENTATION_RATIO}" <<'PY'
import collections
import json
import math
import pathlib
import statistics
import sys

snapshots_file = pathlib.Path(sys.argv[1])
min_samples = int(sys.argv[2])
min_max_simultaneous = int(sys.argv[3])
max_fragmentation_ratio = float(sys.argv[4])

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

print("tracker_samples=", len(samples))
print("unique_tracks=", unique_tracks)
print("max_simultaneous_tracks=", max_simultaneous)
print("fragmentation_ratio=", round(fragmentation_ratio, 3))
print("short_tracks_<=2_samples=", short_tracks)
print("median_track_lifetime_samples=", median_lifetime)
print("empty_detection_samples=", empty_detection_samples)
print("final_analyzed_packets=", final_analyzed)
print("average_analysis_ms=", round(avg_ms, 3))
print("track_summary=", [
    {
        "id": track_id,
        "label": track_labels.get(track_id, ""),
        "samples": count,
        "firstPts": track_first_pts.get(track_id, 0),
        "lastPts": track_last_pts.get(track_id, 0),
    }
    for track_id, count in sorted(track_samples.items())
])

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
if [[ $? -eq 0 ]]; then
  log_pass "tracker stability 통계 기준 통과"
else
  log_fail "tracker stability 통계 기준 실패"
fi

echo
echo "== tracker stability 검증 요약 =="
echo "- 통과: ${PASS_COUNT}"
echo "- 실패: ${FAIL_COUNT}"
echo "- 건너뜀: ${SKIP_COUNT}"
echo "- snapshot log: ${SNAPSHOTS_FILE}"

if (( FAIL_COUNT > 0 )); then
  exit 1
fi
