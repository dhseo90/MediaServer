#!/usr/bin/env bash
# 파일 용도: 저장된 VA detection/tracking metadata를 media pipeline 없이 replay한다.
# 동작 요약: replay 전용 C++ 도구를 /tmp에 빌드한 뒤 JSON/CSV metadata를 VA rule/scenario 계층에 입력한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BUILD_DIR="${MEDIA_SERVER_VA_REPLAY_BUILD_DIR:-/tmp/media_server_va_metadata_replay-$$}"
CXX_BIN="${CXX:-c++}"

mkdir -p "${BUILD_DIR}"

echo "[replay] build VA metadata replay tool: ${BUILD_DIR}"
"${CXX_BIN}" -std=c++17 -I"${ROOT_DIR}/include" \
  "${SCRIPT_DIR}/va_metadata_replay.cpp" \
  "${ROOT_DIR}/src/app_config.cpp" \
  "${ROOT_DIR}/src/analysis/appearance_extractor.cpp" \
  "${ROOT_DIR}/src/analysis/category_tokens.cpp" \
  "${ROOT_DIR}/src/analysis/event_manager.cpp" \
  "${ROOT_DIR}/src/analysis/event_rule_engine.cpp" \
  "${ROOT_DIR}/src/analysis/event_storage.cpp" \
  "${ROOT_DIR}/src/analysis/intrusion_after_line_crossing_scenario.cpp" \
  "${ROOT_DIR}/src/analysis/intrusion_dwell_scenario.cpp" \
  "${ROOT_DIR}/src/analysis/loitering_scenario.cpp" \
  "${ROOT_DIR}/src/analysis/re_entry_scenario.cpp" \
  "${ROOT_DIR}/src/analysis/scenario_engine.cpp" \
  "${ROOT_DIR}/src/analysis/scene_context_builder.cpp" \
  "${ROOT_DIR}/src/analysis/track_state_manager.cpp" \
  "${ROOT_DIR}/src/analysis/tracked_object_metadata.cpp" \
  "${ROOT_DIR}/src/analysis/wrong_direction_scenario.cpp" \
  -o "${BUILD_DIR}/va_metadata_replay"

"${BUILD_DIR}/va_metadata_replay" "$@"
