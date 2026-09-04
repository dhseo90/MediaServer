#!/usr/bin/env bash
# 파일 용도: 서버를 실행하지 않고 AI 기본 빌드 또는 basic 빌드만 구성/컴파일한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
source "${SCRIPT_DIR}/env_common.sh"

ENV_FILE="${SCRIPTS_DIR}/.media_server.env"
if [[ -f "${ENV_FILE}" && "${MEDIA_SERVER_SKIP_LOCAL_ENV:-0}" != "1" ]]; then
  # shellcheck disable=SC1090
  set -a
  source "${ENV_FILE}"
  set +a
  echo "[env] loaded override: ${ENV_FILE}"
elif [[ "${MEDIA_SERVER_SKIP_LOCAL_ENV:-0}" == "1" ]]; then
  echo "[env] local override skipped"
fi

media_server_apply_homebrew_gst_env

MEDIA_SERVER_ENABLE_AI="${MEDIA_SERVER_ENABLE_AI:-1}"
MEDIA_SERVER_ENABLE_YOUTUBE_SOURCE="${MEDIA_SERVER_ENABLE_YOUTUBE_SOURCE:-0}"

usage() {
  cat <<'EOF_USAGE'
MediaServer build

Usage:
  ./server.sh build [options]

Options:
  --ai       ONNX Runtime + YOLO 포함 빌드. 기본값
  --basic    ONNX Runtime 없이 GStreamer 스트리밍만 빌드
  YouTube source resolver는 기본 빌드에서 제외됩니다.
  lab-only 실험 빌드가 필요할 때만 MEDIA_SERVER_ENABLE_YOUTUBE_SOURCE=1을 설정하세요.
  -h, --help 도움말 출력
EOF_USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --ai)
      MEDIA_SERVER_ENABLE_AI=1
      ;;
    --basic)
      MEDIA_SERVER_ENABLE_AI=0
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "알 수 없는 build 옵션입니다: $1"
      echo
      usage
      exit 1
      ;;
  esac
  shift
done

detect_onnxruntime_root() {
  local candidates=(
    "${MEDIA_SERVER_ONNXRUNTIME_ROOT:-}"
    "${ROOT_DIR}/third_party/onnxruntime"
    "/opt/homebrew/opt/onnxruntime"
    "/usr/local/opt/onnxruntime"
    "/usr/local"
    "/usr"
  )
  local candidate=""
  for candidate in "${candidates[@]}"; do
    [[ -n "${candidate}" ]] || continue
    if [[ -d "${candidate}/include" ]] && { [[ -d "${candidate}/lib" ]] || [[ -d "${candidate}/lib64" ]]; }; then
      printf '%s' "${candidate}"
      return 0
    fi
  done
  return 1
}

media_server_check_gst_dev_tools

if [[ "${MEDIA_SERVER_ENABLE_AI}" == "1" ]]; then
  BUILD_DIR="${MEDIA_SERVER_BUILD_DIR:-${ROOT_DIR}/build-gst-onnx}"
  ONNXRUNTIME_ROOT="$(detect_onnxruntime_root || true)"
  if [[ -z "${ONNXRUNTIME_ROOT}" ]]; then
    echo "[build] ONNX Runtime root not found. Run: ./server.sh install"
    echo "[build] or set MEDIA_SERVER_ONNXRUNTIME_ROOT in scripts/.media_server.env"
    exit 1
  fi
  CMAKE_ARGS=(
    -DMEDIA_SERVER_USE_GSTREAMER=ON
    -DMEDIA_SERVER_USE_ONNXRUNTIME=ON
    -DMEDIA_SERVER_ENABLE_YOUTUBE_SOURCE="${MEDIA_SERVER_ENABLE_YOUTUBE_SOURCE}"
    -DMEDIA_SERVER_ONNXRUNTIME_ROOT="${ONNXRUNTIME_ROOT}"
  )
else
  BUILD_DIR="${MEDIA_SERVER_BUILD_DIR:-${ROOT_DIR}/build-gst}"
  CMAKE_ARGS=(
    -DMEDIA_SERVER_USE_GSTREAMER=ON
    -DMEDIA_SERVER_USE_ONNXRUNTIME=OFF
    -DMEDIA_SERVER_ENABLE_YOUTUBE_SOURCE="${MEDIA_SERVER_ENABLE_YOUTUBE_SOURCE}"
  )
fi

echo "[1/2] configure: ${BUILD_DIR} (ai=${MEDIA_SERVER_ENABLE_AI}, youtube=${MEDIA_SERVER_ENABLE_YOUTUBE_SOURCE})"
if ! cmake -S "${ROOT_DIR}" -B "${BUILD_DIR}" "${CMAKE_ARGS[@]}"; then
  if [[ -f "${BUILD_DIR}/CMakeCache.txt" ]]; then
    echo "[configure] stale CMake cache detected. resetting ${BUILD_DIR}"
    rm -f "${BUILD_DIR}/CMakeCache.txt"
    rm -rf "${BUILD_DIR}/CMakeFiles"
    cmake -S "${ROOT_DIR}" -B "${BUILD_DIR}" "${CMAKE_ARGS[@]}"
  else
    exit 1
  fi
fi

echo "[2/2] build"
cmake --build "${BUILD_DIR}"
echo "[done] build=${BUILD_DIR}/media_server"
