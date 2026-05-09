#!/usr/bin/env bash
# 파일 용도: 새 환경에서 MediaServer 기본 실행에 필요한 패키지, AI 런타임, 샘플 설정을 준비한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCRIPTS_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENV_FILE="${SCRIPTS_DIR}/.media_server.env"

WITH_AI=1
WITH_YOUTUBE=1
ONNXRUNTIME_VERSION="${MEDIA_SERVER_ONNXRUNTIME_VERSION:-1.20.1}"
YOLO_MODEL_URL="${MEDIA_SERVER_YOLO_MODEL_URL:-https://github.com/ultralytics/assets/releases/download/v8.4.0/yolo11n.onnx}"

usage() {
  cat <<EOF
MediaServer 설치 명령 사용법

Usage:
  ./server.sh install [--basic] [--no-youtube]

기본 동작:
  - GStreamer, RTSP, WebRTC 실행/개발 의존성을 설치합니다.
  - YOLO/AI 빌드를 위해 ONNX Runtime을 설치하거나 준비합니다.
  - 기본 YOLO 모델과 COCO 라벨 파일을 준비합니다.
  - LAN 접근 가능한 AI 기본 실행 설정을 scripts/.media_server.env에 생성합니다.

옵션:
  --basic       미디어 스트리밍 의존성만 설치합니다. AI 빌드는 비활성화합니다.
  --no-youtube  yt-dlp/deno 같은 YouTube 실험실 보조 도구 설치를 건너뜁니다.

예시:
  ./server.sh install
  ./server.sh install --basic
  ./server.sh install --no-youtube
EOF
}

for arg in "$@"; do
  case "${arg}" in
    --basic)
      WITH_AI=0
      ;;
    --no-youtube)
      WITH_YOUTUBE=0
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "[deps] unknown option: ${arg}"
      usage
      exit 1
      ;;
  esac
done

echo "project: ${ROOT_DIR}"
echo "profile: $([[ "${WITH_AI}" == "1" ]] && echo "ai" || echo "basic")"

need_cmd() {
  command -v "$1" >/dev/null 2>&1
}

download_file() {
  local url="$1"
  local output="$2"
  mkdir -p "$(dirname "${output}")"
  if [[ -f "${output}" ]]; then
    echo "[deps] exists: ${output}"
    return 0
  fi
  echo "[deps] download: ${url}"
  curl -fL --retry 3 --connect-timeout 20 -o "${output}.tmp" "${url}"
  mv "${output}.tmp" "${output}"
}

install_macos() {
  if ! need_cmd brew; then
    echo "Homebrew is required on macOS. Install from https://brew.sh"
    exit 1
  fi

  local packages=(
    cmake
    pkg-config
    curl
    ffmpeg
    node
    python
    gstreamer
    gst-rtsp-server
    libnice
    libnice-gstreamer
    cairo
    pango
  )
  if [[ "${WITH_AI}" == "1" ]]; then
    packages+=(onnxruntime)
  fi
  if [[ "${WITH_YOUTUBE}" == "1" ]]; then
    packages+=(yt-dlp deno)
  fi

  brew update
  brew install "${packages[@]}"
}

install_debian_like() {
  if ! need_cmd apt; then
    echo "apt not found"
    exit 1
  fi

  local packages=(
    build-essential
    cmake
    pkg-config
    curl
    tar
    ffmpeg
    python3
    nodejs
    libcairo2-dev
    libpango1.0-dev
    libgstreamer1.0-dev
    libgstrtspserver-1.0-dev
    libnice-dev
    gstreamer1.0-tools
    gstreamer1.0-plugins-base
    gstreamer1.0-plugins-good
    gstreamer1.0-plugins-bad
  )
  if [[ "${WITH_YOUTUBE}" == "1" ]]; then
    packages+=(yt-dlp)
  fi

  sudo apt update
  sudo apt install -y "${packages[@]}"
}

install_fedora_like() {
  if ! need_cmd dnf; then
    echo "dnf not found"
    exit 1
  fi

  local packages=(
    gcc-c++
    cmake
    pkgconf-pkg-config
    curl
    tar
    ffmpeg
    python3
    nodejs
    cairo-devel
    pango-devel
    libnice
    libnice-devel
    gstreamer1-devel
    gstreamer1-rtsp-server-devel
    gstreamer1-plugins-base-tools
    gstreamer1-plugins-base
    gstreamer1-plugins-good
    gstreamer1-plugins-bad-free
  )
  if [[ "${WITH_YOUTUBE}" == "1" ]]; then
    packages+=(yt-dlp)
  fi

  sudo dnf install -y "${packages[@]}"
}

