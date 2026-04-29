#!/usr/bin/env bash
# 파일 용도: VA metadata replay baseline fixture들을 expected JSON과 비교 검증한다.
# 동작 요약: 실제 영상/RTSP/WebRTC 없이 Intrusion, LineCrossing, IntrusionDwell, ReEntry, WrongDirection, IntrusionAfterLineCrossing, Loitering, cleanup, 다채널 baseline을 replay한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
FIXTURE_DIR="${ROOT_DIR}/test/fixtures/va_replay"
OUT_DIR="${MEDIA_SERVER_VA_REPLAY_OUT_DIR:-/tmp/media_server_va_replay_baselines}"
TOLERANCE_MS="${MEDIA_SERVER_VA_REPLAY_TOLERANCE_MS:-250}"

mkdir -p "${OUT_DIR}"

cases=(
  "intrusion|intrusion_metadata.json|intrusion_expected.json||"
  "line-crossing|line_crossing_metadata.json|line_crossing_expected.json||"
  "intrusion-dwell|intrusion_dwell_metadata.json|intrusion_dwell_expected.json||"
  "re-entry|re_entry_metadata.json|re_entry_expected.json|re_entry_rules.json|re-entry"
  "wrong-direction|wrong_direction_metadata.json|wrong_direction_expected.json|wrong_direction_rules.json|wrong-direction"
  "intrusion-after-line-crossing|intrusion_after_line_crossing_metadata.json|intrusion_after_line_crossing_expected.json|intrusion_after_line_crossing_rules.json|intrusion-after-line-crossing"
  "loitering|loitering_metadata.json|loitering_expected.json|loitering_rules.json|loitering"
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
  else
    "${SCRIPT_DIR}/replay_va_metadata.sh" "${args[@]}"
  fi
done

echo "[pass] VA metadata replay baselines: ${#cases[@]} cases"
echo "[info] outputs: ${OUT_DIR}"
