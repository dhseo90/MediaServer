#!/usr/bin/env bash
# 파일 용도: VA metadata replay baseline fixture들을 expected JSON과 비교 검증한다.
# 동작 요약: 실제 영상/RTSP/WebRTC 없이 Intrusion, LineCrossing, IntrusionDwell, ReEntry, WrongDirection, IntrusionAfterLineCrossing, Loitering, ZoneOccupancy, cleanup, 다채널 baseline을 replay한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
FIXTURE_DIR="${ROOT_DIR}/test/fixtures/va_replay"
OUT_DIR="${MEDIA_SERVER_VA_REPLAY_OUT_DIR:-/tmp/media_server_va_replay_baselines}"
TOLERANCE_MS="${MEDIA_SERVER_VA_REPLAY_TOLERANCE_MS:-250}"

mkdir -p "${OUT_DIR}"

assert_replay_event_output() {
  local output="$1"
  local expected="$2"
  local case_name="$3"
  python3 - "${output}" "${expected}" "${case_name}" <<'PY'
import json
import pathlib
import sys

actual = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
expected = json.loads(pathlib.Path(sys.argv[2]).read_text(encoding="utf-8"))
case_name = sys.argv[3]
actual_types = [str(item.get("type", "")) for item in actual.get("events", [])]
expected_types = [str(item.get("type", "")) for item in expected.get("events", [])]
missing = [event_type for event_type in expected_types if event_type not in actual_types]
if missing:
    raise SystemExit(f"re-read replay event type mismatch: missing={missing}, actual={actual_types}")
def assertReplayOccurrence(condition, message):
    if not condition:
        raise SystemExit(message)

if case_name == "intrusion-dwell":
    assertReplayOccurrence("intrusion-dwell" in actual_types, f"intrusion-dwell replay artifact occurrence missing: actual={actual_types}")
if case_name == "re-entry":
    assertReplayOccurrence("re-entry" in actual_types, f"re-entry replay artifact occurrence missing: actual={actual_types}")
if case_name == "wrong-direction":
    assertReplayOccurrence("wrong-direction" in actual_types, f"wrong-direction replay artifact occurrence missing: actual={actual_types}")
if case_name == "intrusion-after-line-crossing":
    assertReplayOccurrence("intrusion-after-line-crossing" in actual_types, f"intrusion-after-line-crossing replay artifact occurrence missing: actual={actual_types}")
if case_name == "loitering":
    assertReplayOccurrence("loitering" in actual_types, f"loitering replay artifact occurrence missing: actual={actual_types}")
if case_name == "zone-occupancy":
    assertReplayOccurrence("zone-occupancy" in actual_types, f"zone-occupancy replay artifact occurrence missing: actual={actual_types}")
print(f"[pass] replay event artifact readback types={actual_types}")
PY
}

cases=(
  "intrusion|intrusion_metadata.json|intrusion_expected.json||"
  "line-crossing|line_crossing_metadata.json|line_crossing_expected.json||"
  "intrusion-dwell|intrusion_dwell_metadata.json|intrusion_dwell_expected.json||"
  "intrusion-dwell-rule-override|intrusion_dwell_metadata.json|intrusion_dwell_rule_override_expected.json|intrusion_dwell_rule_override_rules.json|"
  "re-entry|re_entry_metadata.json|re_entry_expected.json|re_entry_rules.json|re-entry"
  "re-entry-cross-zone|re_entry_cross_zone_metadata.json|re_entry_cross_zone_expected.json|re_entry_cross_zone_rules.json|re-entry"
  "wrong-direction|wrong_direction_metadata.json|wrong_direction_expected.json|wrong_direction_rules.json|wrong-direction"
  "intrusion-after-line-crossing|intrusion_after_line_crossing_metadata.json|intrusion_after_line_crossing_expected.json|intrusion_after_line_crossing_rules.json|intrusion-after-line-crossing"
  "loitering|loitering_metadata.json|loitering_expected.json|loitering_rules.json|loitering"
  "loitering-under-threshold|loitering_under_threshold_metadata.json|loitering_under_threshold_expected.json|loitering_rules.json|loitering"
  "zone-occupancy|zone_occupancy_metadata.json|zone_occupancy_expected.json|zone_occupancy_rules.json|zone-occupancy"
  "zone-occupancy-delayed-trigger|zone_occupancy_delayed_trigger_metadata.json|zone_occupancy_delayed_trigger_expected.json|zone_occupancy_rules.json|zone-occupancy"
  "cleanup|cleanup_metadata.json|cleanup_expected.json||"
  "reacquire|reacquire_metadata.json|reacquire_expected.json||"
  "multichannel|multichannel_metadata.json|multichannel_expected.json||"
)