install_arch_like() {
  if ! need_cmd pacman; then
    echo "pacman not found"
    exit 1
  fi

  local packages=(
    base-devel
    cmake
    pkgconf
    curl
    tar
    ffmpeg
    python
    nodejs
    cairo
    pango
    gstreamer
    gst-plugins-base
    gst-plugins-good
    gst-plugins-bad
    gst-rtsp-server
    libnice
  )
  if [[ "${WITH_YOUTUBE}" == "1" ]]; then
    packages+=(yt-dlp)
  fi

  sudo pacman -S --needed "${packages[@]}"
}

onnx_archive_name() {
  case "$(uname -s):$(uname -m)" in
    Linux:x86_64)
      printf 'onnxruntime-linux-x64-%s.tgz' "${ONNXRUNTIME_VERSION}"
      ;;
    Linux:aarch64|Linux:arm64)
      printf 'onnxruntime-linux-aarch64-%s.tgz' "${ONNXRUNTIME_VERSION}"
      ;;
    *)
      return 1
      ;;
  esac
}

install_linux_onnxruntime() {
  if [[ "${WITH_AI}" != "1" || "${OSTYPE:-}" == "darwin"* ]]; then
    return 0
  fi

  local archive
  if ! archive="$(onnx_archive_name)"; then
    echo "[deps] unsupported ONNX Runtime archive platform: $(uname -s) $(uname -m)"
    exit 1
  fi

  local third_party="${ROOT_DIR}/third_party"
  local version_dir="${third_party}/onnxruntime-${ONNXRUNTIME_VERSION}"
  local target_dir="${third_party}/onnxruntime"
  local url="https://github.com/microsoft/onnxruntime/releases/download/v${ONNXRUNTIME_VERSION}/${archive}"

  if [[ -f "${target_dir}/include/onnxruntime_cxx_api.h" ||
        -f "${target_dir}/include/onnxruntime/core/session/onnxruntime_cxx_api.h" ]]; then
    echo "[deps] ONNX Runtime exists: ${target_dir}"
    return 0
  fi

  mkdir -p "${third_party}"
  download_file "${url}" "${third_party}/${archive}"
  rm -rf "${version_dir}" "${target_dir}"
  tar -xzf "${third_party}/${archive}" -C "${third_party}"
  mv "${third_party}/onnxruntime-linux-"*"-${ONNXRUNTIME_VERSION}" "${version_dir}"
  ln -s "$(basename "${version_dir}")" "${target_dir}"
}

detect_onnxruntime_root() {
  local candidates=(
    "${MEDIA_SERVER_ONNXRUNTIME_ROOT:-}"
    "${ROOT_DIR}/third_party/onnxruntime"
    "/opt/homebrew/opt/onnxruntime"
    "/usr/local/opt/onnxruntime"
  )
  local candidate
  for candidate in "${candidates[@]}"; do
    if [[ -z "${candidate}" ]]; then
      continue
    fi
    if [[ -f "${candidate}/include/onnxruntime_cxx_api.h" ||
          -f "${candidate}/include/onnxruntime/core/session/onnxruntime_cxx_api.h" ]]; then
      printf '%s' "${candidate}"
      return 0
    fi
  done
  return 1
}

write_coco_labels() {
  local labels="${ROOT_DIR}/models/coco.names"
  if [[ -f "${labels}" ]]; then
    echo "[deps] exists: ${labels}"
    return 0
  fi
  mkdir -p "$(dirname "${labels}")"
  cat > "${labels}" <<'EOF'
person
bicycle
car
motorcycle
airplane
bus
train
truck
boat
traffic light
fire hydrant
stop sign
parking meter
bench
bird
cat
dog
horse
sheep
cow
elephant
bear
zebra
giraffe
backpack
umbrella
handbag
tie
suitcase
frisbee
skis
snowboard
sports ball
kite
baseball bat
baseball glove
skateboard
surfboard
tennis racket
bottle
wine glass
cup
fork
knife
spoon
bowl
banana
apple
sandwich
orange
broccoli
carrot
hot dog
pizza
donut
cake
chair
couch
potted plant
bed
dining table
toilet
tv
laptop
mouse
remote
keyboard
cell phone
microwave
oven
toaster
sink
refrigerator
book
clock
vase
scissors
teddy bear
hair drier
toothbrush
EOF
  echo "[deps] wrote: ${labels}"
}

