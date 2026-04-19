#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
echo "project: ${ROOT_DIR}"

need_cmd() {
  command -v "$1" >/dev/null 2>&1
}

install_macos() {
  if ! need_cmd brew; then
    echo "Homebrew is required on macOS. Install from https://brew.sh"
    exit 1
  fi
  brew update
  brew install pkg-config gstreamer gst-plugins-base gst-plugins-good gst-plugins-bad gst-rtsp-server libnice libnice-gstreamer
}

install_debian_like() {
  if ! need_cmd apt; then
    echo "apt not found"
    exit 1
  fi
  sudo apt update
  sudo apt install -y \
    build-essential cmake pkg-config \
    libgstreamer1.0-dev libgstrtspserver-1.0-dev \
    libnice-dev \
    gstreamer1.0-tools gstreamer1.0-plugins-base gstreamer1.0-plugins-good gstreamer1.0-plugins-bad
}

install_fedora_like() {
  if ! need_cmd dnf; then
    echo "dnf not found"
    exit 1
  fi
  sudo dnf install -y \
    gcc-c++ cmake pkgconf-pkg-config \
    libnice libnice-devel \
    gstreamer1-devel gstreamer1-rtsp-server-devel \
    gstreamer1-plugins-base-tools gstreamer1-plugins-base gstreamer1-plugins-good gstreamer1-plugins-bad-free
}

install_arch_like() {
  if ! need_cmd pacman; then
    echo "pacman not found"
    exit 1
  fi
  sudo pacman -S --needed \
    base-devel cmake pkgconf \
    gstreamer gst-plugins-base gst-plugins-good gst-plugins-bad gst-rtsp-server libnice
}

if [[ "${OSTYPE:-}" == "darwin"* ]]; then
  echo "[deps] detected macOS"
  install_macos
elif [[ -f /etc/os-release ]]; then
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
          echo "Install manually: cmake, pkg-config, gstreamer-1.0 dev, gst-rtsp-server dev"
          exit 1
          ;;
      esac
      ;;
  esac
else
  echo "Unsupported OS: ${OSTYPE:-unknown}"
  exit 1
fi

echo "[deps] done"
echo "verify:"
echo "  pkg-config --modversion gstreamer-1.0"
echo "  pkg-config --modversion gstreamer-rtsp-server-1.0"
echo "  gst-inspect-1.0 webrtcbin nicesrc nicesink"
