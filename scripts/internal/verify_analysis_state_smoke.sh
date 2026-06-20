#!/usr/bin/env bash
# 파일 용도: TrackState/SceneContext/EventManager/Scenario/Appearance hook 단위 smoke를 빌드하고 실행한다.
# 동작 요약: mock detection/tracking metadata만 사용해 media pipeline 없이 VA state 계층을 검증한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BUILD_DIR="${MEDIA_SERVER_VERIFY_ANALYSIS_STATE_BUILD_DIR:-/tmp/media_server_analysis_state_smoke-$$}"
CXX_BIN="${CXX:-c++}"

mkdir -p "${BUILD_DIR}"

echo "[verify] build analysis state smoke: ${BUILD_DIR}"
"${CXX_BIN}" -std=c++17 -I"${ROOT_DIR}/include" \
  "${SCRIPT_DIR}/analysis_state_smoke.cpp" \
  "${ROOT_DIR}/src/analysis/appearance_extractor.cpp" \
  "${ROOT_DIR}/src/analysis/category_tokens.cpp" \
  "${ROOT_DIR}/src/analysis/event_manager.cpp" \
  "${ROOT_DIR}/src/analysis/event_feature_search_index.cpp" \
  "${ROOT_DIR}/src/analysis/event_storage.cpp" \
  "${ROOT_DIR}/src/analysis/event_search_query.cpp" \
  "${ROOT_DIR}/src/analysis/intrusion_after_line_crossing_scenario.cpp" \
  "${ROOT_DIR}/src/analysis/intrusion_dwell_scenario.cpp" \
  "${ROOT_DIR}/src/analysis/loitering_scenario.cpp" \
  "${ROOT_DIR}/src/analysis/metadata_subscription_filter.cpp" \
  "${ROOT_DIR}/src/analysis/object_tracker.cpp" \
  "${ROOT_DIR}/src/analysis/re_entry_scenario.cpp" \
  "${ROOT_DIR}/src/analysis/scenario_engine.cpp" \
  "${ROOT_DIR}/src/analysis/scene_context_builder.cpp" \
  "${ROOT_DIR}/src/analysis/snapshot_encoder.cpp" \
  "${ROOT_DIR}/src/analysis/track_state_manager.cpp" \
  "${ROOT_DIR}/src/analysis/va_runtime_metadata.cpp" \
  "${ROOT_DIR}/src/analysis/vlm_feature_retention.cpp" \
  "${ROOT_DIR}/src/analysis/vlm_feature_queue.cpp" \
  "${ROOT_DIR}/src/analysis/vlm_observation_store.cpp" \
  "${ROOT_DIR}/src/analysis/wrong_direction_scenario.cpp" \
  "${ROOT_DIR}/src/analysis/zone_occupancy_scenario.cpp" \
  "${ROOT_DIR}/src/app_config.cpp" \
  -o "${BUILD_DIR}/analysis_state_smoke"

echo "[verify] check no TensorRT/OpenVINO dependency was added for appearance hooks"
if rg -n -i "tensorrt|openvino" "${ROOT_DIR}/CMakeLists.txt" "${ROOT_DIR}/include" "${ROOT_DIR}/src" >/tmp/media_server_analysis_state_dep_scan.txt; then
  cat /tmp/media_server_analysis_state_dep_scan.txt
  echo "[fail] unexpected TensorRT/OpenVINO dependency reference"
  exit 1
fi
echo "[pass] appearance hook dependency scan omits TensorRT references"
echo "[pass] appearance hook dependency scan omits OpenVINO references"

"${BUILD_DIR}/analysis_state_smoke"