prepare_ai_assets() {
  if [[ "${WITH_AI}" != "1" ]]; then
    return 0
  fi
  download_file "${YOLO_MODEL_URL}" "${ROOT_DIR}/models/yolo11n.onnx"
  write_coco_labels
}

write_default_env() {
  if [[ -f "${ENV_FILE}" ]]; then
    echo "[deps] keep existing env: ${ENV_FILE}"
    return 0
  fi

  local ai_enabled="${WITH_AI}"
  local build_dir="${ROOT_DIR}/build-gst"
  local onnx_root=""
  if [[ "${WITH_AI}" == "1" ]]; then
    build_dir="${ROOT_DIR}/build-gst-onnx"
    onnx_root="$(detect_onnxruntime_root || true)"
    if [[ -z "${onnx_root}" ]]; then
      echo "[deps] ONNX Runtime root not found after install"
      exit 1
    fi
  fi

  cat > "${ENV_FILE}" <<EOF
# ./server.sh install이 생성한 로컬 실행 기본값입니다.
# 이 파일은 gitignore 대상입니다. 로컬 장비 값만 수정하세요.
MEDIA_SERVER_BUILD_DIR=${build_dir}
MEDIA_SERVER_ENABLE_AI=${ai_enabled}
MEDIA_SERVER_LISTEN_ADDRESS=0.0.0.0
MEDIA_SERVER_HTTP_LISTEN_ADDRESS=0.0.0.0
MEDIA_SERVER_PORT_CANDIDATES=8554,8555,8556
MEDIA_SERVER_FORCE_RTSP_TCP=1
MEDIA_SERVER_ANALYSIS_MODEL=models/yolo11n.onnx
MEDIA_SERVER_ANALYSIS_LABELS=models/coco.names
MEDIA_SERVER_ANALYSIS_EVENT_POST_ENABLED=0
EOF
  if [[ -n "${onnx_root}" ]]; then
    cat >> "${ENV_FILE}" <<EOF
MEDIA_SERVER_ONNXRUNTIME_ROOT=${onnx_root}
EOF
  fi
  echo "[deps] wrote env: ${ENV_FILE}"
}

case "${OSTYPE:-}" in
  darwin*)
    echo "[deps] detected macOS"
    install_macos
    ;;
  *)
    if [[ -f /etc/os-release ]]; then
      # shellcheck disable=SC1091
      source /etc/os-release
      case "${ID:-}" in
        ubuntu|debian)
          echo "[deps] detected Debian/Ubuntu (${ID})"
          install_debian_like
          ;;
        fedora)
          echo "[deps] detected Fedora"
          install_fedora_like
          ;;
        arch)
          echo "[deps] detected Arch"
          install_arch_like
          ;;
        *)
          case "${ID_LIKE:-}" in
            *debian*)
              echo "[deps] detected Debian-like (${ID:-unknown})"
              install_debian_like
              ;;
            *fedora*|*rhel*)
              echo "[deps] detected Fedora/RHEL-like (${ID:-unknown})"
              install_fedora_like
              ;;
            *arch*)
              echo "[deps] detected Arch-like (${ID:-unknown})"
              install_arch_like
              ;;
            *)
              echo "Unsupported Linux distro: ID=${ID:-unknown}, ID_LIKE=${ID_LIKE:-unknown}"
              echo "Install manually: cmake, pkg-config, curl, ffmpeg, GStreamer dev, gst-rtsp-server dev, libnice dev"
              exit 1
              ;;
          esac
          ;;
      esac
    else
      echo "Unsupported OS: ${OSTYPE:-unknown}"
      exit 1
    fi
    ;;
esac

install_linux_onnxruntime
prepare_ai_assets
write_default_env

echo "[deps] done"
echo "next:"
echo "  ./server.sh start"
echo "  ./server.sh stop"
echo
echo "verify tools:"
echo "  pkg-config --modversion gstreamer-1.0"
echo "  gst-inspect-1.0 webrtcbin"
if [[ "${WITH_AI}" == "1" ]]; then
  echo "  test -f models/yolo11n.onnx && test -f models/coco.names"
fi
