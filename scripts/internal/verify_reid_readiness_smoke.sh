#!/usr/bin/env bash
# 파일 용도: 공용 Re-ID readiness evaluator를 OpenSSL/ONNX capability 조합별로 컴파일·실행한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
CXX_BIN="${CXX:-c++}"
WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/media-server-reid-readiness-smoke.XXXXXX")"
trap 'rm -rf "${WORK_DIR}"' EXIT

COMMON=(
  -std=c++17
  -pthread
  -I"${ROOT_DIR}/include"
  "${ROOT_DIR}/src/analysis/appearance_extractor.cpp"
  "${ROOT_DIR}/src/ingress/appearance_readiness_application_service.cpp"
  "${SCRIPT_DIR}/reid_readiness_smoke.cpp"
)

"${CXX_BIN}" "${COMMON[@]}" \
  -DMEDIA_SERVER_USE_OPENSSL=0 \
  -DMEDIA_SERVER_USE_ONNXRUNTIME=0 \
  -o "${WORK_DIR}/no-crypto"
"${WORK_DIR}/no-crypto" "${WORK_DIR}/no-crypto-work" no-crypto

OPENSSL_CFLAGS=()
OPENSSL_LIBS=(-lcrypto)
if command -v pkg-config >/dev/null 2>&1 && pkg-config --exists openssl; then
  # shellcheck disable=SC2207
  OPENSSL_CFLAGS=($(pkg-config --cflags openssl))
  # shellcheck disable=SC2207
  OPENSSL_LIBS=($(pkg-config --libs openssl))
fi
"${CXX_BIN}" "${COMMON[@]}" \
  "${OPENSSL_CFLAGS[@]}" \
  -DMEDIA_SERVER_USE_OPENSSL=1 \
  -DMEDIA_SERVER_USE_ONNXRUNTIME=0 \
  "${OPENSSL_LIBS[@]}" \
  -o "${WORK_DIR}/crypto-no-onnx"
"${WORK_DIR}/crypto-no-onnx" "${WORK_DIR}/crypto-no-onnx-work" crypto-no-onnx

echo "[pass] Re-ID readiness compile capability matrix"
