#!/usr/bin/env bash
# 파일 용도: ONVIF HTTP SOAP transport 단위 smoke를 빌드하고 실행한다.
# 동작 요약: 로컬 loopback HTTP 서버와 실제 socket POST로 transport와 sanitize된 오류를 검증한다.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
BUILD_DIR="${MEDIA_SERVER_VERIFY_ONVIF_HTTP_TRANSPORT_BUILD_DIR:-/tmp/media_server_onvif_http_transport-$$}"
CXX_BIN="${CXX:-c++}"

mkdir -p "${BUILD_DIR}"

OPENSSL_CFLAGS=()
OPENSSL_LIBS=()
if pkg-config --exists openssl; then
  read -r -a OPENSSL_CFLAGS <<< "$(pkg-config --cflags openssl)"
  OPENSSL_CFLAGS+=(-DMEDIA_SERVER_USE_OPENSSL=1)
  read -r -a OPENSSL_LIBS <<< "$(pkg-config --libs openssl)"
else
  OPENSSL_CFLAGS=(-DMEDIA_SERVER_USE_OPENSSL=0)
fi

echo "[verify] build ONVIF HTTP transport smoke: ${BUILD_DIR}"
"${CXX_BIN}" -std=c++17 -I"${ROOT_DIR}/include" \
  "${OPENSSL_CFLAGS[@]}" \
  "${SCRIPT_DIR}/onvif_http_transport_smoke.cpp" \
  "${ROOT_DIR}/src/ingress/onvif_live_import.cpp" \
  "${ROOT_DIR}/src/ingress/onvif_credential_provider.cpp" \
  -o "${BUILD_DIR}/onvif_http_transport_smoke" \
  "${OPENSSL_LIBS[@]}"

if [[ "${#OPENSSL_LIBS[@]}" -gt 0 ]]; then
  CA_KEY="${BUILD_DIR}/ca.key"
  CA_CERT="${BUILD_DIR}/ca.crt"
  SERVER_KEY="${BUILD_DIR}/server.key"
  SERVER_CSR="${BUILD_DIR}/server.csr"
  SERVER_CERT="${BUILD_DIR}/server.crt"
  SERVER_EXT="${BUILD_DIR}/server.ext"
  UNTRUSTED_CA_KEY="${BUILD_DIR}/untrusted-ca.key"
  UNTRUSTED_CA_CERT="${BUILD_DIR}/untrusted-ca.crt"
  UNTRUSTED_SERVER_KEY="${BUILD_DIR}/untrusted-server.key"
  UNTRUSTED_SERVER_CSR="${BUILD_DIR}/untrusted-server.csr"
  UNTRUSTED_SERVER_CERT="${BUILD_DIR}/untrusted-server.crt"
  MISMATCH_SERVER_KEY="${BUILD_DIR}/mismatch-server.key"
  MISMATCH_SERVER_CSR="${BUILD_DIR}/mismatch-server.csr"
  MISMATCH_SERVER_CERT="${BUILD_DIR}/mismatch-server.crt"
  MISMATCH_SERVER_EXT="${BUILD_DIR}/mismatch-server.ext"
  printf "subjectAltName=DNS:localhost\nextendedKeyUsage=serverAuth\n" > "${SERVER_EXT}"
  printf "subjectAltName=DNS:not-localhost\nextendedKeyUsage=serverAuth\n" > "${MISMATCH_SERVER_EXT}"
  openssl req -x509 -newkey rsa:2048 -nodes -keyout "${CA_KEY}" -out "${CA_CERT}" -days 2 -subj "/CN=MediaServer ONVIF Transport Fixture CA" >/dev/null 2>&1
  openssl req -newkey rsa:2048 -nodes -keyout "${SERVER_KEY}" -out "${SERVER_CSR}" -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost" >/dev/null 2>&1
  openssl x509 -req -in "${SERVER_CSR}" -CA "${CA_CERT}" -CAkey "${CA_KEY}" -CAcreateserial -out "${SERVER_CERT}" -days 2 -sha256 -extfile "${SERVER_EXT}" >/dev/null 2>&1
  openssl req -x509 -newkey rsa:2048 -nodes -keyout "${UNTRUSTED_CA_KEY}" -out "${UNTRUSTED_CA_CERT}" -days 2 -subj "/CN=MediaServer ONVIF Untrusted Fixture CA" >/dev/null 2>&1
  openssl req -newkey rsa:2048 -nodes -keyout "${UNTRUSTED_SERVER_KEY}" -out "${UNTRUSTED_SERVER_CSR}" -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost" >/dev/null 2>&1
  openssl x509 -req -in "${UNTRUSTED_SERVER_CSR}" -CA "${UNTRUSTED_CA_CERT}" -CAkey "${UNTRUSTED_CA_KEY}" -CAcreateserial -out "${UNTRUSTED_SERVER_CERT}" -days 2 -sha256 -extfile "${SERVER_EXT}" >/dev/null 2>&1
  openssl req -newkey rsa:2048 -nodes -keyout "${MISMATCH_SERVER_KEY}" -out "${MISMATCH_SERVER_CSR}" -subj "/CN=not-localhost" -addext "subjectAltName=DNS:not-localhost" >/dev/null 2>&1
  openssl x509 -req -in "${MISMATCH_SERVER_CSR}" -CA "${CA_CERT}" -CAkey "${CA_KEY}" -CAcreateserial -out "${MISMATCH_SERVER_CERT}" -days 2 -sha256 -extfile "${MISMATCH_SERVER_EXT}" >/dev/null 2>&1
  MEDIA_SERVER_ONVIF_TLS_CA_FILE="${CA_CERT}" \
  MEDIA_SERVER_ONVIF_TLS_SERVER_CERT="${SERVER_CERT}" \
  MEDIA_SERVER_ONVIF_TLS_SERVER_KEY="${SERVER_KEY}" \
  MEDIA_SERVER_ONVIF_TLS_UNTRUSTED_SERVER_CERT="${UNTRUSTED_SERVER_CERT}" \
  MEDIA_SERVER_ONVIF_TLS_UNTRUSTED_SERVER_KEY="${UNTRUSTED_SERVER_KEY}" \
  MEDIA_SERVER_ONVIF_TLS_MISMATCH_SERVER_CERT="${MISMATCH_SERVER_CERT}" \
  MEDIA_SERVER_ONVIF_TLS_MISMATCH_SERVER_KEY="${MISMATCH_SERVER_KEY}" \
    "${BUILD_DIR}/onvif_http_transport_smoke"
  exit 0
fi

"${BUILD_DIR}/onvif_http_transport_smoke"