for case in "${cases[@]}"; do
  IFS="|" read -r name input expected rules mode <<<"${case}"
  output="${OUT_DIR}/${name}.json"
  echo "[verify][va-replay] ${name}"
  args=(
    --input "${FIXTURE_DIR}/${input}" \
    --expect "${FIXTURE_DIR}/${expected}" \
    --timestamp-tolerance-ms "${TOLERANCE_MS}" \
    --output "${output}"
  )
  if [[ -n "${rules}" ]]; then
    args+=(--rules "${FIXTURE_DIR}/${rules}")
  fi
  if [[ "${mode}" == "re-entry" ]]; then
    MEDIA_SERVER_ANALYSIS_RE_ENTRY_ENABLED=1 \
    MEDIA_SERVER_ANALYSIS_RE_ENTRY_WINDOW_MS=3000 \
    MEDIA_SERVER_ANALYSIS_RE_ENTRY_COOLDOWN_MS=1000 \
    "${SCRIPT_DIR}/replay_va_metadata.sh" --no-intrusion-dwell --enable-re-entry "${args[@]}"
  elif [[ "${mode}" == "wrong-direction" ]]; then
    MEDIA_SERVER_ANALYSIS_WRONG_DIRECTION_ENABLED=1 \
    MEDIA_SERVER_ANALYSIS_WRONG_DIRECTION_COOLDOWN_MS=1000 \
    "${SCRIPT_DIR}/replay_va_metadata.sh" --no-intrusion-dwell --enable-wrong-direction "${args[@]}"
  elif [[ "${mode}" == "intrusion-after-line-crossing" ]]; then
    MEDIA_SERVER_ANALYSIS_INTRUSION_AFTER_LINE_CROSSING_ENABLED=1 \
    MEDIA_SERVER_ANALYSIS_INTRUSION_AFTER_LINE_CROSSING_MAX_DELAY_MS=5000 \
    MEDIA_SERVER_ANALYSIS_INTRUSION_AFTER_LINE_CROSSING_DWELL_MS=2000 \
    MEDIA_SERVER_ANALYSIS_INTRUSION_AFTER_LINE_CROSSING_COOLDOWN_MS=1000 \
    "${SCRIPT_DIR}/replay_va_metadata.sh" --no-intrusion-dwell --enable-intrusion-after-line-crossing "${args[@]}"
  elif [[ "${mode}" == "loitering" ]]; then
    MEDIA_SERVER_ANALYSIS_LOITERING_ENABLED=1 \
    MEDIA_SERVER_ANALYSIS_LOITERING_MIN_DWELL_TIME_MS=3000 \
    MEDIA_SERVER_ANALYSIS_LOITERING_MAX_MOVEMENT_RADIUS=0.05 \
    MEDIA_SERVER_ANALYSIS_LOITERING_MIN_TRAJECTORY_POINTS=3 \
    MEDIA_SERVER_ANALYSIS_LOITERING_COOLDOWN_MS=1000 \
    "${SCRIPT_DIR}/replay_va_metadata.sh" --no-intrusion-dwell --enable-loitering "${args[@]}"
  elif [[ "${mode}" == "zone-occupancy" ]]; then
    MEDIA_SERVER_ANALYSIS_ZONE_OCCUPANCY_ENABLED=1 \
    MEDIA_SERVER_ANALYSIS_ZONE_OCCUPANCY_THRESHOLD=2 \
    MEDIA_SERVER_ANALYSIS_ZONE_OCCUPANCY_MIN_DWELL_TIME_MS=1000 \
    MEDIA_SERVER_ANALYSIS_ZONE_OCCUPANCY_COOLDOWN_MS=1000 \
    "${SCRIPT_DIR}/replay_va_metadata.sh" --no-intrusion-dwell --enable-zone-occupancy "${args[@]}"
  else
    "${SCRIPT_DIR}/replay_va_metadata.sh" "${args[@]}"
  fi
  assert_replay_event_output "${output}" "${FIXTURE_DIR}/${expected}" "${name}"
  echo "[pass] VA metadata replay baseline: ${name}"
done

echo "[summary] VA metadata replay baselines cases=${#cases[@]}"
echo "[info] outputs: ${OUT_DIR}"
